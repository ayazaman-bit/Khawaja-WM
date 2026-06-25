// Central configuration for the dashboard's model and defaults.
// Everything here is editable — these are the "mill parameters, index weights
// and the AN model" that drive both the live feed and the cost calculator.

export const REFRESH_MS = 5 * 60 * 1000; // live feed auto-refresh: 5 min

// ---- Reference / baseline values --------------------------------------------
// Baselines are the anchor points the live model and Cost Pressure Index are
// measured against. Update them as your market reference shifts.
export const BASELINES = {
  crudeUsdBbl: 78, // Brent crude reference (USD/bbl)
  anUsdMt: 1450, // Acrylonitrile reference (USD/MT)
  woolUsdKg: 11.5, // Wool reference, clean basis (USD/kg)
  goldUsdOz: 2350, // Gold reference (USD per troy ounce)
  pkrPerUsd: 278, // PKR per 1 USD reference
  pkrPerGbp: 352, // PKR per 1 GBP reference
  pkrPerEur: 300, // PKR per 1 EUR reference
  pkrPerCny: 39, // PKR per 1 CNY (Yuan) reference
};

// Unit conversions for displaying gold in Pakistan-local units.
export const GOLD_UNITS = {
  gramsPerOunce: 31.1035, // troy ounce -> grams
  gramsPerTola: 11.6638, // 1 tola (Pakistan) in grams
};

// ---- Acrylonitrile-from-crude model -----------------------------------------
// AN price is estimated from crude with an elasticity (beta): a +1% move in
// crude implies a +beta% move in AN, around the AN baseline. When the user logs
// a confirmed AN price, that pair (AN, crude) becomes the new anchor.
export const AN_MODEL = {
  beta: 0.85,
};

// ---- Cost Pressure Index weights --------------------------------------------
// Each driver's % deviation from its baseline is weighted into a 0-centred
// pressure score (100 = at baseline). Weights should sum to ~1.
export const INDEX_WEIGHTS = {
  crude: 0.35,
  an: 0.3,
  wool: 0.2,
  fx: 0.15,
};

export const PRESSURE_ALARM = 108; // index above this => HIGH PRESSURE banner

// ---- Yarn cost calculator defaults ------------------------------------------
// These seed the calculator inputs. Any field the user clears falls back to the
// live feed (for the market-driven ones) or to these defaults.
export const CALC_DEFAULTS = {
  acrylicContentPct: 70, // % acrylic in the blend (rest is wool)
  anPerKgAcrylic: 1.05, // kg acrylonitrile per kg acrylic fibre
  conversionPremiumUsdKg: 0.95, // monomer -> fibre conversion premium (USD/kg)
  electricityPkrKwh: 38, // PKR per kWh
  energyKwhPerKg: 4.2, // kWh per kg yarn
  labourOverheadPkrKg: 95, // labour + overhead (PKR/kg)
  targetMarginPct: 18, // target margin (%)
};
