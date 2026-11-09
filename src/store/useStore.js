import { create } from "zustand";
import axios from "axios";
import { mapApiTags, normalizeTagName } from "../utils/tags.js";

// In dev, default to whatever host the page itself was loaded from (works
// for localhost, a LAN IP, etc. - including from a phone on the same
// network) instead of a hardcoded address that only resolves on one
// machine. An explicit VITE_TM_BACKEND_URL always wins if set.
const BASE_URL =
  import.meta.env.VITE_TM_BACKEND_URL ||
  (import.meta.env.DEV
    ? `http://${window.location.hostname}:5000`
    : "https://api.stalk-my-money.in/");
export const API_BASE_URL = BASE_URL.replace(/\/+$/, "");
const ALL = "all";
const ALL_PAGE_SIZE = 10000; // API caps per_page at 10000
const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

let refreshPromise = null;
let authInterceptorReady = false;

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

function saveTokens({ token, refresh_token }) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  if (refresh_token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
  }
  axios.defaults.headers.common["authorization"] = token;
}

function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  delete axios.defaults.headers.common["authorization"];
}

function isTokenExpired(token) {
  const payload = parseJwt(token);
  if (!payload?.exp) return true;
  return payload.exp * 1000 <= Date.now() + 30_000;
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    throw new Error("No refresh token");
  }

  const r = await axios.post(`${BASE_URL}/refresh`, {
    refresh_token: refreshToken,
  });
  saveTokens({
    token: r.data.token,
    refresh_token: r.data.refresh_token,
  });
  return r.data.token;
}

function setupAxiosAuthInterceptor() {
  if (authInterceptorReady) return;
  authInterceptorReady = true;

  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      const status = error.response?.status;
      const url = originalRequest?.url || "";

      if (
        status !== 401 ||
        originalRequest?._retry ||
        url.includes("/login") ||
        url.includes("/register") ||
        url.includes("/refresh")
      ) {
        return Promise.reject(error);
      }

      if (!localStorage.getItem(REFRESH_TOKEN_KEY)) {
        clearTokens();
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken()
        .catch((refreshErr) => {
          clearTokens();
          throw refreshErr;
        })
        .finally(() => {
          refreshPromise = null;
        });
      }

      try {
        const newToken = await refreshPromise;
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.authorization = newToken;
        return axios(originalRequest);
      } catch {
        return Promise.reject(error);
      }
    },
  );
}

// Plain-language message for the Manage tags dialog. Never throws (handleError
// can, on errors that have no response).
function tagErrorMessage(err) {
  try {
    const status = err?.response?.status;
    if (status === 404) return "That tag no longer exists. Close this window and open it again.";
    if (status === 422) return "A tag name must be 1 to 50 characters.";
    const msg = handleError(err);
    if (typeof msg === "string" && msg) return msg;
  } catch {
    /* fall through */
  }
  return "Could not reach the server. Check your connection and try again.";
}

