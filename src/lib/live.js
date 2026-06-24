// Live market data: FX straight from the browser, crude via our own serverless
// proxy (which keeps the EIA key server-side), and a crude-anchored AN estimate.

import { BASELINES, AN_MODEL, INDEX_WEIGHTS } from "../config.js";

const FX_URL = "https://api.exchangerate-api.com/v4/latest/USD";

// Same-origin function. Works under `netlify dev` and on a deployed Netlify
// site. The leading path is rewritten to the function in netlify.toml.
const CRUDE_URL = "/api/crude";

// ---- FX (PKR per USD) -------------------------------------------------------
async function fetchFx() {
  try {
    const res = await fetch(FX_URL, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`fx ${res.status}`);
    const data = await res.json();
    const pkr = data?.rates?.PKR;
    if (pkr) return { value: pkr, live: true };
  } catch {
    /* fall through to baseline */
  }
  return { value: BASELINES.pkrPerUsd, live: false };
}

// ---- Crude (Brent, USD/bbl) via /api/crude ---------------------------------
async function fetchCrude() {
  try {
    const res = await fetch(CRUDE_URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`crude ${res.status}`);
    const data = await res.json();
    if (typeof data?.price === "number") {
      return {
        value: data.price,
        live: data.source !== "fallback",
        source: data.source,
        asOf: data.asOf || null,
      };
    }
  } catch {
    /* fall through to baseline */
  }
  return {
    value: BASELINES.crudeUsdBbl,
    live: false,
    source: "fallback",
    asOf: null,
  };
}

// ---- Acrylonitrile estimate, anchored to crude ------------------------------
// anchor: { anUsdMt, crudeUsdBbl } — defaults to the configured baselines.
export function estimateAn(crudeNow, anchor) {
  const base = anchor || {
    anUsdMt: BASELINES.anUsdMt,
    crudeUsdBbl: BASELINES.crudeUsdBbl,
  };
  const crudeRatio = crudeNow / base.crudeUsdBbl;
  // AN moves beta-for-one with crude around the anchor.
  const estimate = base.anUsdMt * (1 + AN_MODEL.beta * (crudeRatio - 1));
  return Math.max(0, estimate);
}

// ---- Cost Pressure Index ----------------------------------------------------
// Weighted sum of each driver's level vs baseline, scaled to 100 = at baseline.
export function costPressureIndex({ crude, an, wool, fx }) {
  const r = {
    crude: crude / BASELINES.crudeUsdBbl,
    an: an / BASELINES.anUsdMt,
    wool: wool / BASELINES.woolUsdKg,
    fx: fx / BASELINES.pkrPerUsd,
  };
  const w = INDEX_WEIGHTS;
  const index =
    100 *
    (w.crude * r.crude + w.an * r.an + w.wool * r.wool + w.fx * r.fx);
  return Math.round(index * 10) / 10;
}

// ---- Aggregate snapshot -----------------------------------------------------
export async function fetchSnapshot(anchor) {
  const [fx, crude] = await Promise.all([fetchFx(), fetchCrude()]);
  const an = estimateAn(crude.value, anchor);
  // Wool has no free live feed; hold it at baseline (editable in config).
  const wool = BASELINES.woolUsdKg;
  const index = costPressureIndex({
    crude: crude.value,
    an,
    wool,
    fx: fx.value,
  });
  return {
    at: Date.now(),
    fx, // { value, live }
    crude, // { value, live, source, asOf }
    an, // number (USD/MT)
    wool, // number (USD/kg)
    index, // Cost Pressure Index
    anchored: !!anchor,
  };
}
