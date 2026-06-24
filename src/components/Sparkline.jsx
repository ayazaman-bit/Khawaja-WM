// Tiny dependency-free SVG sparkline for the index trend.
export default function Sparkline({ data, color = "#3b82f6", width = 220, height = 44 }) {
  if (!data || data.length < 2) {
    return (
      <div
        className="text-[11px] text-faint flex items-center"
        style={{ height }}
      >
        gathering trend…
      </div>
    );
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / span) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}
