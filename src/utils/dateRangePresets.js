// Calendar-period presets for the date-range filter. Every preset ends today.
// "week" starts on Monday. Ranges are [start, end] Date pairs at local midnight.

export const PRESETS = [
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "year", label: "This year" },
  { key: "all", label: "All time" },
];

const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a, b) => midnight(a).getTime() === midnight(b).getTime();

function startOf(key, today) {
  if (key === "week") {
    const back = (today.getDay() + 6) % 7; // Monday = 0
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() - back);
  }
  if (key === "month") return new Date(today.getFullYear(), today.getMonth(), 1);
  return new Date(today.getFullYear(), 0, 1); // year
}

/** Range for a preset key, or null for "all" (no date filter). */
export function presetRange(key, now = new Date()) {
  if (key === "all") return null;
  const today = midnight(now);
  return [startOf(key, today), today];
}

/** Which preset a range is: "week" | "month" | "year" | "all" | "custom". */
export function detectPreset(range, now = new Date()) {
  if (!range || (!range[0] && !range[1])) return "all";
  const [s, e] = range;
  if (!s || !e) return "custom";
  const today = midnight(now);
  if (!sameDay(e, today)) return "custom";
  for (const key of ["week", "month", "year"]) {
    if (sameDay(s, startOf(key, today))) return key;
  }
  return "custom";
}

/** The range the app starts with and Reset returns to. */
export const defaultRange = (now = new Date()) => presetRange("month", now);

/** True when the range is exactly the default "This month". */
export const isDefaultRange = (range, now = new Date()) =>
  detectPreset(range, now) === "month";
