import { PRESSURE_ALARM, INDEX_WEIGHTS } from "../config.js";
import { num } from "../lib/format.js";
import Sparkline from "./Sparkline.jsx";

// Cost Pressure Index gauge + HIGH PRESSURE alarm banner.
export default function CostPressure({ index, history }) {
  const high = index >= PRESSURE_ALARM;
  const level = high ? "HIGH PRESSURE" : index >= 102 ? "ELEVATED" : "NORMAL";
  const color = high ? "#ef4444" : index >= 102 ? "#f59e0b" : "#22c55e";

  // Position on a 90–120 band for the bar.
  const fill = Math.max(0, Math.min(100, ((index - 90) / 30) * 100));

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      {high && (
        <div className="mb-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          ⚠ HIGH PRESSURE — input costs are well above your reference. Review the
          calculator and sell prices.
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">Cost Pressure Index</h2>
          <p className="text-xs text-muted">
            Weighted crude · AN · wool · FX (100 = baseline)
          </p>
        </div>
        <div className="text-right">
          <div className="mono text-2xl font-bold" style={{ color }}>
            {num(index, 1)}
          </div>
          <div
            className="text-[11px] font-medium"
            style={{ color }}
          >
            {level}
          </div>
        </div>
      </div>

      <div className="mt-3 h-2 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${fill}%`, background: color }}
        />
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <Sparkline data={history} color={color} />
        <div className="text-[11px] text-faint text-right leading-relaxed">
          weights<br />
          crude {INDEX_WEIGHTS.crude} · AN {INDEX_WEIGHTS.an}
          <br />
          wool {INDEX_WEIGHTS.wool} · FX {INDEX_WEIGHTS.fx}
        </div>
      </div>
    </section>
  );
}
