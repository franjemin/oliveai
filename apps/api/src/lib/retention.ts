export function audioDeleteAfter(endedAt: Date, hours: number): Date {
  return new Date(endedAt.getTime() + hours * 60 * 60 * 1000);
}

export function longRetentionUntil(from: Date, years: number): Date {
  const d = new Date(from);
  d.setFullYear(d.getFullYear() + years);
  return d;
}
