import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, SlidersHorizontal, Tag, Plus, X, RotateCcw } from "lucide-react";
import { useStore, fmtNum } from "../store/useStore.js";

/**
 * Phone-only header block: account chips, a balance card for the selected
 * account and a search row. It replaces the desktop command bar, which has
 * no room for these on a phone. Rendered only below 601px (see Dashboard).
 */

const COLORS = ["var(--acid)", "var(--blue)", "var(--green)", "var(--purple)", "var(--red)"];

const buzz = () => {
  try {
    navigator.vibrate?.(8);
  } catch {
    /* not supported */
  }
};

export default function MobileTopArea({ onOpenFilter, onOpenTag }) {
  const {
    banksList,
    currentSelectedBankId,
    filteredExpensesList,
    privacyMode,
    isAdvancedSearch,
    searchEntryKeyword,
    searchSelectedTags,
    searchSelectedBanks,
    searchSelectedDaterange,
    defaultExcludedTags,
    setSearchSelectedTags,
    setSearchExcludeTags,
    setSearchSelectedBanks,
    setSearchEntryKeyword,
    setSearchSelectedDaterange,
    setAdvancedSearch,
    setSearchScopeToCurrentBank,
    setCreateBankDialogVisible,
    setPageNumber,
    fetchExpenses,
  } = useStore();

  const [keyword, setKeyword] = useState(searchEntryKeyword || "");
  const mounted = useRef(false);
  const railRef = useRef(null);
  const chipRefs = useRef({});

  // On a phone an empty Accounts filter means "this account", not all.
  useEffect(() => {
    setSearchScopeToCurrentBank(true);
    return () => setSearchScopeToCurrentBank(false);
  }, [setSearchScopeToCurrentBank]);

  // Debounced keyword search over the selected account.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const t = setTimeout(() => {
      const kw = keyword.trim();
      setSearchEntryKeyword(kw);
      const any =
        kw ||
        (searchSelectedTags || []).length ||
        (searchSelectedBanks || []).length ||
        searchSelectedDaterange;
      setAdvancedSearch(!!any);
      setPageNumber(1);
      fetchExpenses();
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  // Keep the selected chip centred in the rail.
  useEffect(() => {
    const rail = railRef.current;
    const chip = chipRefs.current[currentSelectedBankId];
    if (!rail || !chip) return;
    const left = chip.offsetLeft - (rail.clientWidth - chip.clientWidth) / 2;
    rail.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [currentSelectedBankId, banksList.length]);

  const selectBank = (bank) => {
    if (bank.bankId === currentSelectedBankId) return;
    buzz();
    useStore.setState({ currentSelectedBankId: bank.bankId, pageNumber: 1 });
    fetchExpenses();
  };

  const current = banksList.find((b) => b.bankId === currentSelectedBankId);
  const currentIdx = Math.max(0, banksList.findIndex((b) => b.bankId === currentSelectedBankId));

  const { spent, topup } = useMemo(() => {
    let spent = 0;
    let topup = 0;
    filteredExpensesList.forEach((e) => {
      spent += e.expense_total || 0;
      topup += Math.abs(e.topup_expense_total || 0);
    });
    return { spent, topup };
  }, [filteredExpensesList]);

  const money = (n) => (privacyMode ? "••••" : `₹${fmtNum(n)}`);

  const filtersOn = isAdvancedSearch || !!keyword.trim();
  const resetFilters = () => {
    buzz();
    setSearchSelectedTags([]);
    setSearchExcludeTags(defaultExcludedTags || []);
    setSearchSelectedBanks([]);
    setSearchEntryKeyword("");
    setSearchSelectedDaterange(null);
    setAdvancedSearch(false);
    setKeyword("");
    setPageNumber(1);
    fetchExpenses();
  };

  return (
    <section className="m-top" aria-label="Accounts and search">
      <div className="m-rail" ref={railRef} role="tablist" aria-label="Accounts">
        {banksList.map((bank, i) => {
          const on = bank.bankId === currentSelectedBankId;
          return (
            <button
              key={bank.bankId}
              type="button"
              role="tab"
              aria-selected={on}
              ref={(el) => (chipRefs.current[bank.bankId] = el)}
              className={`m-chip${on ? " on" : ""}`}
              style={{ "--chip": COLORS[i % COLORS.length] }}
              onClick={() => selectBank(bank)}
            >
              <span className="m-chip-dot">{bank.bankName.charAt(0)}</span>
              <span className="m-chip-name">{bank.bankName}</span>
            </button>
          );
        })}
        <button
          type="button"
          className="m-chip m-chip-new"
          onClick={() => setCreateBankDialogVisible(true)}
          aria-label="New account"
        >
          <Plus size={16} />
        </button>
      </div>

      {current && (
        <div
          className="m-hero"
          style={{ "--chip": COLORS[currentIdx % COLORS.length] }}
        >
          <div className="m-hero-main">
            <span className="m-hero-label">{current.bankName} balance</span>
            <span className="m-hero-balance">{money(current.remainingBalance)}</span>
          </div>
          <div className="m-hero-stats">
            <div>
              <span className="m-hero-label">Spent</span>
              <b className="m-neg">{money(spent)}</b>
            </div>
            {topup > 0 && (
              <div>
                <span className="m-hero-label">Top-up</span>
                <b className="m-pos">{privacyMode ? "••••" : `+₹${fmtNum(topup)}`}</b>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="m-searchrow">
        <label className="m-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            inputMode="search"
            enterKeyHint="search"
            placeholder="Search expenses"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            aria-label="Search expenses"
          />
          {keyword && (
            <button
              type="button"
              className="m-search-clear"
              onClick={() => setKeyword("")}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </label>
        <button
          type="button"
          className={`m-iconbtn${filtersOn ? " on" : ""}`}
          onClick={onOpenFilter}
          aria-label="Filters"
        >
          <SlidersHorizontal size={18} />
          {filtersOn && <i className="m-dot" />}
        </button>
        <button type="button" className="m-iconbtn" onClick={onOpenTag} aria-label="New tag">
          <Tag size={18} />
        </button>
      </div>

      {filtersOn && (
        <div className="m-filterbar">
          <span>Filters on</span>
          <button type="button" onClick={resetFilters}>
            <RotateCcw size={12} /> Reset
          </button>
        </div>
      )}
    </section>
  );
}
