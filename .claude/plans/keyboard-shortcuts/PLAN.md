# Keyboard shortcuts — PLAN

Spec: `SPEC.md` (same folder). Branch: `FRONTEND-FEATURE-keyboard-shortcuts`.
Status: BUILT (steps 0 to 7 done, `npm run build` passes). NOT yet hand-tested in a browser (step 8). Step 9 partly done (Artifact updated, skill added); waiting for the user's test and commit.

## Steps

Build one step at a time. Log every problem in the Problems log below. Test in the browser after each step.

### Step 0: Design draft (SKIPPED by the user, 2026-11-11)
The user said to skip the draft and implement directly. Instead the current UI Artifact (https://claude.ai/artifact/4fJEw8qNEHU6PkDiTYfJdR, version 18) was updated after building: new artboard `Shortcuts.dc.html` (cheat-sheet + hint toast), key hints and a highlighted entry on `Main.dc.html`, a "Keyboard shortcuts" item in `ProfileMenu.dc.html`.

### UI steps start here (first line of UI steps)
No approved draft (waived by the user). The Artifact above was updated to match the built UI.

### Step 1: Shortcut definitions
- [x] `src/utils/shortcuts.js`: one list of `{ keys, label, group, action }`. Used by both the hook and the cheat-sheet.

### Step 2: The hook
- [x] `src/hooks/useKeyboardShortcuts.js`: one `keydown` listener on `document`.
- [x] Apply rules 1 to 4 and 6 of the spec (typing guard, modifier guard, dialog-open guard, phone gate, logged-in and dashboard only).
- [x] Two-key combo (`G` then `T`) with a 1 second timeout.
- [x] Clean up the listener on unmount.

### Step 3: Dashboard wiring
- [x] `Dashboard.jsx` already owns `drawerOpen`, `searchOpen`, `tagDialogOpen`, `chatOpen`, `sidebarOpen`. Pass setters and an `anyDialogOpen` flag into the hook.
- [x] `E`, `C`, `B`, `S`, `/`, `G T`, `Esc` first (they only toggle existing state).

### Step 4: Row highlight (ExpenseTable)
- [x] Add `activeIndex` (highlighted row) and expose it to the hook (store field or lifted state in Dashboard; decide when reading `ExpenseTable.jsx`, keep it local if possible).
- [x] `O`, `N`, `P`, `Enter`/`Space`, `T`: highlight, scroll into view, expand, open ApplyTagsDialog for the highlighted entry.
- [x] Highlight resets on page change, search or refresh.
- [x] `aria-selected` and visible focus ring using `--acid`.

### Step 5: Pagination, refresh, theme
- [x] `[` / `]` call the existing page actions from the store; stop at first and last page.
- [x] `R` uses the existing refresh action (same as `RefreshButton.jsx`).
- [x] `L` toggles the existing `body.light` theme code.

### Step 6: Cheat-sheet dialog
- [x] `ShortcutsDialog.jsx` (reads `shortcuts.js`), opened by `?`, closed by `Esc` or `?`.
- [x] Add a small "Keyboard shortcuts (?)" entry to the Topbar menu so it can be found without knowing the key. Hidden on phone.

### Step 7: Key hints on buttons
- [x] Small `kbd` hints on the Add Expense, Search, Chat, Refresh and Sidebar controls. Tablet and desktop only, hidden on phone. Skip if the user chooses "cheat-sheet only".

### Step 8: Verify against the draft
- [ ] Run the app. Compare each screen with the draft at phone, tablet and desktop width, dark and light. Tick the checklist, list any difference.
- [ ] Hand-test rules 1 to 10 (typing in search, a dialog open, Ctrl/Cmd held, empty list, last page, phone width).
- [ ] `npm run build` passes.

### Step 9: Wrap up
- [ ] Update this plan's status line.
- [x] Add lessons to a skill: `.claude/skills/add-keyboard-shortcuts/SKILL.md`.
- [x] Update the current UI Artifact with the cheat-sheet dialog.
- [ ] Report "Matches the approved draft: yes" or the approved differences.
- [ ] Give the commit line `[FRONTEND] - ...`.

## Files expected to change

New: `src/utils/shortcuts.js`, `src/hooks/useKeyboardShortcuts.js`, `src/components/ShortcutsDialog.jsx`.
Edited: `Dashboard.jsx`, `ExpenseTable.jsx`, `Topbar.jsx`, `Pagination.jsx` or the store (page actions), `index.css` (hint and highlight styles).

## Risks (my guesses, to check while building)

- Single-letter keys can clash with the browser's "find as you type" or with screen readers. Guard: typing guard plus modifier guard. Test in Chrome and Firefox.
- `Space` on a highlighted row may scroll the page. Call `preventDefault` only when a row is highlighted.
- Highlight state inside `ExpenseTable` may be hard to reach from the hook. Decide in Step 4.

## Problems log

- 2026-11-11, user test: (1) Esc did not close the New Account dialog (it and Edit Entry and Confirm have no Esc handler): `escape` handler now closes them, and works from inside fields. (2) No way to move between accounts: added `J` / `K`. (3) Enter on a highlighted entry only collapsed the day: now opens the edit dialog. (4) `E` opened the drawer with nothing focused: autofocus Amount, Enter moves to Description, Enter or Ctrl+Enter submits.
- Space as an expand key clashes with the existing double-Space chat shortcut in `Dashboard.jsx`: dropped, `Enter` only.
- Existing dialogs handle their own Esc and there is no shared dialog flag, so the hook detects open overlays by their CSS classes (`.dialog-overlay`, `.drawer-overlay`, `.chat-dialog-overlay`, `.insights-modal-backdrop`, `.alert-center`). A new dialog with a different overlay class must be added to that list.
- Day-row expand state moved from `ExpenseTable` local state to the store (`openExpenseIds`) so `O` and `Enter` can expand rows.
- `O` assumes the first item of `filteredExpensesList` is the newest. To verify in the browser.
- `S` only does something at 860px or narrower (the sidebar is always visible above that); wider screens get a hint toast.
