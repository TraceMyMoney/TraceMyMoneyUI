import React, { useState } from "react";
import DatePicker from "react-datepicker";
import { useStore } from "../store/useStore.js";
import TagSearchSelect from "./TagSearchSelect.jsx";

const PAGE_SIZES = [5, 10, 15, 20, "ALL"];

export default function SearchPanel({ open, onClose }) {
  const {
    entryTags,
    bankItems,
    searchSelectedTags,
    searchSelectedBanks,
    pageSize,
    isAdvancedSearch,
    setSearchSelectedTags,
    setSearchSelectedBanks,
    setSearchEntryKeyword,
    setSearchSelectedDaterange,
    setSearchOperator,
    setPageSize,
    setPageNumber,
    setAdvancedSearch,
    fetchExpenses,
  } = useStore();

  const [keyword, setKeyword] = useState("");
  const [dateRange, setDateRange] = useState([null, null]);
  const [start, end] = dateRange;

  const search = () => {
    setAdvancedSearch(true);
    setSearchEntryKeyword(keyword);
    if (start && end) setSearchSelectedDaterange([start, end]);
    fetchExpenses();
    onClose?.();
  };

  const reset = () => {
    setSearchSelectedTags([]);
    setSearchSelectedBanks([]);
    setSearchEntryKeyword("");
    setSearchSelectedDaterange(null);
    setSearchOperator("and");
    setAdvancedSearch(false);
    setPageNumber(1);
    setKeyword("");
    setDateRange([null, null]);
    fetchExpenses();
  };

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog-panel wide search-dialog-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="search-dialog-title"
      >
        <div className="dialog-header">
          <div className="dialog-icon acid">🔍</div>
          <div>
            <div id="search-dialog-title" className="dialog-title">
              Filter Expenses
            </div>
            <div className="dialog-sub">
              Narrow results by tag, account, keyword or date
            </div>
          </div>
          <button
            className="dialog-close"
            onClick={onClose}
            aria-label="Close filters"
          >
            ×
          </button>
        </div>

        <div className="dialog-body">
          <div className="search-grid">
            {/* Filter by Tag */}
            <div className="search-field-group">
              <label className="search-field-label">Filter by Tag</label>
              <TagSearchSelect
                tags={entryTags}
                selected={searchSelectedTags}
                onChange={setSearchSelectedTags}
                placeholder="Search tags to filter…"
                zIndex={650}
              />
            </div>

            {/* Filter by Account */}
            <div className="search-field-group">
              <label className="search-field-label">Filter by Account</label>
              <TagSearchSelect
                tags={bankItems}
                selected={searchSelectedBanks}
                onChange={setSearchSelectedBanks}
                placeholder="Search accounts to filter…"
                zIndex={650}
              />
            </div>

            {/* Keyword */}
            <div className="search-field-group">
              <label className="search-field-label">Keyword</label>
              <div className="search-input-wrap">
                <input
                  className="search-input"
                  placeholder="Search descriptions..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && search()}
                />
                {keyword && (
                  <button
                    onClick={() => {
                      setKeyword("");
                      setSearchEntryKeyword("");
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

            {/* Date Range */}
            <div className="search-field-group">
              <label className="search-field-label">Date Range</label>
              <DatePicker
                selectsRange
                startDate={start}
                endDate={end}
                onChange={([s, e]) => setDateRange([s, e])}
                maxDate={new Date()}
                placeholderText="Select range..."
                dateFormat="dd/MM/yyyy"
                isClearable
              />
            </div>
          </div>

          <div className="search-controls">
            <select
              className="page-size-select"
              value={pageSize}
              onChange={(e) => {
                setPageSize(
                  e.target.value === "ALL" ? "all" : Number(e.target.value),
                );
                setPageNumber(1);
                fetchExpenses();
              }}
            >
              {PAGE_SIZES.map((p) => (
                <option key={p} value={p}>
                  {p} per page
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="dialog-footer">
          <button
            className={`reset-btn${isAdvancedSearch ? " active" : ""}`}
            onClick={reset}
          >
            ↺ Reset
          </button>
          <button className="search-btn" onClick={search}>
            Search →
          </button>
        </div>
      </div>
    </div>
  );
}
