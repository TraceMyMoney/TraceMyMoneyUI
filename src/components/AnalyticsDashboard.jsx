import React, { useEffect, useMemo, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import { useStore } from "../store/useStore.js";
import TagSearchSelect from "./TagSearchSelect.jsx";
import { BarChart3, X, TrendingUp, Landmark, Tags, Filter, Sun, Moon } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

// Fixed categorical order (never cycled per-request) - identity stays
// attached to the slot index, not to rank, so a filtered-down list of
// banks/tags doesn't repaint the survivors. Beyond 5 entries the rest
// fold into a muted "Other" bucket rather than generating a new hue.
const CAT_COLORS = [
  "var(--acid)",
  "var(--blue)",
  "var(--green)",
  "var(--purple)",
  "var(--red)",
];
const OTHER_COLOR = "var(--ink-5)";
const MAX_SLICES = 5;

function foldOther(rows, labelKey) {
  const sorted = [...rows].sort((a, b) => b.total - a.total);
  if (sorted.length <= MAX_SLICES) return sorted;
  const head = sorted.slice(0, MAX_SLICES);
  const rest = sorted.slice(MAX_SLICES);
  const otherTotal = rest.reduce((s, r) => s + r.total, 0);
  return [...head, { [labelKey]: "Other", total: otherTotal }];
}

function fmtDate(iso, withYear = false) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(
    undefined,
    withYear ? { year: "2-digit", month: "short", day: "numeric" } : { month: "short", day: "numeric" },
  );
}

// Below this many points, a point every ~14-18px stays legible and
// accurately hoverable; past it the chart scrolls horizontally instead of
// compressing points to a couple px apart (where the dot under the cursor
// and the one the tooltip reports stop being the same point).
const DENSE_POINT_THRESHOLD = 40;
const MIN_PX_PER_POINT = 16;

