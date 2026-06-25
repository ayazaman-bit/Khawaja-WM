// Serverless market-data proxy for the dashboard.
//
// Fetches GOLD (USD/oz) and CRUDE OIL (Brent, USD/bbl) from a single provider,
// using one API key kept server-side. Returns both the current price AND a
// ~30-day daily history for the charts. The browser fetches /api/markets.
//
// PROVIDER: Twelve Data (https://twelvedata.com) — free tier covers gold,
// Brent & WTI crude (time series + price).
//   Set MARKETS_API_KEY in the Netlify UI (Site config -> Environment vars)
//   or a local .env for `netlify dev`.
//
// Optional: EIA_API_KEY sources the *current* crude price from the EIA (US
// gov) instead; the chart history still comes from Twelve Data.
//
// If a price shows as "baseline" despite a key, check the symbols below against
// https://twelvedata.com/exchanges/COMMODITY and adjust SYMBOLS.

const SYMBOLS = {
  gold: "XAU/USD", // gold spot, USD per troy ounce
  brent: "BRENT", // Brent crude spot, USD per barrel
};

const HISTORY_DAYS = 30;

// Keep these in step with BASELINES in src/config.js.
const FALLBACK = { goldUsdOz: 2350, crudeUsdBbl: 78 };

export default async () => {
  const out = {
    gold: { usdOz: FALLBACK.goldUsdOz, source: "fallback", asOf: null, series: [] },
    crude: { usdBbl: FALLBACK.crudeUsdBbl, source: "fallback", asOf: null, series: [] },
    notes: [],
  };

  await fillTwelveData(out);
  await fillEia(out); // optional crude override (current price only)

  return new Response(JSON.stringify(out), {
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=900", // ~15 min; daily data
    },
  });
};

export const config = { path: "/api/markets" };

function env(name) {
  try {
    if (globalThis.Netlify?.env?.get) return globalThis.Netlify.env.get(name);
  } catch {
    /* not in Netlify runtime */
  }
  return process.env[name];
}

// ---- Twelve Data time series: gold + crude (price + 30d history) ------------
async function fillTwelveData(out) {
  const key = env("MARKETS_API_KEY");
  if (!key) {
    out.notes.push("MARKETS_API_KEY not set — gold/crude on baseline.");
    return;
  }
  const [gold, crude] = await Promise.all([
    series(SYMBOLS.gold, key),
    series(SYMBOLS.brent, key),
  ]);
  if (gold) {
    out.gold = { usdOz: gold.last, source: "Twelve Data", asOf: gold.asOf, series: gold.points };
  } else {
    out.notes.push("gold series unavailable");
  }
  if (crude) {
    out.crude = { usdBbl: crude.last, source: "Twelve Data (Brent)", asOf: crude.asOf, series: crude.points };
  } else {
    out.notes.push("crude series unavailable");
  }
}

async function series(symbol, key) {
  try {
    const url =
      `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}` +
      `&interval=1day&outputsize=${HISTORY_DAYS}&order=ASC&apikey=${key}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(9000) });
    if (!res.ok) throw new Error(`${symbol} ${res.status}`);
    const data = await res.json();
    if (data?.status === "error" || !Array.isArray(data?.values)) {
      throw new Error(data?.message || "no values");
    }
    const points = data.values
      .map((v) => ({ t: v.datetime, v: Number(v.close) }))
      .filter((p) => p.v > 0);
    if (!points.length) throw new Error("empty");
    const lastPoint = points[points.length - 1];
    return { last: lastPoint.v, asOf: lastPoint.t, points };
  } catch {
    return null;
  }
}

// ---- EIA (optional): current crude price + 30-day history ------------------
// Twelve Data's free plan doesn't serve Brent history, so when an EIA key is
// present we source both the latest crude price AND the chart series from the
// EIA (free, reliable government feed).
async function fillEia(out) {
  const key = env("EIA_API_KEY");
  if (!key) return;
  try {
    const url =
      "https://api.eia.gov/v2/petroleum/pri/spt/data/" +
      "?frequency=daily&data[0]=value&facets[series][]=RBRTE" +
      `&sort[0][column]=period&sort[0][direction]=desc&offset=0&length=${HISTORY_DAYS + 1}` +
      `&api_key=${key}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`EIA ${res.status}`);
    const data = await res.json();
    const rows = data?.response?.data;
    if (Array.isArray(rows) && rows.length) {
      // EIA returns newest-first; reverse to ascending for the chart.
      const series = rows
        .map((r) => ({ t: r.period, v: Number(r.value) }))
        .filter((p) => p.v > 0)
        .reverse();
      if (series.length) {
        const last = series[series.length - 1];
        out.crude = {
          usdBbl: last.v,
          source: "EIA Brent spot (RBRTE)",
          asOf: last.t,
          series,
        };
      }
    }
  } catch (err) {
    out.notes.push(`EIA error: ${String(err.message || err)}`);
  }
}
