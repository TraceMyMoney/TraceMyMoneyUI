import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { X } from "lucide-react";
import { useStore, fmtNum } from "../store/useStore.js";

/**
 * Right-hand half of the split workspace. It charts exactly the rows the
 * expense list is showing (store.filteredExpensesList), so every search,
 * filter, bank switch or page change updates it. It never fetches anything.
 */

const CAT_COLORS = [
  "var(--acid)",
  "var(--blue)",
  "var(--green)",
  "var(--purple)",
  "var(--red)",
];
const OTHER_COLOR = "var(--ink-5)";
const MAX_SLICES = 5;
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// created_at is "DD/MM/YYYY"
function shortDate(created) {
  const s = created || "";
  const m = MONTHS[parseInt(s.slice(3, 5), 10) - 1] || "";
  return `${s.slice(0, 2)} ${m}`;
}

// "DD/MM/YYYY" -> "02 Oct 2025"
function fullDate(created) {
  const s = created || "";
  return `${shortDate(s)} ${s.slice(6, 10)}`.trim();
}

const TOOLTIP_STYLE = {
  background: "var(--ink-3)",
  border: "1px solid var(--line-mid)",
  borderRadius: 8,
  color: "var(--text)",
  fontSize: 12,
};
const TICK = { fill: "var(--muted)", fontSize: 10 };

function Panel({ title, sub, children }) {
  return (
    <section className="insights-panel">
      <h3 className="insights-panel-title">{title}</h3>
      <p className="insights-panel-sub">{sub}</p>
      <div className="insights-panel-body">{children}</div>
    </section>
  );
}

