// Serverless market-data proxy for the dashboard.
//
// Fetches GOLD (USD/oz) and CRUDE OIL (Brent, USD/bbl) from a single provider
// using one API key, kept server-side. The browser fetches /api/markets (same
// origin) — no key in client code.
//
// PROVIDER: Twelve Data (https://twelvedata.com) — free tier covers gold,
// Brent & WTI crude with a generous daily request budget.
//   1. Get a free key: https://twelvedata.com/pricing  (Basic / Free plan)
//   2. Set MARKETS_API_KEY in the Netlify UI (Site config -> Environment
//      variables) or in a local .env for `netlify dev`.
//
// Optional: if you also set EIA_API_KEY, crude is sourced from the EIA (US
// gov, very reliable) instead of Twelve Data. Without any key the dashboard
// still runs on labelled baseline values.
//
// If a price shows as "baseline" despite a key, check the symbols below against
// https://twelvedata.com/exchanges/COMMODITY and adjust SYMBOLS.

const SYMBOLS = {
  gold: "XAU/USD", // gold spot, USD per troy ounce
  brent: "BRENT", // Brent crude spot, USD per barrel
};

// Keep these in step with BASELINES in src/config.js.
const FALLBACK = { goldUsdOz: 2350, crudeUsdBbl: 78 };

export default async () => {
  const out = {
    gold: { usdOz: FALLBACK.goldUsdOz, source: "fallback", asOf: null },
    crude: { usdBbl: FALLBACK.crudeUsdBbl, source: "fallback", asOf: null },
    notes: [],
  };

  await Promise.all([fillTwelveData(out), fillEia(out)]);

  return new Response(JSON.stringify(out), {
    headers: {
      "content-type": "application/json",
      // Commodities move slowly; cache briefly to spare the API quota.
      "cache-control": "public, max-age=600",
    },
  });
};

export const config = { path: "/api/markets" };

// Read env from the Netlify runtime, falling back to process.env (local node).
function env(name) {
  try {
    if (globalThis.Netlify?.env?.get) return globalThis.Netlify.env.get(name);
  } catch {
    /* not in Netlify runtime */
  }
  return process.env[name];
}

// ---- Twelve Data: gold + (default) crude in one batched call ---------------
async function fillTwelveData(out) {
  const key = env("MARKETS_API_KEY");
  if (!key) {
    out.notes.push("MARKETS_API_KEY not set — gold/crude on baseline.");
    return;
  }
  try {
    const symbols = `${SYMBOLS.gold},${SYMBOLS.brent}`;
    const url =
      `https://api.twelvedata.com/price?symbol=${encodeURIComponent(symbols)}` +
      `&apikey=${key}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`TwelveData ${res.status}`);
    const data = await res.json();

    const gold = pickPrice(data, SYMBOLS.gold);
    if (gold) out.gold = { usdOz: gold, source: "Twelve Data", asOf: today() };

    const crude = pickPrice(data, SYMBOLS.brent);
    if (crude)
      out.crude = { usdBbl: crude, source: "Twelve Data (Brent)", asOf: today() };
  } catch (err) {
    out.notes.push(`Twelve Data error: ${String(err.message || err)}`);
  }
}

function pickPrice(data, symbol) {
  const node = data?.[symbol] ?? data; // single-symbol responses aren't nested
  const p = Number(node?.price);
  return p > 0 ? p : null;
}

// ---- EIA (optional): overrides crude when EIA_API_KEY is present ------------
async function fillEia(out) {
  const key = env("EIA_API_KEY");
  if (!key) return;
  try {
    const url =
      "https://api.eia.gov/v2/petroleum/pri/spt/data/" +
      "?frequency=daily&data[0]=value&facets[series][]=RBRTE" +
      "&sort[0][column]=period&sort[0][direction]=desc&offset=0&length=1" +
      `&api_key=${key}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`EIA ${res.status}`);
    const data = await res.json();
    const row = data?.response?.data?.[0];
    const price = row ? Number(row.value) : null;
    if (price > 0) {
      out.crude = {
        usdBbl: price,
        source: "EIA Brent spot (RBRTE)",
        asOf: row.period || null,
      };
    }
  } catch (err) {
    out.notes.push(`EIA error: ${String(err.message || err)}`);
  }
}

const today = () => new Date().toISOString().slice(0, 10);
