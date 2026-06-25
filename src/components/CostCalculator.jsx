import { useMemo, useState } from "react";
import { computeCost } from "../lib/costModel.js";
import { CALC_DEFAULTS } from "../config.js";
import { pkr, num } from "../lib/format.js";

const MARKET_FIELDS = [
  { key: "anUsdMt", label: "AN price (USD/MT)", liveKey: "anUsdMt", dp: 0, live: true },
  // Wool has no free live feed — this is a manual figure the mill sets from its
  // own purchase price, pre-filled with a sensible default.
  { key: "woolUsdKg", label: "Wool (USD/kg)", liveKey: "woolUsdKg", dp: 2, live: false },
  { key: "pkrPerUsd", label: "PKR / USD", liveKey: "pkrPerUsd", dp: 2, live: true },
];

const MILL_FIELDS = [
  { key: "acrylicContentPct", label: "Acrylic fibre content (%)" },
  { key: "anPerKgAcrylic", label: "AN per kg acrylic" },
  { key: "conversionPremiumUsdKg", label: "Fibre conversion premium (USD/kg)" },
  { key: "electricityPkrKwh", label: "Electricity rate (PKR/unit)" },
  { key: "energyKwhPerKg", label: "Units used per kg (kWh)" },
  { key: "labourOverheadPkrKg", label: "Labour + overhead (PKR/kg)" },
  { key: "targetMarginPct", label: "Target margin (%)" },
];