export default function ExpenseInsights({ onClose }) {
  const { filteredExpensesList, entryTags, privacyMode, setAnalyticsOpen } =
    useStore();

  const money = (n) => (privacyMode ? "••••" : `₹${fmtNum(n)}`);

  const { days, byTag, spent, entryCount, topTag } = useMemo(() => {
    const tagName = new Map(entryTags.map((t) => [t.value, t.title]));
    // Oldest -> newest by real date (created_at is "DD/MM/YYYY"), not by the
    // order the API happened to return, so bars line up with the dates.
    const key = (e) => {
      const c = e.created_at || "";
      return `${c.slice(6, 10)}${c.slice(3, 5)}${c.slice(0, 2)}`;
    };
    const rows = [...filteredExpensesList]
      .reverse()
      .map((e, i) => ({ e, i }))
      .sort((a, b) => (key(a.e) < key(b.e) ? -1 : key(a.e) > key(b.e) ? 1 : a.i - b.i))
      .map((x) => x.e);
    const multiYear = new Set(rows.map((e) => (e.created_at || "").slice(6, 10))).size > 1;
    const multiBank = new Set(rows.map((e) => e.bank_name)).size > 1;
    const days = rows.map((exp) => ({
      // one bar per row, exactly the value in the list's Spent column
      label:
        shortDate(exp.created_at) +
        (multiYear ? ` '${(exp.created_at || "").slice(8, 10)}` : ""),
      full: fullDate(exp.created_at) + (multiBank ? ` · ${exp.bank_name}` : ""),
      spent: exp.expense_total || 0,
      balance: exp.remaining_amount_till_now || 0,
    }));

    const tagTotals = new Map();
    let entryCount = 0;
    rows.forEach((exp) =>
      (exp.expenses || []).forEach((item) => {
        if (!(item.amount > 0)) return; // debits only
        entryCount += 1;
        const ids = item.entry_tags?.length ? item.entry_tags : [null];
        ids.forEach((id) => {
          const name = id == null ? "Untagged" : tagName.get(id) || "Untagged";
          tagTotals.set(name, (tagTotals.get(name) || 0) + item.amount);
        });
      }),
    );
    let byTag = [...tagTotals]
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
    const topTag = byTag[0]?.name || "-";
    if (byTag.length > MAX_SLICES) {
      const rest = byTag.slice(MAX_SLICES).reduce((s, r) => s + r.total, 0);
      byTag = [...byTag.slice(0, MAX_SLICES), { name: "Other", total: rest }];
    }
    const spent = days.reduce((s, d) => s + d.spent, 0);
    return { days, byTag, spent, entryCount, topTag };
  }, [filteredExpensesList, entryTags]);

  const tagTotal = byTag.reduce((s, r) => s + r.total, 0);
  const colorFor = (name, i) =>
    name === "Other" ? OTHER_COLOR : CAT_COLORS[i % CAT_COLORS.length];

  const tiles = [
    ["Spent", money(spent)],
    ["Entries", entryCount],
    ["Avg / day", days.length ? money(Math.round(spent / days.length)) : money(0)],
    ["Top tag", topTag],
  ];

  const tooltipValue = (v) => money(v);
  const tooltipLabel = (label, payload) => payload?.[0]?.payload?.full || label;

  return (
    <aside className="insights" aria-label="Charts for the visible expenses">
      <div className="insights-tiles">
        {tiles.map(([k, v]) => (
          <div className="insights-tile" key={k}>
            <div className="insights-tile-k">{k}</div>
            <div className="insights-tile-v">{v}</div>
          </div>
        ))}
        <button
          type="button"
          className="insights-close"
          onClick={() => (onClose ? onClose() : setAnalyticsOpen(false))}
          aria-label="Close analytics"
          title="Close analytics"
        >
          <X size={16} />
        </button>
      </div>

      <Panel title="Spending by day" sub="Daily debits of the visible rows">
        {days.length === 0 ? (
          <div className="insights-empty">Nothing to chart</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={days} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--line-mid)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={TICK}
                tickLine={false}
                axisLine={{ stroke: "var(--line-mid)" }}
                interval="preserveStartEnd"
                minTickGap={18}
              />
              <YAxis
                tick={privacyMode ? false : TICK}
                tickLine={false}
                axisLine={false}
                width={privacyMode ? 8 : 44}
              />
              <Tooltip
                formatter={tooltipValue}
                labelFormatter={tooltipLabel}
                contentStyle={TOOLTIP_STYLE}
                cursor={{ fill: "var(--acid-dim)" }}
              />
              <Bar
                dataKey="spent"
                name="Spent"
                fill="var(--acid)"
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>

      <Panel title="Spend by tag" sub="Share of visible debits">
        {byTag.length === 0 ? (
          <div className="insights-empty">No tagged spending</div>
        ) : (
          <div className="insights-donut">
            <div className="insights-donut-chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byTag}
                    dataKey="total"
                    nameKey="name"
                    innerRadius="62%"
                    outerRadius="92%"
                    paddingAngle={2}
                    stroke="var(--ink-2)"
                    strokeWidth={2}
                  >
                    {byTag.map((r, i) => (
                      <Cell key={r.name} fill={colorFor(r.name, i)} />
                    ))}
                  </Pie>
                  <Tooltip formatter={tooltipValue} contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="insights-donut-center">
                <strong>{money(tagTotal)}</strong>
                <span>spent</span>
              </div>
            </div>
            <ul className="insights-legend">
              {byTag.map((r, i) => (
                <li key={r.name}>
                  <i style={{ background: colorFor(r.name, i) }} />
                  <span className="insights-legend-name">{r.name}</span>
                  <b>
                    {money(r.total)} · {Math.round((r.total / tagTotal) * 100)}%
                  </b>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>

      <Panel title="Running balance" sub="Remaining after each visible day">
        {days.length < 2 ? (
          <div className="insights-empty">Needs two or more days</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={days} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--line-mid)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={TICK}
                tickLine={false}
                axisLine={{ stroke: "var(--line-mid)" }}
                interval="preserveStartEnd"
                minTickGap={18}
              />
              <YAxis
                tick={privacyMode ? false : TICK}
                tickLine={false}
                axisLine={false}
                width={privacyMode ? 8 : 44}
              />
              <Tooltip
                formatter={tooltipValue}
                labelFormatter={tooltipLabel}
                contentStyle={TOOLTIP_STYLE}
              />
              <Area
                type="monotone"
                dataKey="balance"
                name="Balance"
                stroke="var(--acid)"
                strokeWidth={2}
                fill="var(--acid)"
                fillOpacity={0.12}
                dot={{ r: 3, fill: "var(--acid)", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Panel>
    </aside>
  );
}
