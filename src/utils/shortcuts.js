// The one list of keyboard shortcuts. The key handler (useKeyboardShortcuts) and the
// cheat-sheet (ShortcutsDialog) both read this, so they cannot drift apart.
// `combo` is what the handler matches (lowercase, space = press one key then the next);
// `keys` is what the cheat-sheet and the key hints show.

export const SHORTCUTS = [
  { id: "addExpense", combo: "e", keys: ["E"], label: "Create expense", group: "Expenses" },
  { id: "openLatest", combo: "o", keys: ["O"], label: "Open the latest expense", group: "Expenses" },
  { id: "next", combo: "n", keys: ["N"], label: "Next expense / entry", group: "Expenses" },
  { id: "prev", combo: "p", keys: ["P"], label: "Previous expense / entry", group: "Expenses" },
  { id: "toggleRow", combo: "enter", keys: ["Enter"], label: "Expand or collapse a day; on an entry, edit it", group: "Expenses" },
  { id: "editEntry", combo: "t", keys: ["T"], label: "Edit tags and description of the highlighted entry", group: "Expenses" },
  { id: "search", combo: "/", keys: ["/"], label: "Search and filter", group: "Go to" },
  { id: "chat", combo: "c", keys: ["C"], label: "Chat assistant", group: "Go to" },
  { id: "newBank", combo: "b", keys: ["B"], label: "Create an account (bank)", group: "Go to" },
  { id: "nextBank", combo: "j", keys: ["J"], label: "Next account", group: "Go to" },
  { id: "prevBank", combo: "k", keys: ["K"], label: "Previous account", group: "Go to" },
  { id: "manageTags", combo: "g t", keys: ["G", "T"], label: "Manage tags", group: "Go to" },
  { id: "prevPage", combo: "[", keys: ["["], label: "Previous page", group: "View" },
  { id: "nextPage", combo: "]", keys: ["]"], label: "Next page", group: "View" },
  { id: "refresh", combo: "r", keys: ["R"], label: "Refresh expenses", group: "View" },
  { id: "theme", combo: "l", keys: ["L"], label: "Switch light / dark mode", group: "View" },
  { id: "sidebar", combo: "s", keys: ["S"], label: "Show or hide the sidebar (narrow screens)", group: "View" },
  { id: "escape", combo: "escape", keys: ["Esc"], label: "Close the top panel, then clear the highlight", group: "General" },
  { id: "help", combo: "?", keys: ["?"], label: "Show this list", group: "General" },
];

/** Key hint for a shortcut id, e.g. "E" (used for the small hints on buttons). */
export const keyHint = (id) => SHORTCUTS.find((s) => s.id === id)?.keys.join(" ") || "";

export const SHORTCUT_GROUPS = ["Expenses", "Go to", "View", "General"];

// Keys that work inside the Add Expense drawer. Handled by the drawer itself, listed here
// only so the cheat-sheet shows them.
export const FORM_SHORTCUTS = [
  { keys: ["Enter"], label: "In Amount: go to Description" },
  { keys: ["Enter"], label: "In Description: submit" },
  { keys: ["Ctrl", "Enter"], label: "Submit from any field", joiner: "+" },
  { keys: ["Esc"], label: "Close the drawer" },
];
