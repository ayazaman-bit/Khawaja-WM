import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { num } from "../lib/format.js";

// Three 30-day trend charts: Brent crude, gold, and the derived AN estimate.
export default function Charts({ snap }) {
  if (!snap) return null;
  return (
    <section>
      <h2 className="text-sm font-semibold mb-3">30-Day Trends</h2>
      <div className="grid md:grid-cols-3 gap-4">
        <TrendCard
          title="Brent Crude"
          unit="USD/bbl"
          color="#3b82f6"
          data={snap.crude.series}
          current={snap.crude.value}
          dp={1}
          live={snap.crude.live}
        />
        <TrendCard
          title="Gold"
          unit="USD/oz"
          color="#f59e0b"
          data={snap.gold.series}
          current={snap.gold.value}
          dp={0}
          live={snap.gold.live}
        />
        <TrendCard
          title="Acrylonitrile (est.)"
          unit="USD/MT"
          color="#a78bfa"
          data={snap.anSeries}
          current={snap.an}
          dp={0}
          live={false}
        />
      </div>
    </section>
  );
}

function TrendCard({ title, unit, color, data, current, dp, live }) {
  const valid = Array.isArray(data) && data.length > 1;
  const first = valid ? data[0].v : null;
  const last = valid ? data[data.length - 1].v : null;
  const headline = current != null ? current : last;
  const changePct = valid && first ? ((last - first) / first) * 100 : null;
  const up = changePct != null && changePct >= 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="text-xs text-muted">{title}</div>
          <div className="mono text-lg font-semibold">
            {headline != null ? num(headline, dp) : "—"}{" "}
            <span className="text-[11px] text-muted">{unit}</span>
          </div>
        </div>
        <div className="text-right">
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
              live ? "bg-good/15 text-good" : "bg-faint/15 text-faint"
            }`}
          >
            {live ? "LIVE" : "EST"}
          </span>
          {changePct != null && (
            <div
              className={`mono text-[11px] mt-1 ${
                up ? "text-good" : "text-danger"
              }`}
            >
              {up ? "▲" : "▼"} {num(Math.abs(changePct), 1)}% / 30d
            </div>
          )}
        </div>
      </div>

      <div className="h-28 -mx-1">
        {valid ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id={`g-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" hide />
              <YAxis hide domain={["dataMin", "dataMax"]} />
              <Tooltip
                contentStyle={{
                  background: "#1a1d27",
                  border: "1px solid #2a2d3a",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#9ca3af" }}
                formatter={(v) => [`${num(v, dp)} ${unit}`, title]}
              />
              <Area
                type="monotone"
                dataKey="v"
                stroke={color}
                strokeWidth={2}
                fill={`url(#g-${title})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-[11px] text-faint">
            30-day history unavailable
          </div>
        )}
      </div>
    </div>
  );
}
