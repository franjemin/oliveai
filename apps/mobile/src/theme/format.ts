export function prettyTime(raw?: string | null): string {
  if (!raw) return "—";
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return raw;
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]}`;
}

export function shortReason(raw?: string | null): string {
  if (!raw) return "";
  return raw.split(/[·,]/)[0]?.trim() ?? raw;
}

export function weekdayStamp(date = new Date()): string {
  const dow = date.toLocaleDateString("en-US", { weekday: "short" });
  const mon = date.toLocaleDateString("en-US", { month: "short" });
  return `${dow} · ${mon} ${date.getDate()}`;
}

export function truncate(text: string, max = 110): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}
