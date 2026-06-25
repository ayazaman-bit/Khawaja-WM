// Serverless market-data proxy for the dashboard. The browser fetches
// /api/markets. Returns current price + ~30-day daily history for each.
//
// SOURCES:
//   - Gold (XAU/USD): Twelve Data — needs free MARKETS_API_KEY.
//   - Brent (BZ=F) and WTI (CL=F) crude: Yahoo Finance futures — no key,
//     ~15-min delayed (close to what Google shows). EIA Brent spot is used as a
//     fallback for Brent if Yahoo is unavailable (set EIA_API_KEY).
// Anything that fails falls back to a labelled baseline so the app still runs.

const GOLD_SYMBOL = "XAU/USD";
const HISTORY_DAYS = 30;

// Keep in step with BASELINES in src/config.js.
const FALLBACK = { goldUsdOz: 2350, crudeUsdBbl: 78, wtiUsdBbl: 72 };

export default async () => {
  const out = {
    gold: { usdOz: FALLBACK.goldUsdOz, source: "fallback", asOf: null, series: [] },
    crude: { usdBbl: FALLBACK.crudeUsdBbl, source: "fallback", asOf: null, series: [] },
    wti: { usdBbl: FALLBACK.wtiUsdBbl, source: "fallback", asOf: null, series: [] },
    notes: [],
  };

  await Promise.all([fillGold(out), fillCrude(out)]);
  await fillEia(out); // Brent fallback only (if Yahoo Brent failed)

  return new Response(JSON.stringify(out), {
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=600", // ~10 min
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

// ---- Gold via Twelve Data --------------------------------------------------
async function fillGold(out) {
  const key = env("MARKETS_API_KEY");
  if (!key) {
    out.notes.push("MARKETS_API_KEY not set — gold on baseline.");
    return;
  }
  const gold = await twelveSeries(GOLD_SYMBOL, key);
  if (gold) {
    out.gold = { usdOz: gold.last, source: "Twelve Data", asOf: gold.asOf, series: gold.points };
  } else {
    out.notes.push("gold series unavailable");
  }
}

async function twelveSeries(symbol, key) {
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
    const last = points[points.length - 1];
    return { last: last.v, asOf: last.t, points };
  } catch {
    return null;
  }
}

// ---- Crude (Brent + WTI) via Yahoo Finance futures -------------------------
async function fillCrude(out) {
  const [brent, wti] = await Promise.all([
    yahooSeries("BZ=F").catch(() => null), // Brent
    yahooSeries("CL=F").catch(() => null), // WTI
  ]);
  if (brent) {
    out.crude = { usdBbl: brent.last, source: "Yahoo (Brent BZ=F)", asOf: brent.asOf, series: brent.points };
  } else {
    out.notes.push("Brent (Yahoo) unavailable");
  }
  if (wti) {
    out.wti = { usdBbl: wti.last, source: "Yahoo (WTI CL=F)", asOf: wti.asOf, series: wti.points };
  } else {
    out.notes.push("WTI (Yahoo) unavailable");
  }
}

async function yahooSeries(symbol) {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?range=1mo&interval=1d`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: { "user-agent": "Mozilla/5.0 (KWM dashboard markets fetcher)" },
  });
  if (!res.ok) throw new Error(`yahoo ${symbol} ${res.status}`);
  const data = await res.json();
  const r = data?.chart?.result?.[0];
  if (!r) throw new Error("no result");
  const ts = r.timestamp || [];
  const closes = r.indicators?.quote?.[0]?.close || [];
  const points = ts
    .map((t, i) => ({
      t: new Date(t * 1000).toISOString().slice(0, 10),
      v: Number(closes[i]),
    }))
    .filter((p) => p.v > 0);
  const live = Number(r.meta?.regularMarketPrice);
  const last = points.length ? points[points.length - 1] : null;
  const price = live > 0 ? live : last ? last.v : null;
  if (!(price > 0)) throw new Error("no price");
  return {
    last: price,
    asOf: last ? last.t : new Date().toISOString().slice(0, 10),
    points,
  };
}

// ---- EIA Brent spot: fallback for Brent only -------------------------------
async function fillEia(out) {
  if (out.crude.source !== "fallback") return; // Yahoo Brent already succeeded
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