function fmtMoney(n) {
  return `₹${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

// Default view is the trailing 30 days, not all-time - opening Analytics
// on a long-lived account would otherwise aggregate years of entries into
// one chart before the person has even looked at it.
function defaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);
  return [start, end];
}

// Quick date-range presets, offered inside the date picker's own popup
// (per the dataviz skill: a date-range control is a list of preset rows,
// with custom range still reachable behind the calendar itself).
const DATE_PRESETS = [
  {
    label: "Last 7 days",
    range: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 6);
      return [start, end];
    },
  },
  {
    label: "Last 30 days",
    range: () => defaultDateRange(),
  },
  {
    label: "Month to date",
    range: () => {
      const end = new Date();
      const start = new Date(end.getFullYear(), end.getMonth(), 1);
      return [start, end];
    },
  },
  {
    label: "Last month",
    range: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return [start, end];
    },
  },
  {
    label: "Year to date",
    range: () => {
      const end = new Date();
      const start = new Date(end.getFullYear(), 0, 1);
      return [start, end];
    },
  },
  {
    label: "All time",
    range: () => [null, null],
  },
];

// Local-date (not UTC) "YYYY-MM-DD" - avoids the off-by-one a date picked
// near midnight can get from toISOString() shifting to UTC.
function toISODate(d) {
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ChartCard({ icon: Icon, title, subtitle, children, height = 260, scrollMinWidth }) {
  return (
    <div className="analytics-card">
      <div className="analytics-card-head">
        <Icon size={16} />
        <div>
          <div className="analytics-card-title">{title}</div>
          {subtitle && <div className="analytics-card-sub">{subtitle}</div>}
        </div>
      </div>
      {scrollMinWidth ? (
        // Many daily points squeezed into a fixed width put dots only a
        // couple of px apart - the hovered tooltip and the dot the cursor
        // looks like it's over stop being the same point. Giving each
        // point a minimum pixel width and scrolling instead keeps hover
        // accurate rather than silently misleading.
        <div style={{ width: "100%", height, overflowX: "auto" }}>
          <div style={{ minWidth: scrollMinWidth, height: "100%" }}>{children}</div>
        </div>
      ) : (
        <div style={{ width: "100%", height }}>{children}</div>
      )}
    </div>
  );
}

function EmptyState({ label }) {
  return <div className="analytics-empty">No {label} data yet - add a few expenses first.</div>;
}

export default function AnalyticsDashboard() {
  const {
    analyticsOpen,
    setAnalyticsOpen,
    analyticsData,
    analyticsLoading,
    fetchAnalytics,
    entryTags,
    bankItems,
    isDarkMode,
    updateUserPreferences,
  } = useStore();

  const [bankIds, setBankIds] = useState([]);
  const [tagIds, setTagIds] = useState([]);
  const [excludeTagIds, setExcludeTagIds] = useState([]);
  const [dateRange, setDateRange] = useState(defaultDateRange);
  const [start, end] = dateRange;
  const datePickerRef = useRef(null);
  const [keyword, setKeyword] = useState("");
  const [defaultStart, defaultEnd] = useMemo(defaultDateRange, []);
  const isDefaultRange =
    toISODate(start) === toISODate(defaultStart) && toISODate(end) === toISODate(defaultEnd);
  const hasActiveFilters =
    bankIds.length > 0 ||
    tagIds.length > 0 ||
    excludeTagIds.length > 0 ||
    keyword.trim().length > 0 ||
    !isDefaultRange;

  const runFetch = (overrides = {}) => {
    // "in" checks, not `??` - an explicit null/empty override (clearing the
    // date picker or the keyword box) must stick, not fall back to the
    // still-current state (which `??` would do, since both are nullish/
    // falsy-adjacent).
    fetchAnalytics({
      bankIds: "bankIds" in overrides ? overrides.bankIds : bankIds,
      tagIds: "tagIds" in overrides ? overrides.tagIds : tagIds,
      excludeTagIds: "excludeTagIds" in overrides ? overrides.excludeTagIds : excludeTagIds,
      startDate: toISODate("start" in overrides ? overrides.start : start),
      endDate: toISODate("end" in overrides ? overrides.end : end),
      keyword: "keyword" in overrides ? overrides.keyword : keyword,
    });
  };

  useEffect(() => {
    if (analyticsOpen) runFetch();
  }, [analyticsOpen]);

  const applyDatePreset = (presetRange) => {
    const [s, e] = presetRange();
    setDateRange([s, e]);
    runFetch({ start: s, end: e });
    datePickerRef.current?.setOpen(false);
  };

  const resetFilters = () => {
    const [defStart, defEnd] = defaultDateRange();
    setBankIds([]);
    setTagIds([]);
    setExcludeTagIds([]);
    setKeyword("");
    setDateRange([defStart, defEnd]);
    runFetch({
      bankIds: [],
      tagIds: [],
      excludeTagIds: [],
      start: defStart,
      end: defEnd,
      keyword: "",
    });
  };

  const byBank = useMemo(() => foldOther(analyticsData?.by_bank || [], "bank_name"), [analyticsData]);
  const byTag = useMemo(() => foldOther(analyticsData?.by_tag || [], "tag_name"), [analyticsData]);
  const daily = useMemo(() => {
    const rows = analyticsData?.daily || [];
    const spansYears =
      rows.length > 0 &&
      new Date(rows[0].date).getFullYear() !== new Date(rows[rows.length - 1].date).getFullYear();
    return rows.map((d) => ({ ...d, label: fmtDate(d.date, spansYears) }));
  }, [analyticsData]);
  const dailyScrollMinWidth =
    daily.length > DENSE_POINT_THRESHOLD ? daily.length * MIN_PX_PER_POINT : undefined;

  const totalSpend = useMemo(
    () => (analyticsData?.daily || []).reduce((s, d) => s + d.total, 0),
    [analyticsData],
  );
  const topBank = byBank[0]?.bank_name || "-";
  const topTag = byTag[0]?.tag_name || "-";

  if (!analyticsOpen) return null;

  return (
    <div className="inline-view" aria-labelledby="analytics-title">
      <div className="admin-page-inner analytics-page-inner">
        <div className="admin-page-header">
          <div className="dialog-icon acid">
            <BarChart3 size={20} />
          </div>
          <div>
            <div id="analytics-title" className="dialog-title">
              Analytics
            </div>
            <div className="dialog-sub">How your spending breaks down</div>
          </div>
          <button
            type="button"
            className="icon-btn analytics-theme-toggle"
            onClick={() => updateUserPreferences({ is_dark_mode: !isDarkMode })}
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            className="dialog-close admin-page-close"
            onClick={() => setAnalyticsOpen(false)}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="admin-page-content">
          <div className="analytics-mobile-blocked">
            <BarChart3 size={28} />
            <div className="analytics-mobile-blocked-title">Analytics needs a bigger screen</div>
            <div className="analytics-mobile-blocked-sub">
              The charts and filters aren't built for mobile yet - open this on a tablet or
              desktop instead.
            </div>
          </div>
          <div className="analytics-page-body">
          <div className="analytics-filters-head">
            <Filter size={13} /> Filters
          </div>
          <div className="analytics-filters">
            <div className="search-field-group">
              <label className="search-field-label">Keyword</label>
              <div className="search-input-wrap">
                <input
                  className="search-input"
                  placeholder="Search descriptions..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runFetch({ keyword: e.target.value })}
                  onBlur={() => runFetch({ keyword })}
                />
                {keyword && (
                  <button
                    type="button"
                    onClick={() => {
                      setKeyword("");
                      runFetch({ keyword: "" });
                    }}
                    style={{
                      padding: "0 8px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--faint)",
                      fontSize: 16,
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
            <div className="search-field-group">
              <label className="search-field-label">Accounts</label>
              <TagSearchSelect
                tags={bankItems}
                selected={bankIds}
                onChange={(v) => {
                  setBankIds(v);
                  runFetch({ bankIds: v });
                }}
                placeholder="All accounts"
                zIndex={620}
              />
            </div>
            <div className="search-field-group">
              <label className="search-field-label">Include tags</label>
              <TagSearchSelect
                tags={entryTags}
                selected={tagIds}
                onChange={(v) => {
                  const nextExclude = excludeTagIds.filter((id) => !v.includes(id));
                  setTagIds(v);
                  setExcludeTagIds(nextExclude);
                  runFetch({ tagIds: v, excludeTagIds: nextExclude });
                }}
                placeholder="All tags"
                zIndex={620}
              />
            </div>
            <div className="search-field-group">
              <label className="search-field-label">Exclude tags</label>
              <TagSearchSelect
                tags={entryTags}
                selected={excludeTagIds}
                onChange={(v) => {
                  const nextInclude = tagIds.filter((id) => !v.includes(id));
                  setExcludeTagIds(v);
                  setTagIds(nextInclude);
                  runFetch({ excludeTagIds: v, tagIds: nextInclude });
                }}
                placeholder="None excluded"
                zIndex={620}
              />
            </div>
            <div className="search-field-group">
              <label className="search-field-label">Date range</label>
              <DatePicker
                ref={datePickerRef}
                className="analytics-date-input"
                wrapperClassName="analytics-date-wrapper"
                selectsRange
                startDate={start}
                endDate={end}
                onChange={([s, e]) => {
                  setDateRange([s, e]);
                  if (s && e) runFetch({ start: s, end: e });
                  if (!s && !e) runFetch({ start: null, end: null });
                }}
                maxDate={new Date()}
                placeholderText="All time"
                dateFormat="dd/MM/yyyy"
                isClearable
              >
                <div className="analytics-date-presets">
                  {DATE_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      className="analytics-date-preset-btn"
                      onClick={() => applyDatePreset(p.range)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </DatePicker>
            </div>
            {hasActiveFilters && (
              <button type="button" className="reset-btn active analytics-filter-reset" onClick={resetFilters}>
                ↺ Reset
              </button>
            )}
          </div>

          {analyticsLoading && !analyticsData ? (
            <div className="analytics-empty">Loading your analytics...</div>
          ) : (
            <>
              <div className="admin-stat-grid">
                <div className="admin-stat-tile">
                  <div className="admin-stat-label">Total Spend</div>
                  <div className="admin-stat-value">{fmtMoney(totalSpend)}</div>
                </div>
                <div className="admin-stat-tile">
                  <div className="admin-stat-label">Top Bank</div>
                  <div className="admin-stat-value">{topBank}</div>
                </div>
                <div className="admin-stat-tile">
                  <div className="admin-stat-label">Top Tag</div>
                  <div className="admin-stat-value">{topTag}</div>
                </div>
              </div>

              <div className="analytics-grid">
                <ChartCard
                  icon={TrendingUp}
                  title="Spending over time"
                  subtitle="Daily, all banks"
                  scrollMinWidth={dailyScrollMinWidth}
                >
                  {daily.length === 0 ? (
                    <EmptyState label="daily spend" />
                  ) : (
                    <ResponsiveContainer>
                      <LineChart data={daily} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke="var(--line-mid)" vertical={false} />
                        <XAxis
                          dataKey="label"
                          stroke="var(--line-mid)"
                          tick={{ fill: "var(--muted)", fontSize: 11 }}
                          axisLine={{ stroke: "var(--line-mid)" }}
                          tickLine={false}
                        />
                        <YAxis
                          stroke="var(--line-mid)"
                          tick={{ fill: "var(--muted)", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          width={48}
                        />
                        <Tooltip
                          formatter={(v) => fmtMoney(v)}
                          contentStyle={{
                            background: "var(--ink-3)",
                            border: "1px solid var(--line-mid)",
                            borderRadius: 8,
                            color: "var(--text)",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="total"
                          stroke="var(--acid)"
                          strokeWidth={2}
                          dot={{ r: 3, fill: "var(--acid)" }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>

                <ChartCard icon={Landmark} title="Spend by bank" subtitle="Total debits per account">
                  {byBank.length === 0 ? (
                    <EmptyState label="bank" />
                  ) : (
                    <ResponsiveContainer>
                      <BarChart
                        data={byBank}
                        layout="vertical"
                        margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
                      >
                        <CartesianGrid stroke="var(--line-mid)" horizontal={false} />
                        <XAxis
                          type="number"
                          stroke="var(--line-mid)"
                          tick={{ fill: "var(--muted)", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="bank_name"
                          stroke="var(--line-mid)"
                          tick={{ fill: "var(--muted)", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          width={90}
                        />
                        <Tooltip
                          formatter={(v) => fmtMoney(v)}
                          contentStyle={{
                            background: "var(--ink-3)",
                            border: "1px solid var(--line-mid)",
                            borderRadius: 8,
                            color: "var(--text)",
                          }}
                        />
                        <Bar dataKey="total" fill="var(--acid)" radius={[0, 4, 4, 0]} maxBarSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>

                <ChartCard icon={Tags} title="Spend by tag" subtitle="Share of total spend" height={300}>
                  {byTag.length === 0 ? (
                    <EmptyState label="tag" />
                  ) : (
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={byTag}
                          dataKey="total"
                          nameKey="tag_name"
                          innerRadius="55%"
                          outerRadius="85%"
                          paddingAngle={2}
                          stroke="var(--ink-2)"
                          strokeWidth={2}
                        >
                          {byTag.map((entry, i) => (
                            <Cell
                              key={entry.tag_name}
                              fill={entry.tag_name === "Other" ? OTHER_COLOR : CAT_COLORS[i % CAT_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v) => fmtMoney(v)}
                          contentStyle={{
                            background: "var(--ink-3)",
                            border: "1px solid var(--line-mid)",
                            borderRadius: 8,
                            color: "var(--text)",
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          formatter={(v) => <span style={{ color: "var(--text)" }}>{v}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>
              </div>
            </>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
