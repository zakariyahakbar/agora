/**
 * /api/chat — server-side proxy to ClawUp.
 * The API key never touches the browser.
 *
 * Security:
 *   - API key lives in CLAWUP_API_KEY env var, server-only
 *   - Burst, per-IP daily, and global daily caps to bound credit spend
 *   - Only forwards the last user message (per ClawUp spec — earlier turns
 *     load from the agent's stored transcript on their side)
 */

export const runtime = "edge"; // Vercel edge = fast + supports streaming natively

/* Spend protection.
 *
 * Every message costs ClawUp credits, so the ceiling that matters is the
 * DAILY one, not the per-minute one. A 10/min limit still allows ~14,000
 * messages a day from a single IP, which would drain a small balance.
 *
 * Three layers, cheapest check first:
 *   BURST  - stops someone holding down enter
 *   DAILY  - stops one person grinding all day
 *   GLOBAL - hard ceiling across everyone, so total spend is bounded
 *
 * All of it is in-memory, and edge functions run per-region instances, so the
 * real numbers are somewhat higher than these. It is a spend brake, not a
 * security boundary. The actual hard cap on losses is the ClawUp balance:
 * keep it small and leave the low-balance alert on.
 */
const BURST_LIMIT = 5;
const BURST_WINDOW_MS = 30_000;

const DAILY_LIMIT_PER_IP = 40;
const GLOBAL_DAILY_LIMIT = 500;

const DAY_MS = 86_400_000;

const burst = new Map();
const daily = new Map();
let globalDay = { day: -1, count: 0 };

function dayIndex(now) {
  return Math.floor(now / DAY_MS);
}

/* Drop stale entries so the maps can't grow without bound. */
function sweep(now) {
  if (burst.size > 5000) {
    for (const [k, v] of burst) if (now > v.resetAt) burst.delete(k);
  }
  if (daily.size > 5000) {
    const d = dayIndex(now);
    for (const [k, v] of daily) if (v.day !== d) daily.delete(k);
  }
}

function checkLimits(ip) {
  const now = Date.now();
  const d = dayIndex(now);
  sweep(now);

  // global ceiling
  if (globalDay.day !== d) globalDay = { day: d, count: 0 };
  if (globalDay.count >= GLOBAL_DAILY_LIMIT) {
    return { ok: false, reason: "global", message: "The agent has hit today's usage cap. Try again tomorrow." };
  }

  // per-IP burst
  const b = burst.get(ip);
  if (!b || now > b.resetAt) {
    burst.set(ip, { count: 1, resetAt: now + BURST_WINDOW_MS });
  } else if (b.count >= BURST_LIMIT) {
    return { ok: false, reason: "burst", message: "Slow down a moment, then try again.", resetAt: b.resetAt };
  } else {
    b.count += 1;
  }

  // per-IP daily
  const dl = daily.get(ip);
  if (!dl || dl.day !== d) {
    daily.set(ip, { day: d, count: 1 });
  } else if (dl.count >= DAILY_LIMIT_PER_IP) {
    return { ok: false, reason: "daily", message: "You've hit today's message limit. Try again tomorrow." };
  } else {
    dl.count += 1;
  }

  globalDay.count += 1;
  return { ok: true };
}

export async function POST(req) {
  // Env check
  const apiKey = process.env.CLAWUP_API_KEY;
  const agentId = process.env.CLAWUP_AGENT_ID;
  if (!apiKey || !agentId) {
    return new Response(
      JSON.stringify({ error: "server_misconfigured", message: "Chat is not configured yet." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  // Rate limit by IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
          || req.headers.get("x-real-ip")
          || "unknown";
  const rl = checkLimits(ip);
  if (!rl.ok) {
    return new Response(
      JSON.stringify({ error: "rate_limited", reason: rl.reason, message: rl.message, resetAt: rl.resetAt }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  // Parse and validate the body
  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "bad_request", message: "Invalid JSON." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const userMessage = typeof body?.message === "string" ? body.message.trim() : "";
  if (!userMessage) {
    return new Response(
      JSON.stringify({ error: "bad_request", message: "Message cannot be empty." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (userMessage.length > 1000) {
    return new Response(
      JSON.stringify({ error: "bad_request", message: "Message too long (max 1000 chars)." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Call ClawUp with streaming enabled
  const upstream = await fetch(`https://api.clawup.org/api/v1/agents/${agentId}/chat`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openclaw",
      messages: [{ role: "user", content: userMessage }],
      stream: true,
    }),
  });

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return new Response(
      JSON.stringify({
        error: "upstream_error",
        message: "The agent is unavailable right now. Try again in a moment.",
        upstreamStatus: upstream.status,
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  // Pipe the SSE stream straight back to the browser.
  // The frontend parses `data: {...}` chunks and appends `choices[0].delta.content`.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
