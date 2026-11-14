import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import DatePicker from "react-datepicker";
import { Sparkles } from "lucide-react";
import { useStore, filterValidExpenses } from "../store/useStore.js";
import TagSearchSelect from "./TagSearchSelect.jsx";
import { usePhoneScreen } from "../useWideScreen.js";
import { cleanAmount, blockNegativeKey } from "../utils/amount.js";

// Same dynamic dev-mode fallback as useStore.js/ChatAssistantDialog.jsx.
const BASE_URL = (
  import.meta.env.VITE_TM_BACKEND_URL ||
  (import.meta.env.DEV
    ? `http://${window.location.hostname}:5000`
    : "https://api.stalk-my-money.in/")
).replace(/\/?$/, "");

const SUGGEST_DEBOUNCE_MS = 600;

export default function AddExpenseDrawer({ open, onClose }) {
  const {
    currentSelectedBankId,
    banksList,
    entryTags,
    setExpenseEntryCreationDate,
    submitExpense,
  } = useStore();
  const phone = usePhoneScreen(); // no autofocus on phones: it pops the keyboard before the drawer is seen
  const [date, setDate] = useState(new Date());
  const [entries, setEntries] = useState([
    { amount: "", description: "", tags: [], type: "debit" },
  ]);
  // Tag suggested by Jev (TypeSafe AI) for each entry's description, keyed
  // by entry index - {tag_name, confidence} | undefined. Purely advisory;
  // the suggest endpoint returns an empty body whenever Jev isn't
  // configured, so this silently does nothing in that case.
  const [suggestions, setSuggestions] = useState({});
  const suggestTimers = useRef({});

  // Reset entries + date when drawer opens
  useEffect(() => {
    if (open) {
      setDate(new Date());
      setEntries([{ amount: "", description: "", tags: [], type: "debit" }]);
      setSuggestions({});
    }
  }, [open]);

  // Clear any pending debounce timers on unmount
  useEffect(() => {
    const timers = suggestTimers.current;
    return () => Object.values(timers).forEach(clearTimeout);
  }, []);

  const fetchTagSuggestion = (index, description) => {
    clearTimeout(suggestTimers.current[index]);
    if (!description.trim() || entryTags.length === 0) {
      setSuggestions((s) => ({ ...s, [index]: undefined }));
      return;
    }
    suggestTimers.current[index] = setTimeout(async () => {
      try {
        const r = await axios.post(`${BASE_URL}/entry-tags/suggest`, {
          description,
        });
        if (r.data?.tag_name) {
          setSuggestions((s) => ({ ...s, [index]: r.data }));
        } else {
          setSuggestions((s) => ({ ...s, [index]: undefined }));
        }
      } catch {
        // Advisory only - a failed suggestion is silently ignored.
      }
    }, SUGGEST_DEBOUNCE_MS);
  };

  const addEntry = () =>
    setEntries((e) => [
      ...e,
      { amount: "", description: "", tags: [], type: "debit" },
    ]);
  const removeEntry = (i) => {
    setEntries((e) => e.filter((_, j) => j !== i));
    setSuggestions((s) => {
      const next = { ...s };
      delete next[i];
      return next;
    });
  };
  const updateEntry = (i, k, v) =>
    setEntries((e) =>
      e.map((en, j) => {
        if (j !== i) return en;
        // The Debit / Credit chip alone decides the sign; amounts are never negative.
        return { ...en, [k]: k === "amount" ? cleanAmount(v) : v };
      }),
    );

  const applySuggestedTag = (index) => {
    const suggestion = suggestions[index];
    const tag = entryTags.find((t) => t.title === suggestion?.tag_name);
    if (!tag) return;
    setEntries((e) =>
      e.map((en, j) =>
        j === index && !en.tags.includes(tag.value)
          ? { ...en, tags: [...en.tags, tag.value] }
          : en,
      ),
    );
    setSuggestions((s) => ({ ...s, [index]: undefined }));
  };

  const submit = async () => {
    if (!currentSelectedBankId) return;
    const d = new Date(date);
    setExpenseEntryCreationDate(
      `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} 00:00`,
    );
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
    const ok = await submitExpense({
      bank_id: currentSelectedBankId,
      expenses: valid,
    });
    if (ok) {
      setEntries([{ amount: "", description: "", tags: [], type: "debit" }]);
      onClose?.();
    }
  };

  // Derive the currently selected bank name for display
  const selectedBank = banksList.find(
    (b) => b.bankId === currentSelectedBankId,
  );

  if (!open) return null;
  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div
        className="drawer"
        onKeyDown={(e) => {
          // Ctrl/Cmd + Enter submits from any field.
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            submit();
          }
        }}
      >
        <div className="drawer-header">
          <div className="drawer-title">
            Add <span>Expense</span>
          </div>
          <button className="drawer-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="drawer-body">
          {/* Selected bank — read-only display */}
          {selectedBank && (
            <div className="d-bank-display">
              <div className="d-bank-dot" />
              <span className="d-bank-name">{selectedBank.bankName}</span>
            </div>
          )}

          {/* Date */}
          <div>
            <label className="d-label">Date</label>
            <DatePicker
              selected={date}
              onChange={(d) => setDate(d)}
              maxDate={new Date()}
              dateFormat="dd/MM/yyyy"
            />
          </div>

          {/* Entries */}
          <div>
            <label className="d-label">Entries</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {entries.map((en, i) => (
                <div key={i} className="d-entry-card">
                  {/* Debit / Credit toggle */}
                  <div className="entry-type-toggle">
                    <button
                      type="button"
                      className={`entry-type-btn${en.type === "debit" ? " entry-type-btn--debit active" : ""}`}
                      onClick={() => updateEntry(i, "type", "debit")}
                    >
                      Debit
                    </button>
                    <button
                      type="button"
                      className={`entry-type-btn${en.type === "credit" ? " entry-type-btn--credit active" : ""}`}
                      onClick={() => updateEntry(i, "type", "credit")}
                    >
                      Credit
                    </button>
                  </div>
                  <div className="d-entry-row">
                    <input
                      className="d-entry-input"
                      type="number"
                      min="0"
                      placeholder="Amount"
                      value={en.amount}
                      autoFocus={!phone && i === entries.length - 1}
                      onChange={(e) => updateEntry(i, "amount", e.target.value)}
                      onKeyDown={(e) => {
                        blockNegativeKey(e);
                        // Enter moves on to the description of the same entry.
                        if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
                          e.preventDefault();
                          e.currentTarget.closest(".d-entry-row")?.querySelector(".desc")?.focus();
                        }
                      }}
                    />
                    <input
                      className="d-entry-input desc"
                      placeholder="Description"
                      value={en.description}
                      onChange={(e) => {
                        const v = e.target.value;
                        updateEntry(i, "description", v);
                        fetchTagSuggestion(i, v);
                      }}
                      onKeyDown={(e) => {
                        // Enter in the description submits (Tab goes on to the tags instead).
                        if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
                          e.preventDefault();
                          submit();
                        }
                      }}
                    />
                    <button
                      tabIndex={-1}
                      className="d-entry-del"
                      onClick={() => removeEntry(i)}
                    >
                      ×
                    </button>
                  </div>
                  {suggestions[i] &&
                    !en.tags.includes(
                      entryTags.find((t) => t.title === suggestions[i].tag_name)
                        ?.value,
                    ) && (
                      <button
                        type="button"
                        className="d-tag-suggestion-chip"
                        onClick={() => applySuggestedTag(i)}
                        title="Suggested by Jev (TypeSafe AI)"
                      >
                        <Sparkles size={12} />
                        Tag as "{suggestions[i].tag_name}"?
                      </button>
                    )}
                  {entryTags.length > 0 && (
                    <div className="d-entry-tags-field">
                      <label className="d-label d-label-inline">Tags</label>
                      <TagSearchSelect
                        tags={entryTags}
                        selected={en.tags}
                        onChange={(next) => updateEntry(i, "tags", next)}
                      />
                    </div>
                  )}
                </div>
              ))}
              <button className="d-add-entry-btn" onClick={addEntry}>
                ＋ Add Another Entry
              </button>
            </div>
          </div>
        </div>
        <div className="drawer-footer">
          <button className="d-btn d-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="d-btn d-btn-primary" onClick={submit}>
            Submit →
            <kbd className="kb-hint" aria-hidden="true">Ctrl ↵</kbd>
          </button>
        </div>
      </div>
    </>
  );
}
