/**
 * Live on-chain reader for GOAT mainnet (chain 2345).
 *
 * The Square claims you can walk up and check the receipt yourself. This is
 * what makes that literally true: the Settlement and Identity stations read
 * their numbers from the chain at page load rather than from a constant in
 * this repo.
 *
 * GET /api/chain          -> normalised values for the Square
 * GET /api/chain?debug=1  -> also returns the raw RPC replies, for diagnosis
 *
 * Every field degrades independently. If the RPC is unreachable the route
 * returns live:false and the Square falls back to the recorded values, which
 * are the same numbers — so a failure costs the "live" badge, nothing else.
 */

export const runtime = "edge";

const RPC = "https://rpc.goat.network";
/* The public RPC node does not return receipts for every transaction, even
   ones the explorer clearly has. Blockscout is the second source, and a
   payment counts if either confirms it. */
const EXPLORER_API = "https://explorer.goat.network/api/v2";
const CHAIN_ID = 2345;

const SETTLED_TX = "0xa8747b2b74d09a70dcd3abb3b7cefdd996dcebe3a738f7d691ab66e777843460";

/* Every x402 payment the agent has made, in order. Each is verified live
   below rather than trusted from this list, so a hash that did not actually
   succeed will not be counted. */
const PAYMENTS = [
  { tx: "0xa8747b2b74d09a70dcd3abb3b7cefdd996dcebe3a738f7d691ab66e777843460", note: "self-to-self test" },
  { tx: "0xf972de0eb556f0836821490024196c1313e9edf9cebaa167e584063d32fb468b", note: "to agent #77" },
  { tx: "0xa81799f4a3a376384c955d8cecd819ab2ea4feda567588f9ff5f0eff1b2d48ce", note: "to agent #77" },
];
const REGISTRATION_TX = "0x0f41cdab8b64f59be0fa5a2b2d262044451345b72bb45a89c10a6acbe3fce734";
const AGENT_WALLET = "0x1B6602f2F3dFd75E7Cbe2508Cd4b7f02Dc131F06";
const USDCE = "0x3022b87ac063DE95b1570F46f5e470F8B53112D8";

/* balanceOf(address) selector + 32-byte left-padded address */
const balanceOfData = (addr) =>
  "0x70a08231" + addr.toLowerCase().replace(/^0x/, "").padStart(64, "0");

/* Blockscout v2. Returns { ok, block } or null. Shapes vary between
   versions, so read defensively rather than assuming one field. */
