// Thin localStorage wrapper so confirmed prices, the AN anchor and calculator
// inputs survive page reloads.

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage disabled — non-fatal */
  }
};

export const KEYS = {
  anchor: "kwm.anAnchor", // legacy single anchor (migrated into anLog)
  anLog: "kwm.anLog", // [{ anUsdMt, crudeUsdBbl, date, note }] confirmed AN prices
  calc: "kwm.calcInputs", // saved calculator overrides
};

export const loadAnchor = () => read(KEYS.anchor, null);
export const saveAnchor = (anchor) => write(KEYS.anchor, anchor);

export const loadAnLog = () => read(KEYS.anLog, []);
export const saveAnLog = (log) => write(KEYS.anLog, log);

export const loadCalc = () => read(KEYS.calc, {});
export const saveCalc = (inputs) => write(KEYS.calc, inputs);
