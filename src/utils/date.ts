const DAY_IN_MS = 1000 * 60 * 60 * 24;

export const weekDays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
] as const;

export function getDaysSince(isoDate: string, now = new Date()) {
  const then = new Date(isoDate);
  return Math.max(0, (now.getTime() - then.getTime()) / DAY_IN_MS);
}

export function getTodayIndex(now = new Date()) {
  return now.getDay();
}

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function isSameLocalDay(isoDate: string, comparisonDate = new Date()) {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return (
    date.getFullYear() === comparisonDate.getFullYear() &&
    date.getMonth() === comparisonDate.getMonth() &&
    date.getDate() === comparisonDate.getDate()
  );
}

export function formatMinutes(totalMinutes: number) {
  if (totalMinutes < 60) {
    return `~${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return minutes === 0 ? `~${hours} hour${hours === 1 ? "" : "s"}` : `~${hours}h ${minutes}m`;
}

export function formatShortDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}
