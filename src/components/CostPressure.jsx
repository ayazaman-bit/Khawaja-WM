import { useEffect, useState } from "react";
import { PRESSURE_ALARM } from "../config.js";
import { num } from "../lib/format.js";
import Sparkline from "./Sparkline.jsx";

const REF_FIELDS = [
  { key: "crudeUsdBbl", label: "Crude USD/bbl" },
  { key: "anUsdMt", label: "AN USD/MT" },
  { key: "woolUsdKg", label: "Wool USD/kg" },
  { key: "pkrPerUsd", label: "PKR / USD" },
];

const WEIGHT_FIELDS = [
  { key: "crude", label: "Crude" },
  { key: "an", label: "AN" },
  { key: "wool", label: "Wool" },
  { key: "fx", label: "FX" },
];

// Cost Pressure Index gauge + HIGH PRESSURE alarm + editable reference & weights.
export default function CostPressure({
  index,
  history,
  reference,
  weights,
  onSetToday,
  onEditReference,
  onEditWeight,
  onResetWeights,
}) {
  const high = index >= PRESSURE_ALARM;
  const level = high ? "HIGH PRESSURE" : index >= 102 ? "ELEVATED" : "NORMAL";
  const color = high ? "#ef4444" : index >= 102 ? "#f59e0b" : "#22c55e";

  // Position on a 90–120 band for the bar.
  const fill = Math.max(0, Math.min(100, ((index - 90) / 30) * 100));

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(reference);
  const [wDraft, setWDraft] = useState(weights);
  useEffect(() => setDraft(reference), [reference]);
  useEffect(() => setWDraft(weights), [weights]);

  const onRef = (key, val) => {
    setDraft((d) => ({ ...d, [key]: val }));
    onEditReference(key, val);
  };
  const onW = (key, val) => {
    setWDraft((d) => ({ ...d, [key]: val }));
    onEditWeight(key, val);
  };

  const refDate = reference?.setAt
    ? new Date(reference.setAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  const wSum = weights.crude + weights.an + weights.wool + weights.fx;

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

      {/* Controls */}
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
          {editing ? "done" : "edit reference & weights"}
        </button>
      </div>

      {editing && (
        <div className="mt-2 space-y-3 rounded-lg border border-border bg-panel p-2.5">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-faint mb-1">
              Reference (100 = these)
            </div>
            <div className="grid grid-cols-2 gap-2">
              {REF_FIELDS.map((f) => (
                <label key={f.key} className="block">
                  <span className="block text-[10px] text-muted mb-0.5">{f.label}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={draft?.[f.key] ?? ""}
                    onChange={(e) => onRef(f.key, e.target.value)}
                    className="mono w-full rounded-md border border-border bg-bg px-2 py-1 text-xs focus:border-brand focus:outline-none"
                  />
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wide text-faint">
                Weights (importance · auto-normalised)
              </span>
              <button
                onClick={onResetWeights}
                className="text-[10px] text-muted hover:text-ink hover:underline"
              >
                reset
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {WEIGHT_FIELDS.map((f) => (
                <label key={f.key} className="block">
                  <span className="block text-[10px] text-muted mb-0.5">{f.label}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.05"
                    value={wDraft?.[f.key] ?? ""}
                    onChange={(e) => onW(f.key, e.target.value)}
                    className="mono w-full rounded-md border border-border bg-bg px-2 py-1 text-xs focus:border-brand focus:outline-none"
                  />
                </label>
              ))}
            </div>
            <p className="mt-1 text-[10px] text-faint">
              Sum {num(wSum, 2)} — values are normalised, so they don't have to add
              up to 1.
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-end justify-between gap-3">
        <Sparkline data={history} color={color} />
        <div className="text-[11px] text-faint text-right leading-relaxed">
          weights<br />
          crude {num(weights.crude, 2)} · AN {num(weights.an, 2)}
          <br />
          wool {num(weights.wool, 2)} · FX {num(weights.fx, 2)}
        </div>
      </div>
      <p className="mt-2 text-[10px] text-faint">
        AN uses your latest logged price when available.
      </p>
    </section>
  );
}
