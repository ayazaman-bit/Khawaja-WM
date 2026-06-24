import { useEffect, useState } from "react";

const ZONES = [
  { label: "Karachi", tz: "Asia/Karachi", flag: "🇵🇰" },
  { label: "London", tz: "Europe/London", flag: "🇬🇧" },
  { label: "New York", tz: "America/New_York", flag: "🇺🇸" },
];

const timeFmt = (tz) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

const dayFmt = (tz) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

export default function WorldClocks() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="border-b border-border bg-bg/60">
      <div className="mx-auto max-w-7xl px-4 py-2 flex flex-wrap items-center gap-x-6 gap-y-1 justify-center sm:justify-end">
        {ZONES.map((z) => (
          <div key={z.tz} className="flex items-center gap-2 text-xs">
            <span>{z.flag}</span>
            <span className="text-muted">{z.label}</span>
            <span className="mono font-medium text-ink">{timeFmt(z.tz).format(now)}</span>
            <span className="mono text-faint hidden sm:inline">{dayFmt(z.tz).format(now)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