function handleError(err) {
  // JSON.parse(err.request.response).detail
  if (err?.status === 401 || err?.response?.status === 401) {
    clearTokens();
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
export async function initAxiosToken() {
  setupAxiosAuthInterceptor();

  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

  if (token && !isTokenExpired(token)) {
    axios.defaults.headers.common["authorization"] = token;
    return parseJwt(token);
  }

  if (refreshToken) {
    try {
      await refreshAccessToken();
      return parseJwt(localStorage.getItem(ACCESS_TOKEN_KEY));
    } catch {
      clearTokens();
      return null;
    }
  }

  if (token) clearTokens();
  return null;
}

// ── store ─────────────────────────────────────────────────
export const useStore = create((set, get) => ({
  // state
  userName: null,
  isLoggedIn: false,
  // After signup: { email } -> the "check your email" screen replaces the form.
  verifyNotice: null,
  // Set when login is refused because the email isn't confirmed yet.
  needsEmailVerification: false,
  isAdmin: false,
  // Whether the AI chatbot is enabled for THIS user - a per-user
  // entitlement an admin grants/revokes from the admin dashboard (see
  // adminUsers/fetchAdminUsers/setUserChatbotAccess below), not a global
  // switch.
  chatbotEnabled: false,
  // Admin dashboard state - only ever populated for isAdmin users.
  // Server-paginated (not loaded all at once) - adminUsers holds just the
  // current page.
  adminUsers: [],
  adminUsersLoading: false,
  adminUsersTotal: 0,
  adminUsersPage: 1,
  adminUsersPageSize: 5,
  adminUsersSearch: "",
  isAdminDashboardOpen: false,
  isDarkMode: true,
  privacyMode: false,
  // Shown to every signed-out visitor before Login/Register (see
  // LandingPage.jsx) - lives here, not as local App.jsx state, so Login/
  // Register can flip it back on (a "back" button) without prop drilling.
  showLanding: true,
  showLoginPage: true,
  showLoader: false,
  showAlert: false,
  alertMessages: [],
  // { message, confirmLabel, resolve } | null - drives the shared
  // ConfirmDialog, replacing native window.confirm() everywhere.
  confirmState: null,

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

  searchExcludeTags: [], // effective exclusion (starts as the user default)
  defaultExcludedTags: [], // saved in user preferences
  // Phone quick-search: an empty Accounts filter means "the account selected
  // on screen" (same rule the desktop analytics view uses).
  searchScopeToCurrentBank: false,
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
  setVerifyNotice: (v) => set({ verifyNotice: v }),
  setIsAdmin: (v) => set({ isAdmin: v }),
  setChatbotAccess: (v) => set({ chatbotEnabled: v }),
  setLoginPageStatus: (v) => set({ showLoginPage: v }),
  setShowLanding: (v) => set({ showLanding: v }),
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
  setSearchExcludeTags: (v) => set({ searchExcludeTags: v }),
  setSearchScopeToCurrentBank: (v) => set({ searchScopeToCurrentBank: v }),
  setSearchSelectedBanks: (v) => set({ searchSelectedBanks: v }),
  setSearchEntryKeyword: (v) => set({ searchEntryKeyword: v }),
  setSearchSelectedDaterange: (v) => set({ searchSelectedDaterange: v }),
  setSearchOperator: (v) => set({ searchOperator: v }),
  setAdvancedSearch: (v) => set({ isAdvancedSearch: v }),
  setExpenseEntryCreationDate: (v) => set({ expenseEntryCreationDate: v }),
  setIsDarkMode: (v) => set({ isDarkMode: v }),
  setPrivacyMode: (v) => set({ privacyMode: v }),

  // `action` (optional) adds a button to the toast, e.g. { label: "Review", to: "profile" }.
  pushAlert(msg, type = "error", action = null) {
    set((s) => ({ showAlert: true, alertMessages: [...s.alertMessages, { msg, type, action }] }));
  },

  /** Custom replacement for window.confirm() - await it, resolves to
   * true/false once the user picks a button on the ConfirmDialog. If
   * another confirmation is already pending, that one is auto-cancelled
   * (resolved false) first, since only one can be shown at a time. */
  requestConfirm(message, confirmLabel = "Delete") {
    const prev = get().confirmState;
    if (prev) prev.resolve(false);
    return new Promise((resolve) => {
      set({ confirmState: { message, confirmLabel, resolve } });
    });
  },
  resolveConfirm(result) {
    const cs = get().confirmState;
    set({ confirmState: null });
    cs?.resolve(result);
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

  // Re-pull everything the chat agent can touch (banks, expenses, tags,
  // preferences) after it confirms a write action, so the dashboard
  // reflects it immediately instead of needing a manual page reload.
  async refreshAfterAgentAction() {
    try {
      // Preferences and banks don't depend on each other at the network
      // level - fetch both at once instead of sequencing them, then apply
      // the fresh display order to the fresh bank list directly (rather
      // than going through fetchBanks(), which would re-read
      // banksDisplayOrder from state before this set() below lands it).
      const [prefsRes, banksRes] = await Promise.all([
        axios.get(`${BASE_URL}/user-preferences/`),
        axios.get(`${BASE_URL}/banks/`),
      ]);

      const prefs = prefsRes?.data?.user_preferences ?? prefsRes?.data;
      const displayOrder = prefs?.banks_display_order ?? get().banksDisplayOrder;
      if (prefs) {
        const dark = prefs.is_dark_mode ?? get().isDarkMode;
        if (dark) document.body.classList.remove("light");
        else document.body.classList.add("light");
        set({
          isDarkMode: dark,
          privacyMode: prefs.privacy_mode_enabled ?? get().privacyMode,
          pageSize: prefs.page_size ?? get().pageSize,
          banksDisplayOrder: displayOrder,
          defaultExcludedTags:
            prefs.default_excluded_tags ?? get().defaultExcludedTags,
        });
      }

      const banks = (banksRes.data?.banks || []).map((e) => ({
        bankName: e.name,
        remainingBalance: e.current_balance,
        bankId: e.id,
      }));
      if (Array.isArray(displayOrder) && displayOrder.length > 0) {
        const orderMap = new Map(displayOrder.map((id, idx) => [id, idx]));
        banks.sort((a, b) => {
          const ai = orderMap.has(a.bankId) ? orderMap.get(a.bankId) : Infinity;
          const bi = orderMap.has(b.bankId) ? orderMap.get(b.bankId) : Infinity;
          return ai - bi;
        });
      }
      const bankItems = banks.map((e) => ({ title: e.bankName, value: e.bankId }));

      // If the agent deleted the currently-selected bank, fall back to
      // whatever's left instead of fetchExpenses silently querying a
      // bank id that no longer exists.
      const stillExists = banks.some((b) => b.bankId === get().currentSelectedBankId);
      set({
        banksList: banks,
        bankItems,
        ...(stillExists ? {} : { currentSelectedBankId: banks[0]?.bankId ?? null }),
      });

      await Promise.all([
        get().fetchExpenses({ silent: true }),
        axios.get(`${BASE_URL}/entry-tags/`).then((r) => {
          set({ entryTags: mapApiTags(r.data?.entry_tags) });
        }),
      ]);
    } catch (err) {
      get().pushAlert(handleError(err));
    }
  },

  async getInitialData() {
    const s = get();
    if (!s.isLoggedIn) return;
    set({ showLoader: true });
    try {
      // chatbotEnabled/isAdmin come from the JWT at login (see main.jsx) -
      // they're per-user flags, not something to re-fetch here.
      const [banksRes, prefsRes] = await Promise.all([
        axios.get(`${BASE_URL}/banks/`),
        axios.get(`${BASE_URL}/user-preferences/`),
      ]);
      const prefs = prefsRes?.data?.user_preferences ?? prefsRes?.data;
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
      const defaultExcluded = prefs?.default_excluded_tags ?? [];
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
        defaultExcludedTags: defaultExcluded,
        searchExcludeTags: defaultExcluded,
      });

      if (selectedBankId) {
        const [expRes, tagRes] = await Promise.all([
          axios.get(`${BASE_URL}/expenses/`, {
            params: defaultExcluded.length
              ? {
                  data: JSON.stringify({
                    bank_id: selectedBankId,
                    per_page: ps,
                    page_number: 1,
                    exclude_tags: defaultExcluded,
                  }),
                }
              : { bank_id: selectedBankId, per_page: ps },
          }),
          axios.get(`${BASE_URL}/entry-tags/`),
        ]);
        const { expenses, topup, nonTopup, total } = get()._parseExpenses(
          expRes.data || [],
        );
        const tags = mapApiTags(tagRes.data?.entry_tags);
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
      const ps = s.pageSize === ALL ? ALL_PAGE_SIZE : s.pageSize;
      // Keep the excluded tags when switching accounts, otherwise their
      // amounts flow back into the list and the charts.
      const excluded = s.searchExcludeTags || [];
      const r = await axios.get(`${BASE_URL}/expenses/`, {
        params: excluded.length
          ? {
              data: JSON.stringify({
                bank_id: bank.bankId,
                per_page: ps,
                page_number: s.pageNumber,
                exclude_tags: excluded,
              }),
            }
          : {
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
      const ps = s.pageSize === ALL ? ALL_PAGE_SIZE : s.pageSize;
      const data = {
        page_number: s.pageNumber,
        per_page: ps,
        operator: s.searchOperator,
        advanced_search: s.isAdvancedSearch,
      };
      // Exclusion applies in every mode (default comes from user preferences).
      if (s.searchExcludeTags?.length) data.exclude_tags = s.searchExcludeTags;
      if (s.isAdvancedSearch) {
        if (s.searchSelectedTags?.length)
          data.search_by_tags = s.searchSelectedTags;
        if (s.searchSelectedBanks?.length)
          data.search_by_bank_ids = s.searchSelectedBanks;
        else if (
          (s.analyticsOpen || s.searchScopeToCurrentBank) &&
          s.currentSelectedBankId
        )
          // Workspace filter bar: no account picked means "the account
          // selected in the sidebar", not every account.
          data.search_by_bank_ids = [s.currentSelectedBankId];
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

  // ── Manage tags dialog ───────────────────────────────────
  // These three return { ok: true, ... } or { ok: false, error } and never
  // touch the global loader or toast: the dialog shows errors inline next to
  // the input so the user keeps what they typed.

  async fetchEntryTags() {
    try {
      const r = await axios.get(`${BASE_URL}/entry-tags/`);
      set({ entryTags: mapApiTags(r.data?.entry_tags) });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: tagErrorMessage(err) };
    }
  },

  /** Add a tag. The server saves it capitalized; we refresh the list so the
   * saved name and counts are exactly what the API holds. */
  async addTag(name) {
    try {
      const r = await axios.post(`${BASE_URL}/entry-tags/create`, { name });
      await get().fetchEntryTags();
      return { ok: true, name: r.data?.name ?? normalizeTagName(name), id: r.data?.tag_id };
    } catch (err) {
      return { ok: false, error: tagErrorMessage(err) };
    }
  },

  /** Rename a tag. The list updates at once (optimistic) and rolls back if the
   * server refuses (for example the name is taken). Expense rows are reloaded
   * quietly so they show the new name. */
  async renameTag(id, newName) {
    const prev = get().entryTags;
    const shown = normalizeTagName(newName);
    set({
      entryTags: mapApiTags(
        prev.map((t) => ({ name: t.value === id ? shown : t.title, id: t.value, entry_count: t.count })),
      ),
    });
    try {
      const r = await axios.patch(`${BASE_URL}/entry-tags/${id}`, { name: newName });
      const saved = r.data?.tag;
      if (saved) {
        set((s) => ({
          entryTags: mapApiTags(
            s.entryTags.map((t) =>
              t.value === id
                ? { name: saved.name, id, entry_count: saved.entry_count }
                : { name: t.title, id: t.value, entry_count: t.count },
            ),
          ),
        }));
      }
      get().fetchExpenses({ silent: true });
      return { ok: true, name: saved?.name ?? shown };
    } catch (err) {
      set({ entryTags: prev });
      return { ok: false, error: tagErrorMessage(err) };
    }
  },

  /** Delete a tag. The list updates at once and rolls back on failure. On
   * success the tag is also dropped from the search filters and the
   * default-excluded list (the server already cleaned its saved copy), and
   * expense rows are reloaded quietly because they just lost the tag. */
  async deleteTag(id) {
    const prev = get().entryTags;
    set({ entryTags: prev.filter((t) => t.value !== id) });
    try {
      const r = await axios.delete(`${BASE_URL}/entry-tags/${id}`);
      const without = (list) => (list || []).filter((x) => x !== id);
      set((s) => ({
        searchSelectedTags: without(s.searchSelectedTags),
        searchExcludeTags: without(s.searchExcludeTags),
        defaultExcludedTags: without(s.defaultExcludedTags),
      }));
      get().fetchExpenses({ silent: true });
      return { ok: true, untagged: r.data?.entries_untagged ?? 0 };
    } catch (err) {
      set({ entryTags: prev });
      return { ok: false, error: tagErrorMessage(err) };
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
      saveTokens({
        token: r.data.token,
        refresh_token: r.data.refresh_token,
      });
      window.location.reload();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      set({
        showLoader: false,
        needsEmailVerification:
          err?.response?.status === 403 && typeof detail === "string" && detail.startsWith("Email not verified"),
      });
      get().pushAlert(handleError(err));
    }
  },

  async registerUser(data) {
    set({ showLoader: true });
    try {
      await axios.post(`${BASE_URL}/register`, data);
      // The account exists but must be confirmed by email before login.
      set({ showLoader: false, verifyNotice: { email: data.email } });
    } catch (err) {
      set({ showLoader: false });
      get().pushAlert(handleError(err));
    }
  },

  /** The email actions below all return true/false so the page can react. */
  async resendVerification(email) {
    set({ showLoader: true });
    try {
      await axios.post(`${BASE_URL}/resend-verification`, { email });
      set({ showLoader: false });
      get().pushAlert("If that email is registered, a new confirmation link is on its way.", "success");
      return true;
    } catch (err) {
      set({ showLoader: false });
      get().pushAlert(handleError(err));
      return false;
    }
  },

  async verifyEmailToken(token) {
    try {
      await axios.post(`${BASE_URL}/verify-email`, { token });
      return true;
    } catch {
      return false;
    }
  },

  async forgotPassword(email) {
    set({ showLoader: true });
    try {
      await axios.post(`${BASE_URL}/forgot-password`, { email });
      set({ showLoader: false });
      return true;
    } catch (err) {
      set({ showLoader: false });
      get().pushAlert(handleError(err));
      return false;
    }
  },

  async resetPassword(token, password) {
    set({ showLoader: true });
    try {
      await axios.post(`${BASE_URL}/reset-password`, { token, password });
      set({ showLoader: false });
      return true;
    } catch (err) {
      set({ showLoader: false });
      get().pushAlert(handleError(err));
      return false;
    }
  },

  /** Save the tags that are hidden from the expense list by default, apply
   * them right away and reload the list. */
  async setDefaultExcludedTags(ids) {
    const prev = get().defaultExcludedTags;
    set({ defaultExcludedTags: ids, searchExcludeTags: ids, pageNumber: 1 });
    try {
      await axios.patch(`${BASE_URL}/user-preferences/update`, {
        default_excluded_tags: ids,
      });
      await get().fetchExpenses();
    } catch (err) {
      set({ defaultExcludedTags: prev, searchExcludeTags: prev });
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

  // ── Admin dashboard - the backend also enforces admin-only on both of
  // these (403s a non-admin), this is just so the UI itself is only ever
  // shown/usable for admins. ──
  setAdminDashboardOpen: (v) =>
    set(v ? { isAdminDashboardOpen: true, profileOpen: false } : { isAdminDashboardOpen: false }),

  // ── Profile page (account details, password, SMS auto-capture token) ──
  profileOpen: false,
  setProfileOpen: (v) =>
    set(v ? { profileOpen: true, isAdminDashboardOpen: false } : { profileOpen: false }),
  profile: null,
  ingestStatus: null,
  ingestPending: [],
  claudeConnections: [],
  refreshing: false,

  async fetchProfile() {
    try {
      const [p, t, q] = await Promise.all([
        axios.get(`${BASE_URL}/profile/`),
        axios.get(`${BASE_URL}/ingest/token`),
        axios.get(`${BASE_URL}/ingest/pending`),
      ]);
      set({
        profile: p.data,
        ingestStatus: t.data,
        ingestPending: q.data.transactions || [],
      });
    } catch (err) {
      get().pushAlert(handleError(err));
    }
  },

  async updateProfile(payload) {
    try {
      const r = await axios.patch(`${BASE_URL}/profile/`, payload);
      // The username lives inside the login token, so swap in the fresh one.
      saveTokens({ token: r.data.token, refresh_token: r.data.refresh_token });
      set({
        profile: { username: r.data.username, email: r.data.email, created_at: r.data.created_at },
        userName: r.data.username,
      });
      get().pushAlert("Profile updated.", "success");
      return true;
    } catch (err) {
      get().pushAlert(handleError(err));
      return false;
    }
  },

  async changePassword(current_password, new_password) {
    try {
      await axios.post(`${BASE_URL}/profile/password`, { current_password, new_password });
      get().pushAlert("Password changed.", "success");
      return true;
    } catch (err) {
      get().pushAlert(handleError(err));
      return false;
    }
  },

  /** Create or replace the SMS webhook token. Resolves to the token (shown once). */
  async createIngestToken() {
    try {
      const r = await axios.post(`${BASE_URL}/ingest/token`);
      const t = await axios.get(`${BASE_URL}/ingest/token`);
      set({ ingestStatus: t.data });
      return r.data.token;
    } catch (err) {
      get().pushAlert(handleError(err));
      return null;
    }
  },

  async setIngestAutoAdd(enabled) {
    const prev = get().ingestStatus;
    set({ ingestStatus: { ...prev, auto_add: enabled } });
    try {
      await axios.patch(`${BASE_URL}/ingest/settings`, { auto_add: enabled });
    } catch (err) {
      set({ ingestStatus: prev });
      get().pushAlert(handleError(err));
    }
  },

  /** On page load: if SMS-automation transactions are waiting for review, say so. */
  async notifyPendingIngest() {
    try {
      const r = await axios.get(`${BASE_URL}/ingest/pending`);
      const list = r.data.transactions || [];
      set({ ingestPending: list });
      if (list.length) {
        const n = list.length;
        get().pushAlert(
          `${n} expense${n > 1 ? "s" : ""} from your SMS automation ${n > 1 ? "are" : "is"} waiting for your review.`,
          "info",
          { label: "Review", to: "profile" },
        );
      }
    } catch {
      /* quiet: an older server without this endpoint, or offline - nothing to announce */
    }
  },

  /** Reload balances and the expense list (keeping the current filters). */
  async refreshAll() {
    if (get().refreshing) return;
    set({ refreshing: true });
    try {
      await Promise.all([get().fetchBanks(), get().fetchExpenses({ silent: true })]);
    } finally {
      set({ refreshing: false });
    }
  },

  /** Reload the webhook status ("last used") and the "To review" list. */
  /** Claude connector sessions for Profile > Connected apps. */
  async fetchClaudeConnections() {
    try {
      const r = await axios.get(`${BASE_URL}/oauth/connections`);
      set({ claudeConnections: r.data || [] });
    } catch (err) {
      get().pushAlert(handleError(err));
    }
  },

  async revokeClaudeConnection(id) {
    try {
      await axios.delete(`${BASE_URL}/oauth/connections/${id}`);
      set({ claudeConnections: get().claudeConnections.filter((c) => c.id !== id) });
      get().pushAlert("Claude can no longer access your account.", "success");
    } catch (err) {
      get().pushAlert(handleError(err));
    }
  },

  async refreshIngest() {
    set({ refreshing: true });
    try {
      const [t, q] = await Promise.all([
        axios.get(`${BASE_URL}/ingest/token`),
        axios.get(`${BASE_URL}/ingest/pending`),
      ]);
      set({ ingestStatus: t.data, ingestPending: q.data.transactions || [] });
    } catch (err) {
      get().pushAlert(handleError(err));
    } finally {
      set({ refreshing: false });
    }
  },

  async fetchIngestPending() {
    try {
      const r = await axios.get(`${BASE_URL}/ingest/pending`);
      set({ ingestPending: r.data.transactions || [] });
    } catch (err) {
      get().pushAlert(handleError(err));
    }
  },

  /** Add one waiting SMS transaction to the chosen account's expenses. */
  async confirmIngestPending(id, bankId, description, entryTags) {
    try {
      await axios.post(`${BASE_URL}/ingest/pending/${id}/confirm`, {
        bank_id: bankId || null,
        description: description || null,
        entry_tags: entryTags || [],
      });
      get().pushAlert("Added to your expenses.", "success");
      await get().fetchIngestPending();
      get().fetchBanks();
      get().fetchExpenses({ silent: true });
      return true;
    } catch (err) {
      get().pushAlert(handleError(err));
      return false;
    }
  },

  async rejectIngestPending(id) {
    try {
      await axios.delete(`${BASE_URL}/ingest/pending/${id}`);
      await get().fetchIngestPending();
      return true;
    } catch (err) {
      get().pushAlert(handleError(err));
      return false;
    }
  },

  async revokeIngestToken() {
    try {
      await axios.delete(`${BASE_URL}/ingest/token`);
      set({ ingestStatus: { configured: false, created_at: null, last_used_at: null } });
      get().pushAlert("Webhook token revoked.", "success");
      return true;
    } catch (err) {
      get().pushAlert(handleError(err));
      return false;
    }
  },

  async fetchAdminUsers(overrides = {}) {
    const page = overrides.page ?? get().adminUsersPage;
    const pageSize = overrides.pageSize ?? get().adminUsersPageSize;
    const search = "search" in overrides ? overrides.search : get().adminUsersSearch;
    set({ adminUsersLoading: true, adminUsersPage: page, adminUsersPageSize: pageSize, adminUsersSearch: search });
    try {
      const params = new URLSearchParams({ page_number: page, per_page: pageSize });
      if (search.trim()) params.append("search", search.trim());
      const r = await axios.get(`${BASE_URL}/admin/users?${params.toString()}`);
      set({
        adminUsers: r.data?.users || [],
        adminUsersTotal: r.data?.total || 0,
      });
    } catch (err) {
      get().pushAlert(handleError(err));
    } finally {
      set({ adminUsersLoading: false });
    }
  },

  setAdminUsersSearch(search) {
    get().fetchAdminUsers({ search, page: 1 });
  },

  setAdminUsersPage(page) {
    get().fetchAdminUsers({ page });
  },

  setAdminUsersPageSize(pageSize) {
    get().fetchAdminUsers({ pageSize, page: 1 });
  },

  async setUserChatbotAccess(userId, enabled) {
    const prev = get().adminUsers;
    set({
      adminUsers: prev.map((u) =>
        u.id === userId ? { ...u, chatbot_enabled: enabled } : u,
      ),
    });
    try {
      await axios.patch(`${BASE_URL}/admin/users/${userId}/chatbot`, {
        chatbot_enabled: enabled,
      });
    } catch (err) {
      set({ adminUsers: prev });
      get().pushAlert(handleError(err));
    }
  },

  async setUserIsAdmin(userId, isAdminFlag) {
    const prev = get().adminUsers;
    set({
      adminUsers: prev.map((u) =>
        u.id === userId ? { ...u, is_admin: isAdminFlag } : u,
      ),
    });
    try {
      await axios.patch(`${BASE_URL}/admin/users/${userId}/admin`, {
        is_admin: isAdminFlag,
      });
    } catch (err) {
      set({ adminUsers: prev });
      get().pushAlert(handleError(err));
    }
  },

  async setUserDisabled(userId, isDisabled) {
    const prev = get().adminUsers;
    set({
      adminUsers: prev.map((u) =>
        u.id === userId ? { ...u, is_disabled: isDisabled } : u,
      ),
    });
    try {
      await axios.patch(`${BASE_URL}/admin/users/${userId}/disabled`, {
        is_disabled: isDisabled,
      });
    } catch (err) {
      set({ adminUsers: prev });
      get().pushAlert(handleError(err));
    }
  },

  // ── AI provider config - admin-editable, takes effect on the backend's
  // very next chat turn (see TraceMyMoneyAPI/app/core/llm.py). ──
  aiConfig: null,
  aiConfigLoading: false,
  aiConfigSaving: false,

  async fetchAiConfig() {
    set({ aiConfigLoading: true });
    try {
      const r = await axios.get(`${BASE_URL}/admin/ai-config`);
      set({ aiConfig: r.data });
    } catch (err) {
      get().pushAlert(handleError(err));
    } finally {
      set({ aiConfigLoading: false });
    }
  },

  async saveAiConfig(config) {
    set({ aiConfigSaving: true });
    try {
      const r = await axios.put(`${BASE_URL}/admin/ai-config`, config);
      set({ aiConfig: r.data });
      get().pushAlert("AI provider config saved.");
      return true;
    } catch (err) {
      get().pushAlert(handleError(err));
      return false;
    } finally {
      set({ aiConfigSaving: false });
    }
  },

  // ── Per-provider API keys - admin sets these from the dashboard instead
  // of needing .env access. The server only ever returns a masked status
  // (never the real key), so this never holds a raw secret client-side. ──
  providerKeys: null,
  providerKeysLoading: false,
  providerKeysSaving: {},

  async fetchProviderKeys() {
    set({ providerKeysLoading: true });
    try {
      const r = await axios.get(`${BASE_URL}/admin/provider-keys`);
      set({ providerKeys: r.data });
    } catch (err) {
      get().pushAlert(handleError(err));
    } finally {
      set({ providerKeysLoading: false });
    }
  },

  async saveProviderKey(provider, apiKey) {
    set((s) => ({ providerKeysSaving: { ...s.providerKeysSaving, [provider]: true } }));
    try {
      const r = await axios.put(`${BASE_URL}/admin/provider-keys`, {
        provider,
        api_key: apiKey,
      });
      set((s) => ({ providerKeys: { ...s.providerKeys, [provider]: r.data } }));
      get().pushAlert(apiKey ? `${provider} API key saved.` : `${provider} API key cleared.`, "success");
      return true;
    } catch (err) {
      get().pushAlert(handleError(err));
      return false;
    } finally {
      set((s) => ({ providerKeysSaving: { ...s.providerKeysSaving, [provider]: false } }));
    }
  },

  // ── Feature flags - runtime toggles, no redeploy needed. ──
  featureFlags: null,
  featureFlagsLoading: false,

  async fetchFeatureFlags() {
    set({ featureFlagsLoading: true });
    try {
      const r = await axios.get(`${BASE_URL}/admin/feature-flags`);
      set({ featureFlags: r.data });
    } catch (err) {
      get().pushAlert(handleError(err));
    } finally {
      set({ featureFlagsLoading: false });
    }
  },

  // Any logged-in user (not just admins) can read flags via this
  // non-admin endpoint - used by e.g. ChatAssistantDialog to decide
  // whether to show the voice-input mic button. Silent on failure (no
  // alert) since this is a minor UI toggle, not a user-initiated action.
  async fetchPublicFeatureFlags() {
    if (get().featureFlags) return;
    try {
      const r = await axios.get(`${BASE_URL}/feature-flags`);
      set({ featureFlags: r.data });
    } catch {
      // Leave featureFlags null - callers treat null the same as "flag on"
      // (today's default behavior), so a failed fetch just means no gating.
    }
  },

  async setFeatureFlag(key, value) {
    const prev = get().featureFlags;
    const next = { ...prev, [key]: value };
    set({ featureFlags: next });
    try {
      const r = await axios.put(`${BASE_URL}/admin/feature-flags`, next);
      set({ featureFlags: r.data });
    } catch (err) {
      set({ featureFlags: prev });
      get().pushAlert(handleError(err));
    }
  },

  // ── Usage/quota visibility - surfaces the last chat-LLM failure (e.g. a
  // Groq rate limit, with used/limit/retry parsed out) without digging
  // through server logs. ──
  llmStatus: null,
  llmStatusLoading: false,

  async fetchLlmStatus() {
    set({ llmStatusLoading: true });
    try {
      const r = await axios.get(`${BASE_URL}/admin/llm-status`);
      set({ llmStatus: r.data });
    } catch (err) {
      get().pushAlert(handleError(err));
    } finally {
      set({ llmStatusLoading: false });
    }
  },

  // ── Token usage metrics - how many tokens chat requests are actually
  // sending to the LLM, per request and totals (see admin/llm-metrics -
  // process-local, resets on restart, an operational view not a billing
  // system of record). ──
  llmMetrics: null,
  llmMetricsLoading: false,

  async fetchLlmMetrics() {
    set({ llmMetricsLoading: true });
    try {
      const r = await axios.get(`${BASE_URL}/admin/llm-metrics`);
      set({ llmMetrics: r.data });
    } catch (err) {
      get().pushAlert(handleError(err));
    } finally {
      set({ llmMetricsLoading: false });
    }
  },

  // ── Analytics - spend aggregated by bank / tag / day, for the charts
  // view. Available to every signed-in user (not admin-gated). ──
  analyticsOpen: false,
  analyticsData: null,
  analyticsLoading: false,
  setAnalyticsOpen: (v) => set({ analyticsOpen: v }),

  async fetchAnalytics(filters = {}) {
    set({ analyticsLoading: true });
    try {
      const params = new URLSearchParams();
      (filters.bankIds || []).forEach((id) => params.append("bank_id", id));
      (filters.tagIds || []).forEach((id) => params.append("tag_id", id));
      (filters.excludeTagIds || []).forEach((id) => params.append("exclude_tag_id", id));
      if (filters.startDate) params.append("start_date", filters.startDate);
      if (filters.endDate) params.append("end_date", filters.endDate);
      if (filters.keyword) params.append("keyword", filters.keyword);
      const qs = params.toString();
      const r = await axios.get(
        `${BASE_URL}/expenses/analytics/overview${qs ? `?${qs}` : ""}`,
      );
      set({ analyticsData: r.data });
    } catch (err) {
      get().pushAlert(handleError(err));
    } finally {
      set({ analyticsLoading: false });
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
    clearTokens();
    window.location.reload();
  },
}));
