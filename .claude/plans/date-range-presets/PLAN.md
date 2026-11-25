# PLAN: Date range presets

Status: steps 1-6 built, `npm run build` passes, preset logic checked in node. Step 7 (look at it in the browser against the draft) not done yet. Branch `FRONTEND-FEATURE-date-range-presets` from `origin/master` d2b8a69. Spec: `SPEC.md`.

## UI steps start here
Approved draft: https://claude.ai/artifact/7grDBofYBTxnXxjsLrh3aC, approved 2026-11-25 (second round: tablet, light, phone sheet added; phone top area itself unchanged).

Checklist from the draft (dark values; light uses `body.light` variables):
- Label "DATE RANGE" (12px, uppercase, letter-spacing 1px, muted).
- Row: dropdown (170px wide, 44px high, radius 8, 15px text, chevron icon) then the calendar field (230px, DM Mono 14px, x to clear). Gap 8px. Wraps when full; on phone stacked, dropdown above calendar.
- Dropdown closed: field background `--ink-4`, border `--line-mid`; focus/open: acid border and acid text.
- Menu: width 170px, background `--ink-3`, border `--line-str`, radius 8, padding 6, rows 10px padding, order: This week, This month, This year, All time, divider, Custom...
- Selected row: acid text, `--acid-dim` background, check mark. Hover row: `--ink-5`.
- Calendar shows "dd/MM/yyyy - dd/MM/yyyy", placeholder "All time" when empty.

## Steps
1. [x] Helper `src/utils/dateRangePresets.js`: range for each preset, detect which preset a range is, `isDefaultRange`.
2. [x] Shared `DateRangeField.jsx` (dropdown + existing DatePicker, handles first-click pending state) and CSS.
3. [x] Store: default `searchSelectedDaterange` = this month; `fetchExpenses` sends the default-only request as advanced + current account + `and`.
4. [x] Wire `InsightsFilterBar.jsx` (range counts as a filter only if not the default; Reset -> this month).
5. [x] Wire `SearchPanel.jsx` (local state from store; search and Reset).
6. [x] `MobileTopArea.jsx`: "filters on" and Reset use the same default rule.
7. [ ] Run for real: dark and light, desktop, tablet, phone widths; compare with the draft; `npm run build:prod`.
8. [ ] Wrap up: status line, lessons into a skill if any, `CLAUDE.md` if the project changed.

## Problems log
- 2026-11-25: backend ignores `search_by_daterange` unless `advanced_search` is true, so "this month by default" is built as an advanced request scoped to the sidebar account (no backend change).
- 2026-11-25: I first said the phone needed a new control; wrong, the phone Filters button already opens `SearchPanel`.
- 2026-11-25: on the first of a month (or Jan 1) two presets give the same dates, so the dropdown shows the first match ("This month" before "This year"). Harmless.
- 2026-11-25: the phone hero numbers (Spent / Top-up) sum `filteredExpensesList`, so with the default they now cover this month only. Needs the user's call.
- 2026-11-25: user saw the built version and said the CSS did not match the other filter controls. Sizes changed from the draft (44px high, 15px body text) to the app's existing controls (36px high, 12px mono, `--r-sm` radius, `--ink-4` field, rows-select style menu). The draft Artifact still shows the old sizes and needs updating.