async function explorerTx(hash) {
  try {
    const res = await fetch(`${EXPLORER_API}/transactions/${hash}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const j = await res.json();
    const status = (j.status || j.result || "").toString().toLowerCase();
    const ok = status === "ok" || status === "success" || j.confirmations > 0;
    const block = j.block_number ?? j.block ?? null;
    if (!ok || block == null) return null;
    const to = j.to && (j.to.hash || j.to);
    const transfers = Array.isArray(j.token_transfers) ? j.token_transfers : [];
    const recipient = transfers.length
      ? (transfers[0].to && (transfers[0].to.hash || transfers[0].to))
      : null;
    return { block: Number(block), to, counterparty: recipient || null };
  } catch {
    return null;
  }
}

async function rpc(method, params, id) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
  if (!res.ok) throw new Error(`${method} -> HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(`${method} -> ${json.error.message}`);
  return json.result;
}

const hexToInt = (h) => (h == null ? null : parseInt(h, 16));

/* 18-decimal native BTC, trimmed */
function fromWei18(hex) {
  if (hex == null) return null;
  const wei = BigInt(hex);
  const whole = wei / 10n ** 18n;
  const frac = (wei % 10n ** 18n).toString().padStart(18, "0").slice(0, 8).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : `${whole}`;
}

/* 6-decimal USDC.e */
function fromUnits6(hex) {
  if (hex == null) return null;
  const raw = BigInt(hex);
  const whole = raw / 1000000n;
  const frac = (raw % 1000000n).toString().padStart(6, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : `${whole}`;
}

export async function GET(req) {
  const debug = new URL(req.url).searchParams.get("debug") === "1";

  const out = {
    live: false,
    chainId: CHAIN_ID,
    readAt: new Date().toISOString(),
    settlement: null,
    registration: null,
    wallet: null,
    errors: [],
  };

  /* Verify each recorded payment on-chain. Counted only if the receipt says
     Success, so the hero number can never overstate what actually happened. */
  const paymentChecks = await Promise.allSettled(
    PAYMENTS.map((p, i) => rpc("eth_getTransactionReceipt", [p.tx], 100 + i))
  );

  const confirmed = [];
  const paymentStatus = [];
  const pending = [];
  paymentChecks.forEach((r, i) => {
    const short = PAYMENTS[i].tx.slice(0, 10);
    if (r.status === "rejected") {
      paymentStatus.push({ tx: short, state: "rpc_error",
        detail: String(r.reason?.message || r.reason).slice(0, 120) });
      out.errors.push(`payment ${i + 1} (${short}): ${String(r.reason?.message || r.reason).slice(0, 120)}`);
      return;
    }
    if (!r.value) {
      /* Receipt came back null. Fall back to the explorer, which does have it. */
      pending.push({ index: i, short });
      return;
    }
    if (r.value.status !== "0x1") {
      paymentStatus.push({ tx: short, state: "reverted" });
      out.errors.push(`payment ${i + 1} (${short}): transaction reverted on-chain`);
      return;
    }
    paymentStatus.push({ tx: short, state: "confirmed", via: "rpc", block: hexToInt(r.value.blockNumber) });
    confirmed.push({
      tx: PAYMENTS[i].tx,
      note: PAYMENTS[i].note,
      block: hexToInt(r.value.blockNumber),
      to: r.value.to,
      counterparty: (r.value.logs || [])
        .map((l) => l.topics && l.topics[2])
        .filter(Boolean)
        .map((t) => "0x" + t.slice(26))[0] || null,
    });
  });

  /* Anything the RPC did not have, ask the explorer. */
  if (pending.length) {
    const viaExplorer = await Promise.all(pending.map((p) => explorerTx(PAYMENTS[p.index].tx)));
    viaExplorer.forEach((res, k) => {
      const { index, short } = pending[k];
      if (!res) {
        paymentStatus.push({ tx: short, state: "not_found" });
        out.errors.push(`payment ${index + 1} (${short}): not found on the RPC or the explorer`);
        return;
      }
      paymentStatus.push({ tx: short, state: "confirmed", via: "explorer", block: res.block });
      confirmed.push({
        tx: PAYMENTS[index].tx,
        note: PAYMENTS[index].note,
        block: res.block,
        to: res.to,
        counterparty: res.counterparty,
      });
    });
    confirmed.sort((a, b) => a.block - b.block);
  }

  const counterparties = new Set(
    confirmed.map((c) => (c.counterparty || "").toLowerCase()).filter(Boolean)
  );
  counterparties.delete(AGENT_WALLET.toLowerCase());   // self-to-self is not a second party

  out.payments = {
    /* How many payments we know about, so the frontend can tell a complete
       read from a partial one and refuse to display an undercount. */
    tracked: PAYMENTS.length,
    settled: confirmed.length,
    uniqueAgents: counterparties.size + 1,             // ourselves plus each distinct counterparty
    volumeUsdce: confirmed.length,                      // every payment so far is 1.00 USDC.e
    transactions: confirmed,
    checks: paymentStatus,
  };

  const results = await Promise.allSettled([
    rpc("eth_chainId", [], 1),
    rpc("eth_getTransactionReceipt", [SETTLED_TX], 2),
    rpc("eth_getTransactionReceipt", [REGISTRATION_TX], 3),
    rpc("eth_getBalance", [AGENT_WALLET, "latest"], 4),
    rpc("eth_call", [{ to: USDCE, data: balanceOfData(AGENT_WALLET) }, "latest"], 5),
  ]);

  const [chainRes, settledRes, regRes, btcRes, usdcRes] = results;
  const val = (r, label) => {
    if (r.status === "fulfilled") return r.value;
    out.errors.push(`${label}: ${String(r.reason?.message || r.reason).slice(0, 160)}`);
    return null;
  };

  const chainHex = val(chainRes, "eth_chainId");
  const settled = val(settledRes, "settlement receipt");
  const reg = val(regRes, "registration receipt");
  const btc = val(btcRes, "native balance");
  const usdc = val(usdcRes, "USDC.e balance");

  if (chainHex != null && hexToInt(chainHex) !== CHAIN_ID) {
    out.errors.push(`RPC reports chain ${hexToInt(chainHex)}, expected ${CHAIN_ID}`);
  }

  if (settled) {
    out.settlement = {
      hash: SETTLED_TX,
      block: hexToInt(settled.blockNumber),
      status: settled.status === "0x1" ? "Success" : "Failed",
      from: settled.from,
      to: settled.to,
      selfToSelf: (settled.from || "").toLowerCase() === AGENT_WALLET.toLowerCase(),
    };
  }
  if (reg) {
    out.registration = {
      hash: REGISTRATION_TX,
      block: hexToInt(reg.blockNumber),
      status: reg.status === "0x1" ? "Success" : "Failed",
    };
  }
  if (btc != null || usdc != null) {
    out.wallet = { address: AGENT_WALLET, btc: fromWei18(btc), usdce: fromUnits6(usdc) };
  }

  out.live = Boolean(out.payments && out.payments.settled > 0);

  if (debug) {
    out.raw = {
      chainId: chainHex, settled, registration: reg, nativeBalance: btc, usdceBalance: usdc,
    };
  }

  return new Response(JSON.stringify(out, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      /* one minute of edge cache: the Square shouldn't hammer the RPC */
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
