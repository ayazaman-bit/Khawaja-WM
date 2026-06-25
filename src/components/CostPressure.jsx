import { useEffect, useState } from "react";
import { PRESSURE_ALARM, INDEX_WEIGHTS } from "../config.js";
import { num } from "../lib/format.js";
import Sparkline from "./Sparkline.jsx";

const REF_FIELDS = [
  { key: "crudeUsdBbl", label: "Crude USD/bbl" },
  { key: "anUsdMt", label: "AN USD/MT" },
  { key: "woolUsdKg", label: "Wool USD/kg" },
  { key: "pkrPerUsd", label: "PKR / USD" },
];

// Cost Pressure Index gauge + HIGH PRESSURE alarm + user-settable reference.
export default function CostPressure({
  index,
  history,
  reference,
  onSetToday,
  onEditReference,
}) {
  const high = index >= PRESSURE_ALARM;
  const level = high ? "HIGH PRESSURE" : index >= 102 ? "ELEVATED" : "NORMAL";
  const color = high ? "#ef4444" : index >= 102 ? "#f59e0b" : "#22c55e";

  // Position on a 90–120 band for the bar.
  const fill = Math.max(0, Math.min(100, ((index - 90) / 30) * 100));

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(reference);
  useEffect(() => setDraft(reference), [reference]);

  const onField = (key, val) => {
    setDraft((d) => ({ ...d, [key]: val }));
    onEditReference(key, val); // parent ignores empty/invalid
  };

  const refDate = reference?.setAt
    ? new Date(reference.setAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

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
            Weighted crude · AN · wool · FX — 100 ={" "}
            {refDate ? `your reference (${refDate})` : "default baseline"}
          </p>
        </div>
        <div className="text-right">
          <div className="mono text-2xl font-bold" style={{ color }}>
            {num(index, 1)}
          </div>
          <div className="text-[11px] font-medium" style={{ color }}>
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

      {/* Reference controls */}
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={onSetToday}
          className="text-[11px] px-2.5 py-1 rounded-md bg-brand/20 text-brand border border-brand/40 hover:bg-brand/30 transition"
          title="Make today's market the 100 baseline"
        >
          ⭐ Set today as reference
        </button>
        <button
          onClick={() => setEditing((e) => !e)}
          className="text-[11px] text-muted hover:text-ink underline-offset-2 hover:underline"
        >
          {editing ? "done" : "edit reference"}
        </button>
      </div>

      {editing && (
        <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-border bg-panel p-2.5">
          {REF_FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="block text-[10px] text-muted mb-0.5">{f.label}</span>
              <input
                type="number"
                inputMode="decimal"
                value={draft?.[f.key] ?? ""}
                onChange={(e) => onField(f.key, e.target.value)}
                className="mono w-full rounded-md border border-border bg-bg px-2 py-1 text-xs focus:border-brand focus:outline-none"
              />
            </label>
          ))}
          <p className="col-span-2 text-[10px] text-faint">
            Set these to your budgeted/standard costs — then “above 100” means
            costs are over your plan.
          </p>
        </div>
      )}

      <div className="mt-4 flex items-end justify-between gap-3">
        <Sparkline data={history} color={color} />
        <div className="text-[11px] text-faint text-right leading-relaxed">
          weights<br />
          crude {INDEX_WEIGHTS.crude} · AN {INDEX_WEIGHTS.an}
          <br />
          wool {INDEX_WEIGHTS.wool} · FX {INDEX_WEIGHTS.fx}
        </div>
      </div>
      <p className="mt-2 text-[10px] text-faint">
        AN uses your latest logged price when available.
      </p>
    </section>
  );
}
