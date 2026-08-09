/**
 * /api/chat — server-side proxy to ClawUp.
 * The API key never touches the browser.
 *
 * Security:
 *   - API key lives in CLAWUP_API_KEY env var, server-only
 *   - Basic per-IP rate limit (10 msgs/min) to protect against abuse
 *   - Only forwards the last user message (per ClawUp spec — earlier turns
 *     load from the agent's stored transcript on their side)
 */

export const runtime = "edge"; // Vercel edge = fast + supports streaming natively

const RATE_LIMIT = 10;           // messages per window per IP
const RATE_WINDOW_MS = 60_000;   // 1 minute

// Simple in-memory rate limit map. Edge functions have per-region instances,
// so this is best-effort (won't stop a determined attacker but blocks casual abuse).
const rateLimitMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { ok: true };
  }
  if (now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { ok: true };
  }
  if (entry.count >= RATE_LIMIT) {
    return { ok: false, resetAt: entry.resetAt };
  }
  entry.count += 1;
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
  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    return new Response(
      JSON.stringify({
        error: "rate_limited",
        message: "Too many messages. Try again in a minute.",
        resetAt: rl.resetAt,
      }),
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
  if (userMessage.length > 2000) {
    return new Response(
      JSON.stringify({ error: "bad_request", message: "Message too long (max 2000 chars)." }),
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
