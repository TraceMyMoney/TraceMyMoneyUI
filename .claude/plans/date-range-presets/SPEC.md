# SPEC: Date range presets (This week / This month / This year)

Approved design draft: https://claude.ai/artifact/7grDBofYBTxnXxjsLrh3aC (approved by the user, 2026-11-25, after a second round that added tablet, light mode and the phone filters sheet).

## What
A preset dropdown beside the calendar in the date-range filter. Options: This week, This month, This year, All time, Custom.

- Presets are calendar periods ending today: week = Monday to today, month = 1st to today, year = Jan 1 to today.
- Picking a preset sets the start and end dates at that moment (no store shape change, no API change).
- Picking dates by hand in the calendar shows "Custom". Clearing the calendar (the x) shows "All time".
- Default on first load and after Reset: "This month".

## Where
- `InsightsFilterBar.jsx` (analytics / split workspace filter bar).
- `SearchPanel.jsx` (search dialog; on phone it opens from the sliders button in `MobileTopArea`).
- One shared component. `MobileTopArea.jsx` gets no new control; only its "filters on" logic and Reset change.
- Tablet and desktop layouts stay as they are; the dropdown shares the row with the calendar and wraps when full (stacks above it on a narrow phone).

## Rules
- The default is "this month for the account selected in the sidebar". The backend only applies the date range in advanced search mode and ignores it in plain mode, so when only the default range is set (no user filters), the UI sends an advanced request with `search_by_bank_ids = [current account]`, `operator = and`, and the dates. No backend change.
- "Filters on" (phone strip, sliders dot) and `isAdvancedSearch` must not turn on just because of the default "This month". A range that is not the "This month" preset counts as a filter.
- Existing behavior for tags, accounts, keyword, excluded tags stays the same.
- Light and dark mode both supported (CSS variables from `index.css`).

## Out of scope
Backend changes, new date presets beyond the three, saving the chosen preset between sessions, rolling windows (last 7 days), other screens that do not read the date filter.

## Done means
- The dropdown works in both places, in dark and light, on desktop, tablet and phone widths.
- On load the list shows only this month's entries for the selected account.
- Reset returns to "This month"; the x gives "All time"; manual dates give "Custom".
- "Filters on" does not show for the default.
- `npm run build:prod` passes; checked against the approved draft (see PLAN).
