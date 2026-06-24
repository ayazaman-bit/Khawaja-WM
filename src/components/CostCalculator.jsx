import { useMemo } from "react";
import { computeCost } from "../lib/costModel.js";
import { CALC_DEFAULTS } from "../config.js";
import { pkr, num, pct } from "../lib/format.js";

// Field group definitions: which inputs are market-driven (live fallback) vs
// mill parameters (default fallback).
const MARKET_FIELDS = [
  { key: "anUsdMt", label: "AN price (USD/MT)", liveKey: "anUsdMt", dp: 0 },
  { key: "woolUsdKg", label: "Wool (USD/kg)", liveKey: "woolUsdKg", dp: 2 },
  { key: "pkrPerUsd", label: "PKR / USD", liveKey: "pkrPerUsd", dp: 2 },
];

const MILL_FIELDS = [
  { key: "acrylicContentPct", label: "Acrylic fibre content (%)" },
  { key: "anPerKgAcrylic", label: "AN per kg acrylic" },
  { key: "conversionPremiumUsdKg", label: "Fibre conversion premium (USD/kg)" },
  { key: "electricityPkrKwh", label: "Electricity (PKR/kWh)" },
  { key: "energyKwhPerKg", label: "Energy per kg (kWh)" },
  { key: "labourOverheadPkrKg", label: "Labour + overhead (PKR/kg)" },
  { key: "targetMarginPct", label: "Target margin (%)" },
];

export default function CostCalculator({ live, inputs, setInputs, onConfirmAn, anchor }) {
  const result = useMemo(() => computeCost(inputs, live), [inputs, live]);

  const set = (key, value) => setInputs({ ...inputs, [key]: value });
  const reset = () => setInputs({});

  const confirmAn = () => {
    const price = Number(result.resolved.anUsdMt);
    if (price > 0) onConfirmAn(price);
  };

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2 className="text-sm font-semibold">Yarn Cost Calculator</h2>
        <button
          onClick={reset}
          className="text-[11px] text-muted hover:text-ink underline-offset-2 hover:underline"
        >
          reset to defaults
        </button>
      </div>
      <p className="text-xs text-muted mb-4">
        Enter your own costs to get the final cost. Empty fields use the live
        feed (market values) or mill defaults.
      </p>

      <div className="grid md:grid-cols-2 gap-5">
        {/* ---- Inputs ---- */}
        <div className="space-y-4">
          <FieldGroup title="Market inputs (manual or live)">
            {MARKET_FIELDS.map((f) => (
              <Field
                key={f.key}
                label={f.label}
                value={inputs[f.key] ?? ""}
                placeholder={`live ${num(live[f.liveKey], f.dp)}`}
                onChange={(v) => set(f.key, v)}
              />
            ))}
          </FieldGroup>

          <FieldGroup title="Mill parameters">
            {MILL_FIELDS.map((f) => (
              <Field
                key={f.key}
                label={f.label}
                value={inputs[f.key] ?? ""}
                placeholder={`default ${CALC_DEFAULTS[f.key]}`}
                onChange={(v) => set(f.key, v)}
              />
            ))}
          </FieldGroup>
        </div>

        {/* ---- Outputs ---- */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-panel p-4">
            <h3 className="text-xs text-muted mb-3">Estimated Cost Breakdown</h3>
            <div className="space-y-2">
              {result.breakdown.map((b) => {
                const share = (b.value / result.costOfProduction) * 100;
                return (
                  <div key={b.label}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-sm"
                          style={{ background: b.color }}
                        />
                        {b.label}
                      </span>
                      <span className="mono">{pkr(b.value, 1)}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full"
                        style={{ width: `${share}%`, background: b.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted">Cost of production</span>
              <span className="mono text-lg font-semibold">
                {pkr(result.costOfProduction, 0)}
                <span className="text-xs text-muted">/kg</span>
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-brand/40 bg-brand/10 p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted">Suggested sell price</div>
              <div className="text-[11px] text-faint">
                incl. {num(result.resolved.targetMarginPct, 0)}% margin (
                {pkr(result.marginPkr, 0)}/kg)
              </div>
            </div>
            <span className="mono text-2xl font-bold text-brand">
              {pkr(result.suggestedSell, 0)}
              <span className="text-xs text-muted">/kg</span>
            </span>
          </div>

          <div className="rounded-lg border border-border bg-panel p-4">
            <h3 className="text-xs text-muted mb-2">Log a confirmed AN price</h3>
            <p className="text-[11px] text-faint mb-3">
              Confirms the AN price you're using ({num(result.resolved.anUsdMt, 0)}{" "}
              USD/MT) and re-anchors the live estimate to today's crude.
            </p>
            <button
              onClick={confirmAn}
              className="text-xs px-3 py-2 rounded-md bg-brand/20 text-brand border border-brand/40 hover:bg-brand/30 transition w-full"
            >
              Confirm &amp; re-anchor live estimate
            </button>
            {anchor?.confirmedAt && (
              <p className="mt-2 text-[11px] text-faint">
                Last confirmed: {num(anchor.anUsdMt, 0)} USD/MT ·{" "}
                {new Date(anchor.confirmedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function FieldGroup({ title, children }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-faint mb-2">
        {title}
      </div>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </div>
  );
}

function Field({ label, value, placeholder, onChange }) {
  return (
    <label className="block">
      <span className="block text-[11px] text-muted mb-1">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mono w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/40"
      />
    </label>
  );
}
