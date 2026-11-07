import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import DatePicker from "react-datepicker";
import { useStore } from "../store/useStore.js";
import TagSearchSelect from "./TagSearchSelect.jsx";

const PAGE_SIZES = [5, 10, 15, 20, 50, "all"];

const sizeLabel = (p) => (p === "all" ? "All rows" : `${p} per page`);

function RowsSelect({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const away = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div className="rows-select" ref={ref}>
      <button
        type="button"
        className={`rows-select-btn${open ? " open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{sizeLabel(value)}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <ul className="rows-select-menu" role="listbox">
          {options.map((p) => (
            <li key={p} role="option" aria-selected={p === value}>
              <button
                type="button"
                className={p === value ? "sel" : ""}
                onClick={() => {
                  onChange(p);
                  setOpen(false);
                }}
              >
                <span>{sizeLabel(p)}</span>
                {p === value && <Check size={14} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Filter row shown above the split workspace. It drives the same store
 * search state as the Search / Filter dialog, so the expense list (left)
 * and the charts (right) always agree. Any change refetches page 1.
 */
export default function InsightsFilterBar() {
  const {
    entryTags,
    bankItems,
    searchSelectedTags,
    searchExcludeTags,
    defaultExcludedTags,
    searchSelectedBanks,
    searchEntryKeyword,
    searchSelectedDaterange,
    isAdvancedSearch,
    pageSize,
    setSearchSelectedTags,
    setSearchExcludeTags,
    setSearchSelectedBanks,
    setSearchEntryKeyword,
    setSearchSelectedDaterange,
    setAdvancedSearch,
    setPageSize,
    setPageNumber,
    fetchExpenses,
  } = useStore();

  const [keyword, setKeyword] = useState(searchEntryKeyword || "");
  const mounted = useRef(false);

  const run = () => {
    setPageNumber(1);
    fetchExpenses();
  };
  const markAdvanced = (next) => {
    const any =
      next.tags.length ||
      next.banks.length ||
      next.keyword.trim() ||
      next.range;
    setAdvancedSearch(!!any);
  };
  const current = () => ({
    tags: searchSelectedTags || [],
    excludeTags: searchExcludeTags || [],
    banks: searchSelectedBanks || [],
    keyword,
    range: searchSelectedDaterange,
  });

  // Keyword is debounced so typing doesn't refetch on every keystroke.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const t = setTimeout(() => {
      setSearchEntryKeyword(keyword.trim());
      markAdvanced({ ...current(), keyword });
      run();
    }, 450);
    return () => clearTimeout(t);
  }, [keyword]);

  // A tag can't be both included and excluded: picking it on one side
  // removes it from the other.
  const onTags = (v) => {
    const ex = (searchExcludeTags || []).filter((id) => !v.includes(id));
    setSearchSelectedTags(v);
    setSearchExcludeTags(ex);
    markAdvanced({ ...current(), tags: v, excludeTags: ex });
    run();
  };
  const onExcludeTags = (v) => {
    const inc = (searchSelectedTags || []).filter((id) => !v.includes(id));
    setSearchExcludeTags(v);
    setSearchSelectedTags(inc);
    markAdvanced({ ...current(), excludeTags: v, tags: inc });
    run();
  };
  const onBanks = (v) => {
    setSearchSelectedBanks(v);
    markAdvanced({ ...current(), banks: v });
    run();
  };
  const onRange = ([s, e]) => {
    if (s && e) {
      setSearchSelectedDaterange([s, e]);
      markAdvanced({ ...current(), range: [s, e] });
      run();
    } else if (!s && !e) {
      setSearchSelectedDaterange(null);
      markAdvanced({ ...current(), range: null });
      run();
    } else {
      // first click of a range: keep the picker open, fetch when complete
      setSearchSelectedDaterange(null);
      setPending([s, e]);
    }
  };
  const [pending, setPending] = useState(null);
  const range = searchSelectedDaterange || pending || [null, null];

  const reset = () => {
    setSearchSelectedTags([]);
    setSearchExcludeTags(defaultExcludedTags || []);
    setSearchSelectedBanks([]);
    setSearchEntryKeyword("");
    setSearchSelectedDaterange(null);
    setAdvancedSearch(false);
    setPending(null);
    setKeyword("");
    run();
  };

  return (
    <div className="insights-filters" role="search">
      <div className="insights-filter-field grow">
        <label className="search-field-label">Keyword</label>
        <div className="search-input-wrap">
          <input
            className="search-input"
            placeholder="Search descriptions…"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
      </div>
      <div className="insights-filter-field grow">
        <label className="search-field-label">Tags</label>
        <TagSearchSelect
          tags={entryTags}
          selected={searchSelectedTags || []}
          onChange={onTags}
          placeholder="All tags"
          zIndex={620}
          summary
        />
      </div>
      <div className="insights-filter-field grow">
        <label className="search-field-label">Exclude tags</label>
        <TagSearchSelect
          tags={entryTags}
          selected={searchExcludeTags || []}
          onChange={onExcludeTags}
          placeholder="None excluded"
          zIndex={620}
          summary
        />
      </div>
      <div className="insights-filter-field grow">
        <label className="search-field-label">Accounts</label>
        <TagSearchSelect
          tags={bankItems}
          selected={searchSelectedBanks || []}
          onChange={onBanks}
          placeholder="Selected account"
          zIndex={620}
          summary
        />
      </div>
      <div className="insights-filter-field">
        <label className="search-field-label">Date range</label>
        <DatePicker
          selectsRange
          startDate={range[0]}
          endDate={range[1]}
          onChange={onRange}
          maxDate={new Date()}
          placeholderText="All time"
          dateFormat="dd/MM/yyyy"
          isClearable
          className="search-input insights-date-input"
        />
      </div>
      <div className="insights-filter-field">
        <label className="search-field-label">Rows</label>
        <RowsSelect
          value={pageSize}
          options={PAGE_SIZES}
          onChange={(v) => {
            setPageSize(v);
            run();
          }}
        />
      </div>
      <button
        type="button"
        className={`reset-btn${isAdvancedSearch ? " active" : ""}`}
        onClick={reset}
      >
        ↺ Reset
      </button>
    </div>
  );
}
