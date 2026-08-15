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

/* Abuse protection.
 *
 * ClawUp bills this agent by TIME, not by message ($0.0278/hr compute), so
 * traffic volume does not affect the bill. These limits exist to stop someone
 * flooding the agent's transcript with junk, not to protect spend.
 *
 * They are deliberately generous: a judge or a demo audience hitting a cap
 * would cost us far more than the traffic ever could. In-memory and
 * per-region, so effective numbers run higher than these.
 */
const BURST_LIMIT = 8;
const BURST_WINDOW_MS = 30_000;

const DAILY_LIMIT_PER_IP = 200;
const GLOBAL_DAILY_LIMIT = 4000;

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


/* ── Health check ────────────────────────────────────────────────────
 * GET /api/chat            -> is the server configured?
 * GET /api/chat?probe=1    -> also calls ClawUp for real and reports back
 *
 * Never returns the API key itself, only whether one is present.
 */
export async function GET(req) {
  const apiKey = process.env.CLAWUP_API_KEY;
  const agentId = process.env.CLAWUP_AGENT_ID;

  const out = {
    route: "ok",
    apiKeySet: Boolean(apiKey),
    agentIdSet: Boolean(agentId),
    agentId: agentId || null,
  };

  if (!apiKey || !agentId) {
    out.diagnosis = "Missing env vars. In Vercel, set CLAWUP_API_KEY and CLAWUP_AGENT_ID and tick Production, then redeploy.";
    return new Response(JSON.stringify(out, null, 2), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }

  if (new URL(req.url).searchParams.get("probe") !== "1") {
    out.diagnosis = "Env vars are set. Add ?probe=1 to this URL to test ClawUp itself.";
    return new Response(JSON.stringify(out, null, 2), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const upstream = await fetch(`https://api.clawup.org/api/v1/agents/${agentId}/chat`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "openclaw", messages: [{ role: "user", content: "ping" }], stream: false }),
    });
    out.clawupStatus = upstream.status;
    out.clawupOk = upstream.ok;
    if (!upstream.ok) {
      out.clawupBody = (await upstream.text().catch(() => "")).slice(0, 400);
      out.diagnosis = "Your site is fine. ClawUp is rejecting the request. Read clawupBody.";
    } else {
      out.diagnosis = "ClawUp answered. Everything is working.";
    }
  } catch (e) {
    out.clawupOk = false;
    out.clawupError = String(e).slice(0, 300);
    out.diagnosis = "Could not reach ClawUp at all.";
  }

  return new Response(JSON.stringify(out, null, 2), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
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
