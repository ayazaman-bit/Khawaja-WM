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
  anchor: "kwm.anAnchor", // { anUsdMt, crudeUsdBbl, confirmedAt }
  calc: "kwm.calcInputs", // saved calculator overrides
};

export const loadAnchor = () => read(KEYS.anchor, null);
export const saveAnchor = (anchor) => write(KEYS.anchor, anchor);

export const loadCalc = () => read(KEYS.calc, {});
export const saveCalc = (inputs) => write(KEYS.calc, inputs);
