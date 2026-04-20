export const DAYS_IN_WEEK = 7;

export function buildWeekDates(startDateIso: string): string[] {
  const start = new Date(`${startDateIso}T00:00:00`);

  return Array.from({ length: DAYS_IN_WEEK }, (_, index) => {
    const next = new Date(start);
    next.setDate(start.getDate() + index);
    return toIsoDate(next);
  });
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(dateIso: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${dateIso}T00:00:00`));
}

export function isToday(dateIso: string): boolean {
  const today = toIsoDate(new Date());
  return today === dateIso;
}

export function toMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}
