// Live market data: FX straight from the browser (keyless), gold + crude via
// our own serverless proxy (which keeps the single API key server-side), plus a
// crude-anchored acrylonitrile estimate.

import { BASELINES, AN_MODEL, INDEX_WEIGHTS, GOLD_UNITS } from "../config.js";

const FX_URL = "https://api.exchangerate-api.com/v4/latest/USD";

// Same-origin function, rewritten to the markets function in netlify.toml.
const MARKETS_URL = "/api/markets";

// ---- FX (PKR per USD and per GBP) ------------------------------------------
// ExchangeRate-API returns all rates against a USD base, so PKR per GBP is
// simply the PKR rate divided by the GBP rate.
async function fetchFx() {
  try {
    const res = await fetch(FX_URL, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`fx ${res.status}`);
    const data = await res.json();
    const pkr = data?.rates?.PKR;
    const gbp = data?.rates?.GBP;
    if (pkr) {
      const usd = { value: pkr, live: true };
      const perGbp = gbp ? pkr / gbp : null;
      const gbpObj = perGbp
        ? { value: perGbp, live: true }
        : { value: BASELINES.pkrPerGbp, live: false };
      return { usd, gbp: gbpObj };
    }
  } catch {
    /* fall through to baseline */
  }
  return {
    usd: { value: BASELINES.pkrPerUsd, live: false },
    gbp: { value: BASELINES.pkrPerGbp, live: false },
  };
}

// ---- Gold + crude via /api/markets -----------------------------------------
async function fetchMarkets() {
  try {
    const res = await fetch(MARKETS_URL, { signal: AbortSignal.timeout(9000) });
    if (!res.ok) throw new Error(`markets ${res.status}`);
    const data = await res.json();
    return {
      gold: {
        value: Number(data?.gold?.usdOz) || BASELINES.goldUsdOz,
        live: data?.gold?.source && data.gold.source !== "fallback",
        source: data?.gold?.source || "fallback",
        asOf: data?.gold?.asOf || null,
        series: Array.isArray(data?.gold?.series) ? data.gold.series : [],
      },
      crude: {
        value: Number(data?.crude?.usdBbl) || BASELINES.crudeUsdBbl,
        live: data?.crude?.source && data.crude.source !== "fallback",
        source: data?.crude?.source || "fallback",
        asOf: data?.crude?.asOf || null,
        series: Array.isArray(data?.crude?.series) ? data.crude.series : [],
      },
    };
  } catch {
    return {
      gold: { value: BASELINES.goldUsdOz, live: false, source: "fallback", asOf: null, series: [] },
      crude: { value: BASELINES.crudeUsdBbl, live: false, source: "fallback", asOf: null, series: [] },
    };
  }
}

// ---- Markets news via /api/news --------------------------------------------
export async function fetchNews() {
  try {
    const res = await fetch("/api/news", { signal: AbortSignal.timeout(9000) });
    if (!res.ok) throw new Error(`news ${res.status}`);
    const data = await res.json();
    return Array.isArray(data?.items) ? data.items : [];
  } catch {
    return [];
  }
}

// ---- Gold unit conversions (Pakistan-local) --------------------------------
export function goldLocal(usdOz, pkrPerUsd) {
  const pkrPerGram = (usdOz / GOLD_UNITS.gramsPerOunce) * pkrPerUsd;
  return {
    pkrPerTola: pkrPerGram * GOLD_UNITS.gramsPerTola,
    pkrPer10g: pkrPerGram * 10,
  };
}

// ---- Acrylonitrile estimate, anchored to crude ------------------------------
export function estimateAn(crudeNow, anchor) {
  const base = anchor || {
    anUsdMt: BASELINES.anUsdMt,
    crudeUsdBbl: BASELINES.crudeUsdBbl,
  };
  const crudeRatio = crudeNow / base.crudeUsdBbl;
  const estimate = base.anUsdMt * (1 + AN_MODEL.beta * (crudeRatio - 1));
  return Math.max(0, estimate);
}

// ---- Cost Pressure Index ----------------------------------------------------
// Weighted level of each cost driver vs baseline, scaled to 100 = at baseline.
// (Gold is a watch item, not a yarn cost driver, so it is excluded here.)
export function costPressureIndex({ crude, an, wool, fx }) {
  const r = {
    crude: crude / BASELINES.crudeUsdBbl,
    an: an / BASELINES.anUsdMt,
    wool: wool / BASELINES.woolUsdKg,
    fx: fx / BASELINES.pkrPerUsd,
  };
  const w = INDEX_WEIGHTS;
  const index =
    100 * (w.crude * r.crude + w.an * r.an + w.wool * r.wool + w.fx * r.fx);
  return Math.round(index * 10) / 10;
}

// ---- Aggregate snapshot -----------------------------------------------------
export async function fetchSnapshot(anchor) {
  const [fx, markets] = await Promise.all([fetchFx(), fetchMarkets()]);
  const crude = markets.crude;
  const gold = markets.gold;
  const an = estimateAn(crude.value, anchor);
  // Derive a 30-day AN history from the crude history using the same model.
  const anSeries = (crude.series || []).map((p) => ({
    t: p.t,
    v: estimateAn(p.v, anchor),
  }));
  const wool = BASELINES.woolUsdKg; // no free wool feed; held at baseline
  const index = costPressureIndex({
    crude: crude.value,
    an,
    wool,
    fx: fx.usd.value,
  });
  return {
    at: Date.now(),
    fx: fx.usd, // PKR/USD { value, live }
    fxGbp: fx.gbp, // PKR/GBP { value, live }
    crude, // { value, live, source, asOf }
    gold: { ...gold, local: goldLocal(gold.value, fx.usd.value) },
    an, // USD/MT
    anSeries, // [{ t, v }] derived from crude
    wool, // USD/kg
    index,
    anchored: !!anchor,
  };
}
