import React, { useState } from "react";
import { useStore, fmtNum, filterValidExpenses } from "../store/useStore.js";
import { Trash2, Tag, ChevronDown } from "lucide-react";
import { usePhoneScreen } from "../useWideScreen.js";
import TagSearchSelect from "./TagSearchSelect.jsx";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const monthName = (m) => MONTHS[parseInt(m, 10) - 1] || "";

/* ── Inline add entries (shared desktop + mobile) ── */
function InlineAddEntries({ expenseId, mini }) {
  const { entryTags, submitExpenseEntry } = useStore();
  const [entries, setEntries] = useState([]);
  const add = () =>
    setEntries((e) => [
      ...e,
      { amount: "", description: "", tags: [], type: "debit" },
    ]);
  const remove = (i) => setEntries((e) => e.filter((_, j) => j !== i));
  const update = (i, k, v) =>
    setEntries((e) =>
      e.map((en, j) => {
        if (j !== i) return en;
        const updated = { ...en, [k]: v };
        // Auto-switch toggle when a negative/positive amount is typed
        if (k === "amount" && v !== "" && v !== "-") {
          updated.type = Number(v) < 0 ? "credit" : "debit";
        }
        return updated;
      }),
    );
  const submit = async () => {
    const valid = filterValidExpenses(
      entries.map((e) => ({
        amount:
          e.type === "credit"
            ? -Math.abs(Number(e.amount))
            : Math.abs(Number(e.amount)),
        description: e.description,
        entry_tags: e.tags,
      })),
    );
    if (!valid.length) return;
    const ok = await submitExpenseEntry(expenseId, valid);
    if (ok) setEntries([]);
  };
  const padClass = mini ? "mobile-inline-add" : "inline-add-entries";
  return (
    <div className={padClass}>
      {entries.map((en, i) => (
        <div key={i} className="inline-entry-card">
          <div className="entry-type-toggle entry-type-toggle--inline">
            <button
              type="button"
              className={`entry-type-btn${en.type === "debit" ? " entry-type-btn--debit active" : ""}`}
              onClick={() => update(i, "type", "debit")}
            >
              Debit
            </button>
            <button
              type="button"
              className={`entry-type-btn${en.type === "credit" ? " entry-type-btn--credit active" : ""}`}
              onClick={() => update(i, "type", "credit")}
            >
              Credit
            </button>
          </div>
          <div className="inline-entry-row">
            <input
              className="inline-input"
              type="number"
              placeholder="Amount"
              value={en.amount}
              onChange={(e) => update(i, "amount", e.target.value)}
            />
            <input
              className="inline-input desc"
              placeholder="Description"
              value={en.description}
              onChange={(e) => update(i, "description", e.target.value)}
            />
            <button
              className="inline-remove-btn"
              aria-label="Remove entry"
              onClick={() => remove(i)}
            >
              ×
            </button>
          </div>
          {entryTags.length > 0 && (
            <div style={{ marginBottom: 10, width: "100%" }}>
              <TagSearchSelect
                tags={entryTags}
                selected={en.tags}
                onChange={(next) => update(i, "tags", next)}
              />
            </div>
          )}
        </div>
      ))}
      <div className="inline-actions">
        <button className="inline-add-btn" onClick={add}>
          ＋ Add Entry
        </button>
        {entries.length > 0 && (
          <button className="inline-save-btn" onClick={submit}>
            Save →
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Desktop table row ── */
function DesktopRow({ exp, open, onToggle, onEditEntry }) {
  const { privacyMode, deleteExpense, deleteExpenseEntry, requestConfirm } =
    useStore();
  const day = (exp.created_at || "").slice(0, 2);
  const mon = monthName((exp.created_at || "").slice(3, 5));
  const yr = (exp.created_at || "").slice(6, 10);
  const [hovEnt, setHovEnt] = useState(null);

  return (
    <div className="expense-group">
      <div className={`expense-row${open ? " open" : ""}`} onClick={onToggle}>
        {open && <div className="expense-row-accent" />}
        {/* Date */}
        <div className="exp-date-cell">
          <div className={`exp-date-day${open ? " active" : ""}`}>{day}</div>
          <div>
            <div className="exp-date-mon">{mon}</div>
            <div className="exp-date-yr">{yr}</div>
          </div>
        </div>
        {/* Meta */}
        <div>
          <div className="exp-meta-bank">
            <div className="exp-meta-dot" />
            {exp.bank_name}
          </div>
          <div className="exp-meta-day">{exp.day}</div>
        </div>
        {/* Preview tags — hidden on tablet */}
        <div className="exp-previews exp-preview-col"></div>
        {/* Topup — hidden on tablet/mobile */}
        <div className="exp-amt exp-remaining-col">
          {exp.topup_expense_total < 0 ? (
            <div className="exp-amt-main" style={{ color: "var(--green)" }}>
              {privacyMode
                ? "••••"
                : `+₹${fmtNum(Math.abs(exp.topup_expense_total))}`}
            </div>
          ) : (
            <div
              className="exp-amt-main"
              style={{ color: "var(--faint)", fontSize: 18 }}
            >
              —
            </div>
          )}
        </div>
        {/* Spent */}
        <div className="exp-amt">
          <div className="exp-amt-main" style={{ color: "var(--red)" }}>
            {privacyMode ? "••••" : `₹${fmtNum(exp.expense_total)}`}
          </div>
        </div>
        {/* Remaining */}
        <div className="exp-amt exp-remaining-col" style={{ marginRight: 12 }}>
          <div className="exp-amt-main">
            {privacyMode ? "••••" : `₹${fmtNum(exp.remaining_amount_till_now)}`}
          </div>
        </div>
        {/* Actions */}
        <div className="exp-chev-wrap">
          <button
            className="exp-del-btn"
            onClick={async (e) => {
              e.stopPropagation();
              if (await requestConfirm("Delete this expense?"))
                deleteExpense(exp.id);
            }}
          >
            <Trash2 size={16} />
          </button>
          <div className={`exp-chev${open ? " open" : ""}`}>▾</div>
        </div>
      </div>

      {open && (
        <div className="entries-panel">
          {(exp.expenses || []).map((item) => (
            <div
              key={item.ee_id}
              className="entry-row"
              onMouseEnter={() => setHovEnt(item.ee_id)}
              onMouseLeave={() => setHovEnt(null)}
            >
              {/* col 1 — date spacer */}
              <div />
              {/* col 2 — Description + tag icon */}
              <div
                className="entry-desc-wrap"
                onClick={() => onEditEntry({ ...item, expenseId: exp.id })}
              >
                <span className="entry-desc">{item.description}</span>
                {item.entry_tags?.length > 0 && (
                  <Tag
                    color="#5C970B"
                    size={11}
                    className="entry-tagged-icon"
                    style={{ flexShrink: 0, marginLeft: 5 }}
                  />
                )}
              </div>
              {/* col 3 — preview spacer */}
              <div className="exp-preview-col" />
              {/* col 4 — top-up spacer */}
              <div className="exp-remaining-col" />
              {/* col 5 — Amount (Spent column) */}
              <div
                className="entry-amt-val"
                style={{
                  color: item.amount < 0 ? "var(--green)" : "var(--red)",
                }}
              >
                {item.amount < 0
                  ? `+₹${fmtNum(Math.abs(item.amount))}`
                  : `₹${fmtNum(item.amount)}`}
              </div>
              {/* col 6 — remaining spacer */}
              <div className="exp-remaining-col" />
              {/* col 7 — Delete */}
              <button
                className="entry-del-btn"
                style={{ opacity: hovEnt === item.ee_id ? 1 : 0 }}
                onClick={async () => {
                  if (await requestConfirm("Delete this entry?"))
                    deleteExpenseEntry(exp.id, item.ee_id);
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <InlineAddEntries expenseId={exp.id} />
        </div>
      )}
    </div>
  );
}

/* ── Mobile card ── */
function MobileCard({ exp, open, onToggle, onEditEntry }) {
  const { privacyMode, deleteExpense, deleteExpenseEntry, requestConfirm } =
    useStore();
  const day = (exp.created_at || "").slice(0, 2);
  const mon = monthName((exp.created_at || "").slice(3, 5));
  const yr = (exp.created_at || "").slice(6, 10);

  return (
    <div className={`expense-card${open ? " open" : ""}`} onClick={onToggle}>
      <div className="expense-card-top">
        <div className="expense-card-date">
          <div className="expense-card-day">{day}</div>
          <div className="expense-card-mon">{mon}</div>
          <div className="expense-card-yr">{yr}</div>
        </div>
        <div className="expense-card-body">
          <div className="expense-card-bank">
            <div className="exp-meta-dot" />
            {exp.bank_name}
          </div>
          <div className="expense-card-amounts">
            {exp.topup_expense_total < 0 && (
              <div className="expense-card-amt-group">
                <span className="expense-card-amt-label">Top-up</span>
                <span
                  className="expense-card-amt"
                  style={{ color: "var(--green)", fontSize: 15 }}
                >
                  {privacyMode
                    ? "••••"
                    : `+₹${fmtNum(Math.abs(exp.topup_expense_total))}`}
                </span>
              </div>
            )}
            <div className="expense-card-amt-group">
              <span className="expense-card-amt-label">Spent</span>
              <span
                className="expense-card-amt"
                style={{ color: "var(--red)" }}
              >
                {privacyMode ? "••••" : `₹${fmtNum(exp.expense_total)}`}
              </span>
            </div>
            <div className="expense-card-amt-group">
              <span className="expense-card-amt-label">Remaining</span>
              <span className="expense-card-amt">
                ₹{privacyMode ? "••••" : fmtNum(exp.remaining_amount_till_now)}
              </span>
            </div>
          </div>
        </div>
        <div
          className="expense-card-actions"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="mobile-exp-del-btn"
            onClick={async () => {
              if (await requestConfirm("Delete this expense?"))
                deleteExpense(exp.id);
            }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {open && (
        <div
          className="mobile-entries-panel"
          onClick={(e) => e.stopPropagation()}
        >
          {(exp.expenses || []).map((item) => (
            <div key={item.ee_id} className="mobile-entry-item">
              {/* Description + tag icon — flex row so icon sits inline */}
              <div
                className="mobile-entry-desc-wrap"
                onClick={() => onEditEntry({ ...item, expenseId: exp.id })}
              >
                <span className="mobile-entry-desc">{item.description}</span>
                {item.entry_tags?.length > 0 && (
                  <Tag
                    color="#5C970B"
                    size={11}
                    style={{ flexShrink: 0, marginLeft: 4 }}
                  />
                )}
              </div>
              {/* Amount */}
              <div
                className="mobile-entry-amt"
                style={{
                  color: item.amount < 0 ? "var(--green)" : "var(--red)",
                }}
              >
                {item.amount < 0
                  ? `+₹${fmtNum(Math.abs(item.amount))}`
                  : `₹${fmtNum(item.amount)}`}
              </div>
              {/* Delete — always visible on mobile (no hover state) */}
              <button
                className="mobile-entry-del-btn"
                onClick={async () => {
                  if (await requestConfirm("Delete this entry?"))
                    deleteExpenseEntry(exp.id, item.ee_id);
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <InlineAddEntries expenseId={exp.id} mini />
        </div>
      )}
    </div>
  );
}

/* ── Phone day card (≤600px only; tablet and desktop use the rows/cards above) ── */
const FULL_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function PhoneDayCard({ exp, open, onToggle, onEditEntry }) {
  const { privacyMode, entryTags, deleteExpense, deleteExpenseEntry, requestConfirm } =
    useStore();
  const day = (exp.created_at || "").slice(0, 2);
  const mon = monthName((exp.created_at || "").slice(3, 5));
  const money = (n) => (privacyMode ? "••••" : `₹${fmtNum(n)}`);
  const entries = exp.expenses || [];
  const tagName = (id) => entryTags.find((t) => t.value === id)?.title;
  const topup = Math.abs(exp.topup_expense_total || 0);

  return (
    <div className={`m-card${open ? " open" : ""}`}>
      <button
        type="button"
        className="m-card-head"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="m-date">
          <b>{day}</b>
          <i>{mon}</i>
        </span>
        <span className="m-main">
          <span className="m-title">{exp.day}</span>
          <span className="m-sub">
            {exp.bank_name} · {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </span>
        </span>
        <span className="m-amts">
          <span className="m-spent">{money(exp.expense_total)}</span>
          {topup > 0 && (
            <span className="m-topup">{privacyMode ? "••••" : `+₹${fmtNum(topup)}`}</span>
          )}
          <span className="m-rem">bal {money(exp.remaining_amount_till_now)}</span>
        </span>
        <ChevronDown className="m-chev" size={18} aria-hidden="true" />
      </button>

      {open && (
        <div className="m-body">
          {entries.map((item) => (
            <div key={item.ee_id} className="m-entry">
              <button
                type="button"
                className="m-entry-main"
                onClick={() => onEditEntry({ ...item, expenseId: exp.id })}
              >
                <span className="m-entry-desc">{item.description}</span>
                {item.entry_tags?.length > 0 && (
                  <span className="m-tags">
                    {item.entry_tags.map((id) => (
                      <span key={id} className="m-tag">
                        {tagName(id) || "tag"}
                      </span>
                    ))}
                  </span>
                )}
              </button>
              <span className={`m-entry-amt ${item.amount < 0 ? "m-pos" : "m-neg"}`}>
                {item.amount < 0
                  ? privacyMode ? "••••" : `+₹${fmtNum(Math.abs(item.amount))}`
                  : money(item.amount)}
              </span>
              <button
                type="button"
                className="m-entry-del"
                aria-label="Delete entry"
                onClick={async () => {
                  if (await requestConfirm("Delete this entry?"))
                    deleteExpenseEntry(exp.id, item.ee_id);
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <InlineAddEntries expenseId={exp.id} mini />
          <button
            type="button"
            className="m-day-del"
            onClick={async () => {
              if (await requestConfirm("Delete this expense?")) deleteExpense(exp.id);
            }}
          >
            <Trash2 size={14} /> Delete this day
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Main component ── */
export default function ExpenseTable({ onEditEntry }) {
  const { filteredExpensesList, privacyMode } = useStore();
  const phone = usePhoneScreen();

  // Compute totals from only the currently visible page
  const pageTotalSpent = filteredExpensesList.reduce(
    (sum, exp) => sum + (exp.expense_total || 0),
    0,
  );
  const pageTotalTopup = filteredExpensesList.reduce(
    (sum, exp) => sum + Math.abs(exp.topup_expense_total || 0),
    0,
  );
  const [openRows, setOpenRows] = useState(new Set());

  const toggle = (id) =>
    setOpenRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  if (!filteredExpensesList.length)
    return (
      <div className="table-area">
        <div className="table-empty">
          <div className="table-empty-rupee">₹</div>
          <div className="table-empty-title">No records found</div>
          <div className="table-empty-sub">
            Add your first expense using the button above
          </div>
        </div>
      </div>
    );

  return (
    <div className="table-area">
      {/* Desktop table header */}
      <div className="table-head">
        <div className="th">Date</div>
        <div className="th">Details</div>
        <div className="th exp-preview-col"></div>
        <div className="th right exp-remaining-col">Top-up</div>
        <div className="th right">Spent</div>
        <div className="th right exp-remaining-col">Remaining</div>
        <div />
      </div>

      {filteredExpensesList.map((exp, idx) => {
        if (!phone) return null;
        const mk = (e) => (e.created_at || "").slice(3, 10);
        const prev = filteredExpensesList[idx - 1];
        const showMonth = !prev || mk(prev) !== mk(exp);
        const monthLabel = `${FULL_MONTHS[parseInt((exp.created_at || "").slice(3, 5), 10) - 1] || ""} ${(exp.created_at || "").slice(6, 10)}`;
        return (
          <React.Fragment key={exp.id}>
            {showMonth && <div className="m-month">{monthLabel}</div>}
            <PhoneDayCard
              exp={exp}
              open={openRows.has(exp.id)}
              onToggle={() => toggle(exp.id)}
              onEditEntry={onEditEntry}
            />
          </React.Fragment>
        );
      })}

      {!phone && filteredExpensesList.map((exp) => (
        <React.Fragment key={exp.id}>
          {/* Desktop row */}
          <DesktopRow
            exp={exp}
            open={openRows.has(exp.id)}
            onToggle={() => toggle(exp.id)}
            onEditEntry={onEditEntry}
          />
          {/* Mobile card — CSS shows/hides via media query */}
          <MobileCard
            exp={exp}
            open={openRows.has(exp.id)}
            onToggle={() => toggle(exp.id)}
            onEditEntry={onEditEntry}
          />
        </React.Fragment>
      ))}

      {/* ── Totals footer (phones show these totals in the balance card instead) ── */}
      {!phone && filteredExpensesList.length > 0 && (
        <>
          {/* Desktop totals row */}
          <div className="expense-totals-row">
            <div className="expense-totals-label">Total</div>
            <div />
            <div className="exp-preview-col" />
            <div className="expense-totals-cell expense-totals-topup exp-remaining-col">
              {pageTotalTopup > 0 ? (
                <span>
                  {privacyMode ? "••••" : `+₹${fmtNum(pageTotalTopup)}`}
                </span>
              ) : (
                <span style={{ color: "var(--faint)" }}>—</span>
              )}
            </div>
            <div className="expense-totals-cell expense-totals-spent">
              {privacyMode ? "••••" : `₹${fmtNum(pageTotalSpent)}`}
            </div>
            <div className="exp-remaining-col" />
            <div />
          </div>

          {/* Mobile totals card */}
          <div className="expense-totals-mobile">
            <span className="expense-totals-mobile__label">Total</span>
            <div className="expense-totals-mobile__vals">
              {pageTotalTopup > 0 && (
                <span className="expense-totals-mobile__topup">
                  {privacyMode ? "••••" : `+₹${fmtNum(pageTotalTopup)}`}
                </span>
              )}
              <span className="expense-totals-mobile__spent">
                {privacyMode ? "••••" : `₹${fmtNum(pageTotalSpent)}`}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
