// The keyboard highlight ("cursor") over the expense list. It walks the day rows and,
// for a day that is expanded, the entries inside it, in the order they appear on screen.
// cursor = { expId, eeId } where eeId is null when the highlight is on the day row itself.

// eeId of the "Add Entry" button at the bottom of an expanded day: N / P stop on it, Enter presses it.
export const ADD_ENTRY = "__add__";

export function flattenCursorItems(list, openIds) {
  const open = new Set(openIds);
  const items = [];
  for (const exp of list || []) {
    items.push({ expId: exp.id, eeId: null });
    if (open.has(exp.id)) {
      for (const e of exp.expenses || []) items.push({ expId: exp.id, eeId: e.ee_id });
      items.push({ expId: exp.id, eeId: ADD_ENTRY });
    }
  }
  return items;
}

export const sameCursor = (a, b) =>
  !!a && !!b && a.expId === b.expId && (a.eeId ?? null) === (b.eeId ?? null);

/** Next (dir = 1) or previous (dir = -1) item. With no highlight yet, N starts at the top and P at the bottom. */
export function stepCursor(items, cursor, dir) {
  if (!items.length) return null;
  const at = items.findIndex((i) => sameCursor(i, cursor));
  if (at === -1) return dir > 0 ? items[0] : items[items.length - 1];
  return items[Math.min(items.length - 1, Math.max(0, at + dir))];
}
