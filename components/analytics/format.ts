import type { Column } from "@/components/charts/ColumnChart";
import type { DayPoint } from "@/lib/data/analytics";

const dayFmt = new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });

function keyToDate(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export function dayColumns(points: DayPoint[]): Column[] {
  return points.map((p) => {
    const d = keyToDate(p.day);
    return { tick: String(d.getUTCDate()), label: dayFmt.format(d), value: p.value };
  });
}

export function hourColumns(hours: number[]): Column[] {
  return hours.map((value, h) => ({
    tick: `${h}`,
    label: `${String(h).padStart(2, "0")}:00 – ${String(h).padStart(2, "0")}:59`,
    value,
  }));
}

/** Axis label spacing so ticks never collide on a phone. */
export function tickEvery(n: number) {
  return n <= 10 ? 1 : n <= 16 ? 2 : n <= 31 ? 5 : 10;
}

/** "2 h 14 min", "45 min", "38 s". */
export function formatAirtime(ms: number) {
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec} s`;
  const totalMin = Math.round(totalSec / 60);
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m ? `${h.toLocaleString("es-MX")} h ${m} min` : `${h.toLocaleString("es-MX")} h`;
}

export function formatCount(n: number) {
  return n.toLocaleString("es-MX");
}

export function plural(n: number, one: string, many: string) {
  return `${formatCount(n)} ${n === 1 ? one : many}`;
}

/** "hace 3 min", "hace 2 h", "el 14 nov". */
export function relativeTime(d: Date | null, now = new Date()) {
  if (!d) return "Nunca";
  const sec = Math.max(0, Math.round((now.getTime() - d.getTime()) / 1000));
  if (sec < 60) return "Hace un momento";
  if (sec < 3600) return `Hace ${Math.round(sec / 60)} min`;
  if (sec < 86_400) return `Hace ${Math.round(sec / 3600)} h`;
  return d.toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "short" });
}
