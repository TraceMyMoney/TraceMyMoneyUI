import { create } from "zustand";
import axios from "axios";

const BASE_URL =
  import.meta.env.VITE_TM_BACKEND_URL || "https://api.stalk-my-money.in/";
const ALL = "all";

// ── helpers ──────────────────────────────────────────────
function parseJwt(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(
      decodeURIComponent(
        window
          .atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join(""),
      ),
    );
  } catch {
    return null;
  }
}

function handleError(err) {
  // JSON.parse(err.request.response).detail
  if (err?.status === 401 || err?.response?.status === 401) {
    localStorage.removeItem("access_token");
    delete axios.defaults.headers.common["authorization"];
    return "Session expired. Please login again.";
  }
  if (err.request.response) {
    const errData = JSON.parse(err.request.response).detail;
    if (Array.isArray(errData)) {
      return errData[0].msg;
    }
    return errData;
  }
  if (Array.isArray(err?.response?.data?.errors)) {
    const e = err.response.data.errors[0];
    return Object.keys(e)
      .map((f) => `${f}: ${e[f]}`)
      .join(", ");
  }
  return err?.message || "Something went wrong";
}

export function formatMyDates(date) {
  if (!date) return "";
  const d = new Date(date);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export function filterValidExpenses(list) {
  return list
    .filter((e) => e.amount && e.description)
    .map((e) =>
      e.amount < 0
        ? {
            amount: e.amount,
            description: e.description,
            expense_entry_type: "ADD",
            entry_tags: e.entry_tags,
          }
        : e,
    );
}

export function fmtNum(v, privacy = false) {
  if (privacy) return "••••";
  if (v == null) return "0";
  return new Intl.NumberFormat("en-IN").format(Math.abs(Number(v)));
}

// ── init axios token ──────────────────────────────────────
export function initAxiosToken() {
  const token = localStorage.getItem("access_token");
  if (token) {
    axios.defaults.headers.common["authorization"] = token;
    return parseJwt(token);
  }
  return null;
}

// ── store ─────────────────────────────────────────────────
export const useStore = create((set, get) => ({
  // state
  userName: null,
  isLoggedIn: false,
  isDarkMode: true,
  privacyMode: false,
  showLoginPage: true,
  showLoader: false,
  showAlert: false,
  alertMessages: [],

  banksList: [],
  bankItems: [],
  banksDisplayOrder: [],
  currentSelectedBankId: null,

  filteredExpensesList: [],
  currentTotalExpenses: 0,
  currentTotalOfExpenses: 0,
  currentTotalOfTopupExpenses: 0,

  entryTags: [],
  pageNumber: 1,
  pageSize: 5,

  searchSelectedTags: [],
  searchSelectedBanks: [],
  searchEntryKeyword: "",
  searchSelectedDaterange: null,
  searchOperator: "and",
  isAdvancedSearch: false,

  isCreateBankDialogVisible: false,
  isApplyEntryTagVisible: false,
  applyTagEntry: null,
  selectedTags: [],

  expenseEntryCreationDate: (() => {
    const d = new Date();
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} 00:00`;
  })(),

  // ── setters ──────────────────────────────────────────────
  setUserName: (v) => set({ userName: v }),
  setLoggedInStatus: (v) => set({ isLoggedIn: v }),
  setLoginPageStatus: (v) => set({ showLoginPage: v }),
  setShowAlert: (v) => set({ showAlert: v }),
  setAlertMessages: (v) => set({ alertMessages: v }),
  setShowLoader: (v) => set({ showLoader: v }),
  setCreateBankDialogVisible: (v) => set({ isCreateBankDialogVisible: v }),
  setApplyEntryTagVisible: (v) => set({ isApplyEntryTagVisible: v }),
  setApplyTagEntry: (v) => set({ applyTagEntry: v }),
  setSelectedTags: (v) => set({ selectedTags: v }),
  setPageNumber: (v) => set({ pageNumber: v }),
  setPageSize: (v) => set({ pageSize: v }),
  setSearchSelectedTags: (v) => set({ searchSelectedTags: v }),
  setSearchSelectedBanks: (v) => set({ searchSelectedBanks: v }),
  setSearchEntryKeyword: (v) => set({ searchEntryKeyword: v }),
  setSearchSelectedDaterange: (v) => set({ searchSelectedDaterange: v }),
  setSearchOperator: (v) => set({ searchOperator: v }),
  setAdvancedSearch: (v) => set({ isAdvancedSearch: v }),
  setExpenseEntryCreationDate: (v) => set({ expenseEntryCreationDate: v }),
  setIsDarkMode: (v) => set({ isDarkMode: v }),
  setPrivacyMode: (v) => set({ privacyMode: v }),

  pushAlert(msg) {
    set((s) => ({ showAlert: true, alertMessages: [...s.alertMessages, msg] }));
  },

  // ── helpers ───────────────────────────────────────────────
  _parseExpenses(data) {
    const arr = [...data.expenses];
    const topup = data.topup_total ?? 0;
    const nonTopup = data.non_topup_total ?? 0;
    const total = data.total_expenses ?? 0;
    return { expenses: arr, topup, nonTopup, total };
  },

  // ── API actions ───────────────────────────────────────────
  async fetchBanks() {
    try {
      const r = await axios.get(`${BASE_URL}/banks/`);
      const banks = (r.data?.banks || []).map((e) => ({
        bankName: e.name,
        remainingBalance: e.current_balance,
        bankId: e.id,
      }));
      // Apply saved display order from state (persisted from prefs)
      const displayOrder = get().banksDisplayOrder;
      if (Array.isArray(displayOrder) && displayOrder.length > 0) {
        const orderMap = new Map(displayOrder.map((id, idx) => [id, idx]));
        banks.sort((a, b) => {
          const ai = orderMap.has(a.bankId) ? orderMap.get(a.bankId) : Infinity;
          const bi = orderMap.has(b.bankId) ? orderMap.get(b.bankId) : Infinity;
          return ai - bi;
        });
      }
      const bankItems = banks.map((e) => ({
        title: e.bankName,
        value: e.bankId,
      }));
      set({ banksList: banks, bankItems });
    } catch (err) {
      get().pushAlert(handleError(err));
    }
  },

  async getInitialData() {
    const s = get();
    if (!s.isLoggedIn) return;
    set({ showLoader: true });
    try {
      const [banksRes, prefsRes] = await Promise.all([
        axios.get(`${BASE_URL}/banks/`),
        axios.get(`${BASE_URL}/user-preferences/`),
      ]);
      const prefs = prefsRes?.data?.user_preferences ?? prefsRes?.data;
      console.log("[getInitialData] raw prefs response:", prefsRes?.data);
      console.log("[getInitialData] prefs resolved:", prefs);
      console.log(
        "[getInitialData] banks_display_order:",
        prefs?.banks_display_order,
      );
      const ps = prefs?.page_size ?? 5;
      const dark = prefs?.is_dark_mode ?? true;
      const privacy = prefs?.privacy_mode_enabled ?? false;
      if (dark) document.body.classList.remove("light");
      else document.body.classList.add("light");

      const banks = (banksRes.data?.banks || []).map((e) => ({
        bankName: e.name,
        remainingBalance: e.current_balance,
        bankId: e.id,
      }));
      const displayOrder = prefs?.banks_display_order ?? [];
      if (Array.isArray(displayOrder) && displayOrder.length > 0) {
        const orderMap = new Map(displayOrder.map((id, idx) => [id, idx]));
        banks.sort((a, b) => {
          const ai = orderMap.has(a.bankId) ? orderMap.get(a.bankId) : Infinity;
          const bi = orderMap.has(b.bankId) ? orderMap.get(b.bankId) : Infinity;
          return ai - bi;
        });
      }
      const bankItems = banks.map((e) => ({
        title: e.bankName,
        value: e.bankId,
      }));
      const selectedBankId = bankItems[0]?.value;

      set({
        banksList: banks,
        bankItems,
        banksDisplayOrder: displayOrder,
        currentSelectedBankId: selectedBankId,
        pageSize: ps,
        isDarkMode: dark,
        privacyMode: privacy,
      });

      if (selectedBankId) {
        const [expRes, tagRes] = await Promise.all([
          axios.get(`${BASE_URL}/expenses/`, {
            params: { bank_id: selectedBankId, per_page: ps },
          }),
          axios.get(`${BASE_URL}/entry-tags/`),
        ]);
        const { expenses, topup, nonTopup, total } = get()._parseExpenses(
          expRes.data || [],
        );
        const tags = (tagRes.data?.entry_tags || [])
          .map((e) => ({ title: e.name, value: e.id }))
          .sort((a, b) => a.title.localeCompare(b.title));
        set({
          filteredExpensesList: expenses,
          currentTotalOfTopupExpenses: topup,
          currentTotalOfExpenses: nonTopup,
          currentTotalExpenses: total,
          entryTags: tags,
        });
      }
    } catch (err) {
      get().pushAlert(handleError(err));
    } finally {
      set({ showLoader: false });
    }
  },

  async fetchFilteredExpensesList(bank) {
    set({ showLoader: true, currentSelectedBankId: bank.bankId });
    try {
      const s = get();
      const ps = s.pageSize === ALL ? s.currentTotalExpenses * 100 : s.pageSize;
      const r = await axios.get(`${BASE_URL}/expenses/`, {
        params: {
          per_page: ps,
          page_number: s.pageNumber,
          bank_id: bank.bankId,
        },
      });
      const { expenses, topup, nonTopup, total } = get()._parseExpenses(
        r.data || [],
      );
      set({
        filteredExpensesList: expenses,
        currentTotalOfTopupExpenses: topup,
        currentTotalOfExpenses: nonTopup,
        currentTotalExpenses: total,
      });
    } catch (err) {
      get().pushAlert(handleError(err));
    } finally {
      set({ showLoader: false });
    }
  },

  async fetchExpenses(options = {}) {
    const silent = options.silent === true;
    if (!silent) set({ showLoader: true });
    try {
      const s = get();
      const ps = s.pageSize === ALL ? s.currentTotalExpenses * 100 : s.pageSize;
      const data = {
        page_number: s.pageNumber,
        per_page: ps,
        operator: s.searchOperator,
        advanced_search: s.isAdvancedSearch,
      };
      if (s.isAdvancedSearch) {
        if (s.searchSelectedTags?.length)
          data.search_by_tags = s.searchSelectedTags;
        if (s.searchSelectedBanks?.length)
          data.search_by_bank_ids = s.searchSelectedBanks;
        if (s.searchEntryKeyword) data.search_by_keyword = s.searchEntryKeyword;
        if (s.searchSelectedDaterange)
          data.search_by_daterange = {
            start_date: `${formatMyDates(s.searchSelectedDaterange[0])} 00:00`,
            end_date: `${formatMyDates(s.searchSelectedDaterange[1])} 00:00`,
          };
      } else {
        data.bank_id = s.currentSelectedBankId;
      }
      const r = await axios.get(`${BASE_URL}/expenses/`, {
        params: { data: JSON.stringify(data) },
      });

      const { expenses, topup, nonTopup, total } = get()._parseExpenses(
        r.data || [],
      );
      set({
        filteredExpensesList: expenses,
        currentTotalOfTopupExpenses: topup,
        currentTotalOfExpenses: nonTopup,
        currentTotalExpenses: total,
      });
    } catch (err) {
      get().pushAlert(handleError(err));
    } finally {
      if (!silent) set({ showLoader: false });
    }
  },

  async submitExpense(data) {
    set({ showLoader: true });
    try {
      data.created_at = get().expenseEntryCreationDate;
      const r = await axios.post(`${BASE_URL}/expenses/create`, data);
      if (r.status === 201) {
        await Promise.all([
          get().fetchExpenses({ silent: true }),
          get().fetchBanks(),
        ]);
        return true;
      }
      return false;
    } catch (err) {
      get().pushAlert(handleError(err));
      return false;
    } finally {
      set({ showLoader: false });
    }
  },

  async submitExpenseEntry(expenseId, list) {
    set({ showLoader: true });
    try {
      const r = await axios.patch(
        `${BASE_URL}/expenses/add-entry`,
        { entries: list },
        { params: { id: expenseId } },
      );
      if (r.status === 201) {
        await Promise.all([
          get().fetchExpenses({ silent: true }),
          get().fetchBanks(),
        ]);
        return true;
      }
      return false;
    } catch (err) {
      get().pushAlert(handleError(err));
      return false;
    } finally {
      set({ showLoader: false });
    }
  },

  async deleteExpense(id) {
    set({ showLoader: true });
    try {
      const r = await axios.delete(`${BASE_URL}/expenses/delete`, {
        params: { id },
      });
      if (r.status === 204) {
        await Promise.all([
          get().fetchExpenses({ silent: true }),
          get().fetchBanks(),
        ]);
      }
    } catch (err) {
      get().pushAlert(handleError(err));
    } finally {
      set({ showLoader: false });
    }
  },

  async deleteExpenseEntry(expenseId, eeId) {
    set({ showLoader: true });
    try {
      const r = await axios.delete(`${BASE_URL}/expenses/delete-entry`, {
        params: { id: expenseId, ee_id: eeId },
      });
      if (r.status === 204) {
        await Promise.all([
          get().fetchExpenses({ silent: true }),
          get().fetchBanks(),
        ]);
      }
    } catch (err) {
      get().pushAlert(handleError(err));
    } finally {
      set({ showLoader: false });
    }
  },

  async createNewTag(name) {
    set({ showLoader: true });
    try {
      const r = await axios.post(`${BASE_URL}/entry-tags/create`, { name });
      if (r.status === 201) window.location.reload();
    } catch (err) {
      set({ showLoader: false });
      get().pushAlert(handleError(err));
    }
  },

  async applyTagsToExpenseEntry(data) {
    set({ showLoader: true });
    try {
      const r = await axios.patch(`${BASE_URL}/expenses/update-entry`, data);
      if (r.status === 201) {
        set({
          selectedTags: r.data?.data?.selected_tags ?? get().selectedTags,
          isApplyEntryTagVisible: false,
          applyTagEntry: null,
        });
        await get().fetchExpenses({ silent: true });
      }
    } catch (err) {
      get().pushAlert(handleError(err));
    } finally {
      set({ showLoader: false });
    }
  },

  async createBank(data) {
    set({ showLoader: true });
    try {
      const r = await axios.post(`${BASE_URL}/banks/create`, {
        ...data,
        current_balance: data.initial_balance,
        total_disbursed_till_now: 0,
      });
      if (r.status === 200) window.location.reload();
    } catch (err) {
      set({ showLoader: false });
      get().pushAlert(handleError(err));
    }
  },

  async deleteBank(bankId) {
    set({ showLoader: true });
    try {
      const r = await axios.delete(`${BASE_URL}/banks/delete`, {
        params: { bank_id: bankId },
      });
      if (r.status === 204) window.location.reload();
    } catch (err) {
      set({ showLoader: false });
      get().pushAlert(handleError(err));
    }
  },

  async loginUser(data) {
    set({ showLoader: true });
    try {
      const r = await axios.post(`${BASE_URL}/login`, data);
      localStorage.setItem("access_token", r.data.token);
      axios.defaults.headers.common["authorization"] = r.data.token;
      window.location.reload();
    } catch (err) {
      set({ showLoader: false });
      get().pushAlert(handleError(err));
    }
  },

  async registerUser(data) {
    set({ showLoader: true });
    try {
      const r = await axios.post(`${BASE_URL}/register`, data);
      if (r.status === 200) window.location.reload();
    } catch (err) {
      set({ showLoader: false });
      get().pushAlert(handleError(err));
    }
  },

  async updateUserPreferences(payload) {
    // ── Optimistic UI update — apply immediately, no loader ──
    const prev = {};
    if ("is_dark_mode" in payload) {
      prev.isDarkMode = get().isDarkMode;
      set({ isDarkMode: payload.is_dark_mode });
      if (payload.is_dark_mode) document.body.classList.remove("light");
      else document.body.classList.add("light");
    }
    if ("privacy_mode_enabled" in payload) {
      prev.privacyMode = get().privacyMode;
      set({ privacyMode: payload.privacy_mode_enabled });
    }
    if ("page_size" in payload) {
      prev.pageSize = get().pageSize;
      set({ pageSize: payload.page_size });
    }

    // ── Fire API in the background ──
    try {
      await axios.patch(`${BASE_URL}/user-preferences/update`, payload);
    } catch (err) {
      // Revert optimistic changes on failure
      if ("is_dark_mode" in payload) {
        set({ isDarkMode: prev.isDarkMode });
        if (prev.isDarkMode) document.body.classList.remove("light");
        else document.body.classList.add("light");
      }
      if ("privacy_mode_enabled" in payload)
        set({ privacyMode: prev.privacyMode });
      if ("page_size" in payload) set({ pageSize: prev.pageSize });
      get().pushAlert(handleError(err));
    }
  },

  async reorderBanks(orderedIds) {
    // Optimistically reorder banksList in state
    const { banksList } = get();
    const reordered = orderedIds
      .map((id) => banksList.find((b) => b.bankId === id))
      .filter(Boolean);
    const bankItems = reordered.map((e) => ({
      title: e.bankName,
      value: e.bankId,
    }));
    set({ banksList: reordered, bankItems, banksDisplayOrder: orderedIds });
    try {
      await axios.patch(`${BASE_URL}/user-preferences/update`, {
        banks_display_order: orderedIds,
      });
    } catch (err) {
      get().pushAlert(handleError(err));
      // Revert on failure by re-fetching
      get().fetchBanks();
    }
  },

  logoutUser() {
    localStorage.removeItem("access_token");
    delete axios.defaults.headers.common["authorization"];
    window.location.reload();
  },
}));
