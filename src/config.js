// Central configuration for the dashboard's model and defaults.
// Everything here is editable — these are the "mill parameters, index weights
// and the AN model" that drive both the live feed and the cost calculator.

export const REFRESH_MS = 5 * 60 * 1000; // live feed auto-refresh: 5 min

// Where staff check the live acrylonitrile price before logging it. The AN
// Price Index shows an "Open" button linking here (opens in a new tab).
export const AN_SOURCE = {
  label: "ECHEMI",
  url: "https://www.echemi.com/productsInformation/pid_Seven2451-acrylonitrile.html",
};

// NEPRA notifications (FCA/QTA decisions) — quick-link from the Electricity panel.
export const NEPRA_SOURCE = {
  label: "NEPRA",
  url: "https://nepra.org.pk/",
};

// ---- Reference / baseline values --------------------------------------------
// Baselines anchor the AN-from-crude model and serve as default fallbacks for
// the calculator's manual fibre prices (wool/polyester/nylon have no live feed).
export const BASELINES = {
  crudeUsdBbl: 78, // Brent crude reference (USD/bbl)
  crudeWtiUsdBbl: 72, // WTI crude reference (USD/bbl)
  anUsdMt: 1450, // Acrylonitrile reference (USD/MT)
  woolUsdKg: 11.5, // Wool reference, clean basis (USD/kg)
  polyesterUsdKg: 1.5, // Polyester staple fibre reference (USD/kg) — manual
  nylonUsdKg: 2.8, // Nylon staple fibre reference (USD/kg) — manual
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

// ---- Yarn cost calculator defaults ------------------------------------------
// These seed the calculator inputs. Any field the user clears falls back to the
// live feed (for the market-driven ones) or to these defaults.
export const CALC_DEFAULTS = {
  // Blend composition: set the non-acrylic fibre %s; acrylic is the remainder.
  // Defaults to 100% acrylic (the mill's flagship product).
  woolPct: 0, // % wool in the blend
  polyesterPct: 0, // % polyester in the blend
  nylonPct: 0, // % nylon in the blend
  anPerKgAcrylic: 1.05, // kg acrylonitrile per kg acrylic fibre
  conversionPremiumUsdKg: 0.95, // monomer -> fibre conversion premium (USD/kg)
  dyeingPkrKg: 30, // in-house dyeing + chemicals (PKR/kg)
  electricityPkrKwh: 38, // PKR per kWh
  energyKwhPerKg: 4.2, // kWh per kg yarn
  labourOverheadPkrKg: 95, // labour + overhead (PKR/kg)
  targetMarginPct: 18, // target margin (%)
};