export default function CostCalculator({ live, inputs, setInputs, onConfirmAn, anchor }) {
  const [mode, setMode] = useState("perKg"); // "perKg" | "perOrder"
  const result = useMemo(() => computeCost(inputs, live), [inputs, live]);

  const set = (key, value) => setInputs({ ...inputs, [key]: value });
  const reset = () => setInputs({});

  // ---- Custom expense rows ----
  const expenses = Array.isArray(inputs.expenses) ? inputs.expenses : [];
  const setExpenses = (next) => setInputs({ ...inputs, expenses: next });
  const addExpense = () =>
    setExpenses([...expenses, { label: "", amount: "" }]);
  const updateExpense = (i, patch) =>
    setExpenses(expenses.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  const removeExpense = (i) =>
    setExpenses(expenses.filter((_, idx) => idx !== i));

  const confirmAn = () => {
    const price = Number(result.resolved.anUsdMt);
    if (price > 0) onConfirmAn(price);
  };

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h2 className="text-sm font-semibold">Yarn Cost Calculator</h2>
        <div className="flex items-center gap-2">
          <ModeToggle mode={mode} setMode={setMode} />
          <button
            onClick={reset}
            className="text-[11px] text-muted hover:text-ink underline-offset-2 hover:underline"
          >
            reset
          </button>
        </div>
      </div>
      <p className="text-xs text-muted mb-4">
        Enter your own costs to get the final price. Empty fields use the live
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
                placeholder={`${f.live ? "live" : "default"} ${num(live[f.liveKey], f.dp)}`}
                onChange={(v) => set(f.key, v)}
                caption={f.live === false ? "manual — your purchase price" : null}
              />
            ))}
          </FieldGroup>

          <FieldGroup title="Mill parameters">
            {MILL_FIELDS.map((f) => {
              const isElec = f.key === "electricityPkrKwh";
              const hasLive = isElec && live.electricityPkrKwh != null;
              const typed = inputs[f.key] !== "" && inputs[f.key] != null;
              const placeholder = hasLive
                ? `GEPCO ${num(live.electricityPkrKwh, 2)}`
                : `default ${CALC_DEFAULTS[f.key]}`;
              const caption = isElec
                ? typed
                  ? "manual override"
                  : hasLive
                  ? "from GEPCO tracker"
                  : null
                : null;
              return (
                <Field
                  key={f.key}
                  label={f.label}
                  value={inputs[f.key] ?? ""}
                  placeholder={placeholder}
                  onChange={(v) => set(f.key, v)}
                  caption={caption}
                  captionClass={typed ? "text-warn" : "text-faint"}
                />
              );
            })}
          </FieldGroup>

          <p className="text-[11px] text-muted -mt-1">
            ⚡ Energy cost ≈{" "}
            <span className="mono text-ink">
              {pkr(result.breakdown.find((b) => b.label === "Energy")?.value ?? 0, 1)}
            </span>
            /kg <span className="text-faint">(rate × units used)</span>
          </p>

          {/* ---- Custom expenses ---- */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wide text-faint">
                Your expenses (PKR/kg)
              </span>
              <button
                onClick={addExpense}
                className="text-[11px] text-brand hover:underline"
              >
                + add expense
              </button>
            </div>
            {expenses.length === 0 && (
              <p className="text-[11px] text-faint">
                Add packaging, freight, dyeing, rent, finance cost, etc.
              </p>
            )}
            <div className="space-y-2">
              {expenses.map((e, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={e.label}
                    placeholder="Expense name"
                    onChange={(ev) => updateExpense(i, { label: ev.target.value })}
                    className="flex-1 rounded-md border border-border bg-bg px-2 py-1.5 text-sm focus:border-brand focus:outline-none"
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    value={e.amount}
                    placeholder="PKR/kg"
                    onChange={(ev) => updateExpense(i, { amount: ev.target.value })}
                    className="mono w-24 rounded-md border border-border bg-bg px-2 py-1.5 text-sm focus:border-brand focus:outline-none"
                  />
                  <button
                    onClick={() => removeExpense(i)}
                    className="text-faint hover:text-danger px-1"
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ---- Outputs ---- */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-panel p-4">
            <h3 className="text-xs text-muted mb-3">Estimated Cost Breakdown</h3>
            <div className="space-y-2">
              {result.breakdown.map((b, i) => {
                const share = (b.value / result.costOfProduction) * 100;
                return (
                  <div key={`${b.label}-${i}`}>
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

          {mode === "perKg" ? (
            <PerKgResult result={result} />
          ) : (
            <PerOrderResult result={result} qty={inputs.quantityKg ?? ""} onQty={(v) => set("quantityKg", v)} />
          )}

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

function PerKgResult({ result }) {
  return (
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
  );
}

function PerOrderResult({ result, qty, onQty }) {
  const { order } = result;
  return (
    <div className="rounded-lg border border-brand/40 bg-brand/10 p-4 space-y-3">
      <label className="block">
        <span className="block text-[11px] text-muted mb-1">Order quantity (kg)</span>
        <input
          type="number"
          inputMode="decimal"
          value={qty}
          placeholder="e.g. 500"
          onChange={(e) => onQty(e.target.value)}
          className="mono w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm focus:border-brand focus:outline-none"
        />
      </label>
      <Row label="Cost / kg" value={pkr(result.costOfProduction, 0)} />
      <Row label="Total cost" value={pkr(order.totalCost, 0)} />
      <Row
        label={`Margin (${num(result.resolved.targetMarginPct, 0)}%)`}
        value={pkr(order.totalMargin, 0)}
      />
      <div className="pt-2 border-t border-brand/30 flex items-center justify-between">
        <span className="text-xs text-muted">Order price</span>
        <span className="mono text-xl font-bold text-brand">
          {pkr(order.totalSell, 0)}
        </span>
      </div>
      <div className="text-[11px] text-faint text-right">
        {pkr(result.suggestedSell, 0)}/kg
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted">{label}</span>
      <span className="mono">{value}</span>
    </div>
  );
}

function ModeToggle({ mode, setMode }) {
  const opt = (key, text) => (
    <button
      onClick={() => setMode(key)}
      className={`text-[11px] px-2.5 py-1 rounded-md transition ${
        mode === key
          ? "bg-brand/20 text-brand border border-brand/40"
          : "text-muted border border-transparent hover:text-ink"
      }`}
    >
      {text}
    </button>
  );
  return (
    <div className="flex items-center gap-1 rounded-lg bg-bg p-0.5 border border-border">
      {opt("perKg", "Per kg")}
      {opt("perOrder", "Per order")}
    </div>
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

function Field({ label, value, placeholder, onChange, caption, captionClass }) {
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
      {caption && (
        <span className={`block text-[10px] mt-0.5 ${captionClass || "text-faint"}`}>
          {caption}
        </span>
      )}
    </label>
  );
}
