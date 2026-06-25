// Yarn cost model. Turns market inputs + mill parameters into a per-kg cost
// breakdown and a suggested sell price.
//
// All money is normalised to PKR per kg of finished yarn.

import { CALC_DEFAULTS } from "../config.js";

// `live` provides market-driven fallbacks: { anUsdMt, woolUsdKg, pkrPerUsd }.
// `inputs` are the user's manual overrides (any subset). Empty fields fall back
// to live (for market values) or to CALC_DEFAULTS (for mill parameters).
export function computeCost(inputs, live) {
  const v = (key, fallback) => {
    const x = inputs[key];
    return x === "" || x === null || x === undefined || Number.isNaN(Number(x))
      ? fallback
      : Number(x);
  };

  // Market inputs (manual override -> live feed). Wool/polyester/nylon have no
  // live feed, so their "live" values are just sensible baseline defaults.
  const anUsdMt = v("anUsdMt", live.anUsdMt);
  const woolUsdKg = v("woolUsdKg", live.woolUsdKg);
  const polyesterUsdKg = v("polyesterUsdKg", live.polyesterUsdKg);
  const nylonUsdKg = v("nylonUsdKg", live.nylonUsdKg);
  const pkrPerUsd = v("pkrPerUsd", live.pkrPerUsd);

  // Mill parameters (manual override -> configured defaults).
  // Blend composition: set the non-acrylic %s; acrylic is the remainder.
  const woolPct = v("woolPct", CALC_DEFAULTS.woolPct);
  const polyesterPct = v("polyesterPct", CALC_DEFAULTS.polyesterPct);
  const nylonPct = v("nylonPct", CALC_DEFAULTS.nylonPct);
  const anPerKgAcrylic = v("anPerKgAcrylic", CALC_DEFAULTS.anPerKgAcrylic);
  const conversionPremiumUsdKg = v(
    "conversionPremiumUsdKg",
    CALC_DEFAULTS.conversionPremiumUsdKg
  );
  const dyeingPkrKg = v("dyeingPkrKg", CALC_DEFAULTS.dyeingPkrKg);
  const electricityPkrKwh = v(
    "electricityPkrKwh",
    live.electricityPkrKwh ?? CALC_DEFAULTS.electricityPkrKwh
  );
  const energyKwhPerKg = v("energyKwhPerKg", CALC_DEFAULTS.energyKwhPerKg);
  const labourOverheadPkrKg = v(
    "labourOverheadPkrKg",
    CALC_DEFAULTS.labourOverheadPkrKg
  );
  const targetMarginPct = v("targetMarginPct", CALC_DEFAULTS.targetMarginPct);

  // Free-form expense line items the user adds (PKR/kg each).
  const expenses = Array.isArray(inputs.expenses) ? inputs.expenses : [];
  const extraExpenses = expenses
    .map((e) => Number(e.amount))
    .filter((n) => !Number.isNaN(n) && n !== 0);
  const extraTotal = extraExpenses.reduce((a, b) => a + b, 0);

  // Blend fractions: non-acrylic fibres are set directly; acrylic is whatever
  // is left over (so the blend always totals 100%).
  const woolFrac = clampFrac(woolPct / 100);
  const polyFrac = clampFrac(polyesterPct / 100);
  const nylonFrac = clampFrac(nylonPct / 100);
  const acrylicFrac = clampFrac(1 - woolFrac - polyFrac - nylonFrac);

  // 1) Acrylic fibre cost (per kg of acrylic), built up from the monomer.
  const anUsdKg = anUsdMt / 1000; // USD per kg acrylonitrile
  const acrylicCostUsdKg = anUsdKg * anPerKgAcrylic + conversionPremiumUsdKg;
  const acrylicCostPkr = acrylicCostUsdKg * pkrPerUsd * acrylicFrac;

  // 2) Other fibre costs (priced per kg of that fibre).
  const woolCostPkr = woolUsdKg * pkrPerUsd * woolFrac;
  const polyCostPkr = polyesterUsdKg * pkrPerUsd * polyFrac;
  const nylonCostPkr = nylonUsdKg * pkrPerUsd * nylonFrac;

  // 3) Energy.
  const energyPkr = electricityPkrKwh * energyKwhPerKg;

  // 4) Labour + overhead.
  const labourPkr = labourOverheadPkrKg;

  // 5) In-house dyeing + chemicals (already PKR/kg).
  const dyeingPkr = Math.max(0, dyeingPkrKg);

  const costOfProduction =
    acrylicCostPkr +
    woolCostPkr +
    polyCostPkr +
    nylonCostPkr +
    energyPkr +
    labourPkr +
    dyeingPkr +
    extraTotal;
  const suggestedSell = costOfProduction * (1 + targetMarginPct / 100);
  const marginPkr = suggestedSell - costOfProduction;

  const breakdown = [
    { label: "Acrylic fibre (ex-AN)", value: acrylicCostPkr, color: "#3b82f6" },
    ...(woolFrac > 0 ? [{ label: "Wool", value: woolCostPkr, color: "#f59e0b" }] : []),
    ...(polyFrac > 0
      ? [{ label: "Polyester", value: polyCostPkr, color: "#06b6d4" }]
      : []),
    ...(nylonFrac > 0
      ? [{ label: "Nylon", value: nylonCostPkr, color: "#ec4899" }]
      : []),
    { label: "Energy", value: energyPkr, color: "#22c55e" },
    { label: "Labour + overhead", value: labourPkr, color: "#9ca3af" },
    ...(dyeingPkr > 0
      ? [{ label: "Dyeing + chemicals", value: dyeingPkr, color: "#14b8a6" }]
      : []),
    ...expenses
      .filter((e) => Number(e.amount) > 0)
      .map((e) => ({
        label: e.label?.trim() || "Other expense",
        value: Number(e.amount),
        color: "#a78bfa",
      })),
  ];

  // Order-level totals (per-order mode). quantityKg comes from inputs.
  const quantityKg = v("quantityKg", 0);
  const order = {
    quantityKg,
    totalCost: costOfProduction * quantityKg,
    totalSell: suggestedSell * quantityKg,
    totalMargin: marginPkr * quantityKg,
  };

  return {
    order,
    extraTotal,
    resolved: {
      anUsdMt,
      woolUsdKg,
      polyesterUsdKg,
      nylonUsdKg,
      pkrPerUsd,
      woolPct,
      polyesterPct,
      nylonPct,
      acrylicContentPct: Math.round(acrylicFrac * 100), // derived remainder
      anPerKgAcrylic,
      conversionPremiumUsdKg,
      dyeingPkrKg,
      electricityPkrKwh,
      energyKwhPerKg,
      labourOverheadPkrKg,
      targetMarginPct,
    },
    breakdown,
    costOfProduction,
    suggestedSell,
    marginPkr,
  };
}

function clampFrac(x) {
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, x));
}
