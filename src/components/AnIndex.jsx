import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { num } from "../lib/format.js";
import { AN_SOURCE } from "../config.js";

const todayISO = () => new Date().toISOString().slice(0, 10);

// Acrylonitrile price index built from confirmed prices the mill logs, plus a
// best-effort market benchmark and the crude-anchored live model estimate.
export default function AnIndex({ log, liveEstimate, benchmark, onAdd, onRemove }) {
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");

  const sorted = [...log].sort((a, b) => (a.date < b.date ? -1 : 1));
  const latest = sorted[sorted.length - 1] || null;
  const prev = sorted[sorted.length - 2] || null;
  const changePct =
    latest && prev && prev.anUsdMt
      ? ((latest.anUsdMt - prev.anUsdMt) / prev.anUsdMt) * 100
      : null;
  const avg =
    sorted.length > 0
      ? sorted.reduce((a, b) => a + Number(b.anUsdMt), 0) / sorted.length
      : null;

  const chartData = sorted.map((e) => ({ t: e.date, v: Number(e.anUsdMt) }));

  const submit = () => {
    const p = Number(price);
    if (!(p > 0)) return;
    onAdd(p, date || todayISO(), note.trim());
    setPrice("");
    setNote("");
    setDate(todayISO());
  };

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-semibold">Acrylonitrile Price Index</h2>
          <p className="text-xs text-muted">
            Your confirmed prices · market benchmark · crude-anchored estimate
          </p>
        </div>
        <div className="text-right">
          <div className="mono text-2xl font-bold">
            {latest ? num(latest.anUsdMt, 0) : "—"}
            <span className="text-xs text-muted"> USD/MT</span>
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

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Stat label="Confirmed entries" value={sorted.length} />
        <Stat label="Average" value={avg != null ? `${num(avg, 0)}` : "—"} unit="USD/MT" />
        <Stat
          label="Live model est."
          value={liveEstimate != null ? num(liveEstimate, 0) : "—"}
          unit="USD/MT"
        />
      </div>

      {/* Price source: check the live price, then log it below */}
      <div className="mb-3 rounded-lg border border-border bg-panel px-3 py-2 flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted">
          {benchmark ? (
            <>
              Market benchmark{" "}
              <span className="mono text-ink">{num(benchmark.usdMt, 0)} USD/MT</span>
              <span className="text-faint"> · {benchmark.source}</span>
            </>
          ) : (
            <>Check the live price, then log it below</>
          )}
        </span>
        <a
          href={AN_SOURCE.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-xs px-3 py-1.5 rounded-md bg-brand/20 text-brand border border-brand/40 hover:bg-brand/30 transition inline-flex items-center gap-1"
        >
          Open {AN_SOURCE.label} ↗
        </a>
      </div>

      {/* Chart */}
      <div className="h-36 -mx-1 mb-3">
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
                formatter={(v) => [`${num(v, 0)} USD/MT`, "AN price"]}
              />
              <Line
                type="monotone"
                dataKey="v"
                stroke="#a78bfa"
                strokeWidth={2}
                dot={{ r: 3, fill: "#a78bfa" }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-[11px] text-faint">
            Log two or more prices to see your AN trend.
          </div>
        )}
      </div>

      {/* Add a confirmed price */}
      <div className="rounded-lg border border-border bg-panel p-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[11px] uppercase tracking-wide text-faint">
            Log a confirmed AN price
          </span>
          <a
            href={AN_SOURCE.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-brand hover:underline inline-flex items-center gap-1"
          >
            Check price on {AN_SOURCE.label} ↗
          </a>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex-1 min-w-[110px]">
            <span className="block text-[11px] text-muted mb-1">Price (USD/MT)</span>
            <input
              type="number"
              inputMode="decimal"
              value={price}
              placeholder="e.g. 1450"
              onChange={(e) => setPrice(e.target.value)}
              className="mono w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm focus:border-brand focus:outline-none"
            />
          </label>
          <label>
            <span className="block text-[11px] text-muted mb-1">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mono rounded-md border border-border bg-bg px-2 py-1.5 text-sm focus:border-brand focus:outline-none"
            />
          </label>
          <label className="flex-1 min-w-[120px]">
            <span className="block text-[11px] text-muted mb-1">Note (supplier)</span>
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
          <ul className="mt-3 space-y-1 max-h-32 overflow-auto pr-1">
            {[...sorted].reverse().map((e, i) => (
              <li
                key={`${e.date}-${i}`}
                className="flex items-center justify-between text-xs border-b border-border/50 pb-1 last:border-0"
              >
                <span className="text-muted">
                  <span className="mono text-ink">{num(e.anUsdMt, 0)}</span> USD/MT
                  <span className="text-faint"> · {e.date}</span>
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
    </section>
  );
}

function Stat({ label, value, unit }) {
  return (
    <div className="rounded-lg border border-border bg-panel p-2.5">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="mono text-sm font-semibold">
        {value}
        {unit && <span className="text-[10px] text-faint"> {unit}</span>}
      </div>
    </div>
  );
}
