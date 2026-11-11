---
name: add-keyboard-shortcuts
description: How keyboard shortcuts work in TraceMyMoneyUI and how to add or change one safely (list, hook, highlight, cheat-sheet).
---

# Keyboard shortcuts in TraceMyMoneyUI

## Where things live
- `src/utils/shortcuts.js`: the ONE list (`id`, `combo`, `keys`, `label`, `group`). The handler and the cheat-sheet both read it.
- `src/hooks/useKeyboardShortcuts.js`: one `keydown` listener on `document`. Guards: ignores typing in input/textarea/select, Ctrl/Cmd/Alt, Shift (except `?`), and any open dialog/drawer (only `?` and Esc pass). Supports two-key combos like `g t` (1 second).
- `src/components/Dashboard.jsx`: builds the `shortcutHandlers` object (keys are shortcut ids) and calls the hook. Phone, logged-out, admin and profile views disable it.
- `src/utils/kbCursor.js`: pure helpers for the highlight over day rows and their expanded entries.
- Store (`useStore.js`): `openExpenseIds`, `kbCursor`, `shortcutsOpen` and their setters.
- `ShortcutsDialog.jsx`: the `?` cheat-sheet. A "Keyboard shortcuts" item in the Topbar menu opens it too.

## Add a shortcut
1. Add an entry to `SHORTCUTS` (lowercase `combo`, display `keys`). Check no other combo starts with the same key.
2. Add a function with the same `id` to `shortcutHandlers` in `Dashboard.jsx`. Read live data with `useStore.getState()` inside it, not from stale closures.
3. If it has nothing to act on, call `hint("...")` (a corner toast, type `hint`) instead of failing silently.
4. Never bind delete. Never bind `Space` (double Space opens the chat).
5. Update the `Shortcuts.dc.html` artboard in the UI Artifact.

## Lessons
- New dialogs must use a class the hook already knows (`.dialog-overlay` etc.) or be added to `OVERLAY_SELECTOR`, otherwise keys leak through while it is open.
- Some dialogs handle their own Esc (tags, chat, excluded tags, MCP); others do not (new account, edit entry, confirm). The `escape` handler in `Dashboard.jsx` closes the ones that do not, plus the cheat-sheet, drawer and search panel, then clears the highlight. A NEW dialog without its own Esc must be added there.
- Esc works from inside a field too. A dropdown that handles Esc itself must call `preventDefault` (TagSearchSelect does), because the hook ignores keys that are already `defaultPrevented`. If nothing closed, Esc just blurs the field.
- Blur the focused element when N / P / O move the highlight, otherwise a focused button keeps the Enter key.
- Enter on a highlighted entry edits it; on a day row it expands or collapses.
- J / K change the selected account through `fetchFilteredExpensesList`; the Sidebar highlight follows `currentSelectedBankId` (an effect), not only its own click.
- Add Expense drawer is keyboard friendly: autofocus on Amount (not on phones), Enter in Amount goes to Description, Enter in Description or Ctrl/Cmd+Enter submits. These live in the drawer, not in the hook; the cheat-sheet lists them from `FORM_SHORTCUTS`.
- Hide key hints on touch screens with `@media (hover: none), (pointer: coarse)`; phones get no shortcuts at all (`usePhoneScreen`).
- Both the desktop row and the tablet card are in the DOM (CSS hides one); scroll the one with `offsetParent !== null`.
- There is no test runner. Test by hand: type in the search box, open a dialog, hold Ctrl/Cmd, empty list, last page, phone width.

## Check before saying "done" (these four were found by the user, not by me)
1. Every dialog and panel a shortcut can open: does Esc close it? List each one and check whether it has its own
   Esc handler; add the ones that do not to the `escape` handler.
2. Every list the user can walk with the mouse (expenses, entries, accounts): is there a next / previous key?
3. Every key that opens a form: can the form be filled and submitted with the keyboard alone? (autofocus first
   field, Enter moves on, Enter or Ctrl/Cmd+Enter submits, Esc closes).
4. Every thing a highlighted item can do with the mouse (expand, edit, delete): does Enter or a letter do the
   same where it is safe? (Delete stays mouse-only.)
Then update the cheat-sheet data (`SHORTCUTS`, `FORM_SHORTCUTS`) and the `Shortcuts.dc.html` artboard.
