export function parseSessionMinutesInput(value: string) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (/^\d+$/.test(normalized)) {
    return Number(normalized);
  }

  const hoursMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)\b/);
  const minutesMatch = normalized.match(/(\d+)\s*(m|min|mins|minute|minutes)\b/);
  const hours = hoursMatch ? Number(hoursMatch[1]) : 0;
  const minutes = minutesMatch ? Number(minutesMatch[1]) : 0;
  const total = Math.round(hours * 60 + minutes);

  if (total > 0 && (hoursMatch || minutesMatch)) {
    return total;
  }

  return null;
}

export function parseFrequencyInput(value: string) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  const weeklyMatch = normalized.match(/^(\d+(?:\.\d+)?)\s*(x|times)?\s*(\/|per)?\s*week$/);
  if (weeklyMatch) {
    return Number(weeklyMatch[1]);
  }

  const everyDaysMatch = normalized.match(/^every\s+(\d+(?:\.\d+)?)\s*(day|days)$/);
  if (everyDaysMatch) {
    return 7 / Number(everyDaysMatch[1]);
  }

  const everyWeeksMatch = normalized.match(/^every\s+(\d+(?:\.\d+)?)\s*(week|weeks)$/);
  if (everyWeeksMatch) {
    return 1 / Number(everyWeeksMatch[1]);
  }

  const daysMatch = normalized.match(/^(\d+(?:\.\d+)?)\s*(day|days)$/);
  if (daysMatch) {
    return 7 / Number(daysMatch[1]);
  }

  const weeksMatch = normalized.match(/^(\d+(?:\.\d+)?)\s*(week|weeks)$/);
  if (weeksMatch) {
    return 1 / Number(weeksMatch[1]);
  }

  if (/^\d+(?:\.\d+)?$/.test(normalized)) {
    return Number(normalized);
  }

  return null;
}

export function formatSessionInput(minutes: number) {
  return `${minutes} min`;
}

export function formatFrequencyInput(frequencyPerWeek: number | null | undefined) {
  if (!frequencyPerWeek || frequencyPerWeek <= 0) {
    return "";
  }

  const rounded = Number.isInteger(frequencyPerWeek) ? frequencyPerWeek : Number(frequencyPerWeek.toFixed(2));
  return `${rounded}x / week`;
}
