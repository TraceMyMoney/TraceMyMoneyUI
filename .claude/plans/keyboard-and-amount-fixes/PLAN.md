# Keyboard and amount fixes: PLAN

Spec: `SPEC.md` (same folder). Branch: `FRONTEND-BUG-keyboard-delete-credit-bank-nav-focus` (from `origin/master` 9434cca).
Status: CODE WRITTEN, `npm run build` passes. NOT hand-tested in a browser. Spec and plan were written after the code (process slip, see Problems log).

No design draft: bug fixes only (CLAUDE.md: tiny changes need no draft).

## Steps
### Step 1: Delete shortcut (point 1)
- [x] `src/utils/shortcuts.js`: add `deleteItem` / `d`.
- [x] `Dashboard.jsx`: `deleteHighlighted()` with confirm, then move the highlight to a surviving neighbour.
- [ ] Hand-test: day row, entry, cancel, last row, typing in a field.

### Step 2: Positive-only amounts (point 2)
- [x] New `src/utils/amount.js` (`cleanAmount`, `blockNegativeKey`).
- [x] `AddExpenseDrawer.jsx` and `ExpenseTable.jsx` (`InlineAddEntries`): remove the auto-switch of the chip, strip `-`, `min="0"`.
- [ ] Hand-test: Credit then type; paste `-5`; Submit sends a negative value for Credit only.

### Step 3: Arrow vs limit flag (point 3)
- [x] `index.css`: arrow `left: 10px` on `.kb-active.limit-crossed`.
- [ ] Look at it on desktop and tablet, dark and light.

### Step 4: Bank navigation (point 4)
- [x] Found J / K already exist; added a `J / K` hint in the Sidebar "Accounts" label.
- [ ] Ask the user why J / K were not working or not found; bind other keys only if they ask.

### Step 5: Focus Amount on Add Entry (point 5)
- [x] `InlineAddEntries`: `autoFocus` on the last entry's Amount.
- [ ] Hand-test with the Enter key on the button, desktop and tablet card.

### Step 7: Arrow keys in the delete popup (point 6, added 2026-11-14, plan written before code)
- [x] `ConfirmDialog.jsx`: refs on both buttons; a document keydown listener while open: Left focuses Cancel, Right focuses Delete, `preventDefault` + `stopPropagation`.
- [x] Keep `autoFocus` on Delete.
- [x] `index.css`: Cancel had no focus style, so the selection was invisible. Added an `--acid` focus ring to both buttons (found while building; logged below). `npm run build` passes.
- [ ] Hand-test: mouse click, Esc, Left / Right / Enter, popup opened with the `D` shortcut and with the trash icon.

### Step 8: Points 3 and 5 again (2026-11-14, plan written before code)
- [ ] `index.css`: hide `.expense-row-accent` on `.limit-crossed` rows (red flag wins).
- [ ] `kbCursor.js`: `ADD_ENTRY` sentinel; `flattenCursorItems` adds it after each open day's entries.
- [ ] `ExpenseTable.jsx`: cursor-cleanup effect allows the sentinel; "Add Entry" button gets `data-add-entry`, highlight class and `data-kb-active` (scroll into view); passed from DesktopRow and MobileCard.
- [ ] `Dashboard.jsx`: `toggleRow` (Enter) on the sentinel clicks the visible Add Entry button; `deleteHighlighted` and `editHighlightedEntry` ignore the sentinel.
- [ ] `index.css`: arrow and ring for the highlighted Add Entry button.
- [ ] Build passes; hand-test as in the spec.

### Step 6: Wrap up
- [x] `add-keyboard-shortcuts` skill updated (D exception, amount rule).
- [ ] Add "Check before saying done" lesson: write spec and plan first (below).
- [ ] Update the UI Artifact cheat-sheet artboard with `D` and the `J / K` hint.
- [ ] User tests, then commits.

## Files changed
`src/utils/amount.js` (new), `src/utils/shortcuts.js`, `src/components/Dashboard.jsx`, `AddExpenseDrawer.jsx`, `ExpenseTable.jsx`, `Sidebar.jsx`, `src/index.css`, `.claude/skills/add-keyboard-shortcuts/SKILL.md`.

## Problems log
- 2026-11-14: I read the code and edited it without writing a spec and plan first, against the CLAUDE.md "New feature flow". Fixed by writing both afterwards. Rule for next time: for any multi-point request, SPEC and PLAN come before the first edit, even for bug batches.
- 2026-11-14: `npm` in the WSL shell resolved to Windows npm (UNC path error). Build was run with WSL's node directly: `wsl -d Ubuntu --cd <UI dir> -- /home/parimal/.nvm/versions/node/v24.16.0/bin/node node_modules/vite/bin/vite.js build`.
- 2026-11-14: Point 4 ("no bank navigation") did not match the code: J / K exist in master. Cause of the user's experience unknown (my guess: not discoverable, or a toast/dialog was open, which blocks all shortcuts).
- 2026-11-14, point 6: the Cancel button had no focus style, so moving focus to it would look like nothing happened. Added the ring in `index.css`.
- Skill said "Never bind delete"; the user explicitly asked for `D`, so it is bound with a confirm and the skill line was changed.
