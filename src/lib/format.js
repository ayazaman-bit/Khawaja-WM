// Small formatting helpers shared across the UI.

export const num = (v, dp = 2) =>
  v === null || v === undefined || Number.isNaN(v)
    ? "—"
    : Number(v).toLocaleString("en-US", {
        minimumFractionDigits: dp,
        maximumFractionDigits: dp,
      });

export const pkr = (v, dp = 0) => (v == null ? "—" : `Rs ${num(v, dp)}`);

export const usd = (v, dp = 2) => (v == null ? "—" : `$${num(v, dp)}`);

export const pct = (v, dp = 1) =>
  v == null ? "—" : `${v > 0 ? "+" : ""}${num(v, dp)}%`;

export const timeAgo = (ts) => {
  if (!ts) return "never";
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
};

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
