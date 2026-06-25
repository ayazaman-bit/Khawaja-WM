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

  // Market inputs (manual override -> live feed).
  const anUsdMt = v("anUsdMt", live.anUsdMt);
  const woolUsdKg = v("woolUsdKg", live.woolUsdKg);
  const pkrPerUsd = v("pkrPerUsd", live.pkrPerUsd);

  // Mill parameters (manual override -> configured defaults).
  const acrylicContentPct = v("acrylicContentPct", CALC_DEFAULTS.acrylicContentPct);
  const anPerKgAcrylic = v("anPerKgAcrylic", CALC_DEFAULTS.anPerKgAcrylic);
  const conversionPremiumUsdKg = v(
    "conversionPremiumUsdKg",
    CALC_DEFAULTS.conversionPremiumUsdKg
  );
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

  const acrylicFrac = clampFrac(acrylicContentPct / 100);
  const woolFrac = 1 - acrylicFrac;

  // 1) Acrylic fibre cost (per kg of acrylic), built up from the monomer.
  const anUsdKg = anUsdMt / 1000; // USD per kg acrylonitrile
  const acrylicCostUsdKg = anUsdKg * anPerKgAcrylic + conversionPremiumUsdKg;
  const acrylicCostPkr = acrylicCostUsdKg * pkrPerUsd * acrylicFrac;

  // 2) Wool fibre cost.
  const woolCostPkr = woolUsdKg * pkrPerUsd * woolFrac;

  // 3) Energy.
  const energyPkr = electricityPkrKwh * energyKwhPerKg;

  // 4) Labour + overhead.
  const labourPkr = labourOverheadPkrKg;

  const costOfProduction =
    acrylicCostPkr + woolCostPkr + energyPkr + labourPkr + extraTotal;
  const suggestedSell = costOfProduction * (1 + targetMarginPct / 100);
  const marginPkr = suggestedSell - costOfProduction;

  const breakdown = [
    { label: "Acrylic fibre (ex-AN)", value: acrylicCostPkr, color: "#3b82f6" },
    { label: "Wool", value: woolCostPkr, color: "#f59e0b" },
    { label: "Energy", value: energyPkr, color: "#22c55e" },
    { label: "Labour + overhead", value: labourPkr, color: "#9ca3af" },
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
      pkrPerUsd,
      acrylicContentPct,
      anPerKgAcrylic,
      conversionPremiumUsdKg,
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
  if (Number.isNaN(x)) return 0.7;
  return Math.max(0, Math.min(1, x));
}
