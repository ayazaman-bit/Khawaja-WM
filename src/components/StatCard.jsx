import { pct } from "../lib/format.js";

// A single live metric tile.
export default function StatCard({ label, value, unit, change, live, tag, subtext }) {
  const up = change != null && change > 0;
  const down = change != null && change < 0;
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted">{label}</span>
        {tag && (
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
              live
                ? "bg-good/15 text-good"
                : "bg-faint/15 text-faint"
            }`}
          >
            {tag}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="mono text-xl font-semibold">{value}</span>
        {unit && <span className="text-xs text-muted">{unit}</span>}
      </div>
      {change != null && (
        <span
          className={`mono text-xs ${
            up ? "text-danger" : down ? "text-good" : "text-muted"
          }`}
          title="Change vs baseline reference"
        >
          {pct(change)} vs ref
        </span>
      )}
      {subtext && <span className="mono text-[11px] text-muted">{subtext}</span>}
    </div>
  );
}
