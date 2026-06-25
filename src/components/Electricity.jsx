import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { num, pkr } from "../lib/format.js";
import { NEPRA_SOURCE } from "../config.js";

const todayISO = () => new Date().toISOString().slice(0, 10);
const ELEC_COLOR = "#38bdf8";

const shortDate = (s) => {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Compact GEPCO electricity tracker: log the effective PKR/kWh you pay, see the
// trend, feed the calculator, and watch Pakistan power news. No backend — the
// rates you log live in the browser (like the AN Price Index).
export default function Electricity({ log, news, onAdd, onRemove }) {
  const [rate, setRate] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");

  const sorted = [...log].sort((a, b) => (a.date < b.date ? -1 : 1));
  const latest = sorted[sorted.length - 1] || null;
  const prev = sorted[sorted.length - 2] || null;
  const changePct =
    latest && prev && prev.ratePkrKwh
      ? ((latest.ratePkrKwh - prev.ratePkrKwh) / prev.ratePkrKwh) * 100
      : null;
  const chartData = sorted.map((e) => ({ t: e.date, v: Number(e.ratePkrKwh) }));

  const submit = () => {
    const r = Number(rate);
    if (!(r > 0)) return;
    onAdd(r, date || todayISO(), note.trim());
    setRate("");
    setNote("");
    setDate(todayISO());
  };

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-semibold">Electricity (GEPCO)</h2>
          <p className="text-xs text-muted">
            Effective rate you pay · Gujranwala industrial (B2/B3)
          </p>
        </div>
        <div className="text-right">
          <div className="mono text-2xl font-bold">
            {latest ? num(latest.ratePkrKwh, 2) : "—"}
            <span className="text-xs text-muted"> PKR/kWh</span>
          </div>
          {changePct != null && (
            <div
              className={`mono text-[11px] ${
                changePct >= 0 ? "text-danger" : "text-good"
              }`}
            >
              {changePct >= 0 ? "▲" : "▼"} {num(Math.abs(changePct), 1)}% vs prev
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Left: chart + log form + history */}
        <div className="lg:col-span-2 space-y-3">
          <div className="h-32 -mx-1">
            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 6, right: 6, bottom: 0, left: 6 }}>
                  <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#6b7280" }} />
                  <YAxis hide domain={["dataMin", "dataMax"]} />
                  <Tooltip
                    contentStyle={{
                      background: "#1a1d27",
                      border: "1px solid #2a2d3a",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "#9ca3af" }}
                    formatter={(v) => [`${num(v, 2)} PKR/kWh`, "Effective rate"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="v"
                    stroke={ELEC_COLOR}
                    strokeWidth={2}
                    dot={{ r: 3, fill: ELEC_COLOR }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[11px] text-faint">
                Log two or more bills to see your electricity trend.
              </div>
            )}
          </div>

          {/* Log form */}
          <div className="rounded-lg border border-border bg-panel p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] uppercase tracking-wide text-faint">
                Log effective rate (from your GEPCO bill)
              </span>
              <a
                href={NEPRA_SOURCE.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-brand hover:underline inline-flex items-center gap-1"
              >
                {NEPRA_SOURCE.label} notifications ↗
              </a>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex-1 min-w-[110px]">
                <span className="block text-[11px] text-muted mb-1">Rate (PKR/kWh)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={rate}
                  placeholder="e.g. 28.99"
                  onChange={(e) => setRate(e.target.value)}
                  className="mono w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm focus:border-brand focus:outline-none"
                />
              </label>
              <label>
                <span className="block text-[11px] text-muted mb-1">Bill month</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mono rounded-md border border-border bg-bg px-2 py-1.5 text-sm focus:border-brand focus:outline-none"
                />
              </label>
              <label className="flex-1 min-w-[120px]">
                <span className="block text-[11px] text-muted mb-1">Note</span>
                <input
                  type="text"
                  value={note}
                  placeholder="optional"
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm focus:border-brand focus:outline-none"
                />
              </label>
              <button
                onClick={submit}
                className="text-xs px-3 py-2 rounded-md bg-brand/20 text-brand border border-brand/40 hover:bg-brand/30 transition"
              >
                Add
              </button>
            </div>

            {sorted.length > 0 && (
              <ul className="mt-3 space-y-1 max-h-28 overflow-auto pr-1">
                {[...sorted].reverse().map((e, i) => (
                  <li
                    key={`${e.date}-${i}`}
                    className="flex items-center justify-between text-xs border-b border-border/50 pb-1 last:border-0"
                  >
                    <span className="text-muted">
                      <span className="mono text-ink">{num(e.ratePkrKwh, 2)}</span>{" "}
                      PKR/kWh<span className="text-faint"> · {e.date}</span>
                      {e.note ? <span className="text-faint"> · {e.note}</span> : null}
                    </span>
                    <button
                      onClick={() => onRemove(sorted.length - 1 - i)}
                      className="text-faint hover:text-danger px-1"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right: Pakistan power news */}
        <div className="rounded-lg border border-border bg-panel p-3 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wide text-faint">
              Pakistan power news
            </span>
            <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-danger" />
          </div>
          {news === null && <div className="text-[11px] text-faint">loading…</div>}
          {news !== null && news.length === 0 && (
            <div className="text-[11px] text-faint">No headlines right now.</div>
          )}
          <ul className="space-y-2 overflow-auto pr-1">
            {(news || []).slice(0, 6).map((it, i) => (
              <li key={i} className="border-b border-border/50 pb-2 last:border-0">
                <a
                  href={it.link || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-ink hover:text-brand leading-snug block"
                >
                  {it.title}
                </a>
                {(it.source || it.date) && (
                  <span className="text-[10px] text-faint">
                    {it.source ? it.source : ""}
                    {it.source && it.date ? " · " : ""}
                    {it.date ? shortDate(it.date) : ""}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-2 text-[10px] text-faint">
        The latest rate you log auto-fills the Electricity field in the Yarn Cost
        Calculator.
      </p>
    </section>
  );
}
