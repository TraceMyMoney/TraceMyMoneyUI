import { create } from 'zustand'
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_TM_BACKEND_URL || 'https://api.stalk-my-money.in/'
const ALL = 'all'

// ── helpers ──────────────────────────────────────────────
function parseJwt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(decodeURIComponent(window.atob(base64).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')))
  } catch { return null }
}

function handleError(err) {
  if (err?.status === 401 || err?.response?.status === 401) {
    localStorage.removeItem('access_token')
    delete axios.defaults.headers.common['x-access-token']
    return 'Session expired. Please login again.'
  }
  if (err?.response?.data?.error) return err.response.data.error
  if (Array.isArray(err?.response?.data?.errors)) {
    const e = err.response.data.errors[0]
    return Object.keys(e).map(f => `${f}: ${e[f]}`).join(', ')
  }
  return err?.message || 'Something went wrong'
}

export function formatMyDates(date) {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

export function filterValidExpenses(list) {
  return list
    .filter(e => e.amount && e.description)
    .map(e => e.amount < 0
      ? { amount: e.amount, description: e.description, expense_entry_type: 'ADD' }
      : e)
}

export function fmtNum(v, privacy = false) {
  if (privacy) return '••••'
  if (v == null) return '0'
  return new Intl.NumberFormat('en-IN').format(Math.abs(Number(v)))
}

// ── init axios token ──────────────────────────────────────
export function initAxiosToken() {
  const token = localStorage.getItem('access_token')
  if (token) {
    axios.defaults.headers.common['x-access-token'] = token
    return parseJwt(token)
  }
  return null
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
  searchEntryKeyword: '',
  searchSelectedDaterange: null,
  searchOperator: 'and',
  isAdvancedSearch: false,

  isCreateBankDialogVisible: false,
  isApplyEntryTagVisible: false,
  applyTagEntry: null,
  selectedTags: [],

  expenseEntryCreationDate: (() => {
    const d = new Date()
    return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()} 00:00`
  })(),

  // ── setters ──────────────────────────────────────────────
  setUserName: v => set({ userName: v }),
  setLoggedInStatus: v => set({ isLoggedIn: v }),
  setLoginPageStatus: v => set({ showLoginPage: v }),
  setShowAlert: v => set({ showAlert: v }),
  setAlertMessages: v => set({ alertMessages: v }),
  setShowLoader: v => set({ showLoader: v }),
  setCreateBankDialogVisible: v => set({ isCreateBankDialogVisible: v }),
  setApplyEntryTagVisible: v => set({ isApplyEntryTagVisible: v }),
  setApplyTagEntry: v => set({ applyTagEntry: v }),
  setSelectedTags: v => set({ selectedTags: v }),
  setPageNumber: v => set({ pageNumber: v }),
  setPageSize: v => set({ pageSize: v }),
  setSearchSelectedTags: v => set({ searchSelectedTags: v }),
  setSearchSelectedBanks: v => set({ searchSelectedBanks: v }),
  setSearchEntryKeyword: v => set({ searchEntryKeyword: v }),
  setSearchSelectedDaterange: v => set({ searchSelectedDaterange: v }),
  setSearchOperator: v => set({ searchOperator: v }),
  setAdvancedSearch: v => set({ isAdvancedSearch: v }),
  setExpenseEntryCreationDate: v => set({ expenseEntryCreationDate: v }),
  setIsDarkMode: v => set({ isDarkMode: v }),
  setPrivacyMode: v => set({ privacyMode: v }),

  pushAlert(msg) {
    set(s => ({ showAlert: true, alertMessages: [...s.alertMessages, msg] }))
  },

  // ── helpers ───────────────────────────────────────────────
  _parseExpenses(list) {
    const arr = [...list]
    const topup = arr.pop()?.topup_total ?? 0
    const nonTopup = arr.pop()?.non_topup_total ?? 0
    const total = arr.pop()?.total_expenses ?? 0
    return { expenses: arr, topup, nonTopup, total }
  },

  // ── API actions ───────────────────────────────────────────
  async getInitialData() {
    const s = get()
    if (!s.isLoggedIn) return
    set({ showLoader: true })
    try {
      const [banksRes, prefsRes] = await Promise.all([
        axios.get(`${BASE_URL}banks/`),
        axios.get(`${BASE_URL}user-preferences/`)
      ])
      const prefs = prefsRes?.data?.user_preferences
      const ps = prefs?.page_size ?? 5
      const dark = prefs?.is_dark_mode ?? true
      const privacy = prefs?.privacy_mode_enabled ?? false
      if (dark) document.body.classList.remove('light')
      else document.body.classList.add('light')

      const banks = (banksRes.data?.banks || []).map(e => ({
        bankName: e.name, remainingBalance: e.current_balance, bankId: e.id
      }))
      const bankItems = banks.map(e => ({ title: e.bankName, value: e.bankId }))
      const selectedBankId = bankItems[0]?.value

      set({ banksList: banks, bankItems, currentSelectedBankId: selectedBankId, pageSize: ps, isDarkMode: dark, privacyMode: privacy })

      if (selectedBankId) {
        const [expRes, tagRes] = await Promise.all([
          axios.get(`${BASE_URL}expenses/`, { params: { bank_id: selectedBankId, per_page: ps } }),
          axios.get(`${BASE_URL}entry-tags/`)
        ])
        const { expenses, topup, nonTopup, total } = get()._parseExpenses(expRes.data?.expenses || [])
        const tags = (tagRes.data?.entry_tags || [])
          .map(e => ({ title: e.name, value: e.id }))
          .sort((a, b) => a.title.localeCompare(b.title))
        set({
          filteredExpensesList: expenses,
          currentTotalOfTopupExpenses: topup,
          currentTotalOfExpenses: nonTopup,
          currentTotalExpenses: total,
          entryTags: tags
        })
      }
    } catch (err) { get().pushAlert(handleError(err)) }
    finally { set({ showLoader: false }) }
  },

  async fetchFilteredExpensesList(bank) {
    set({ showLoader: true, currentSelectedBankId: bank.bankId })
    try {
      const s = get()
      const ps = s.pageSize === ALL ? s.currentTotalExpenses * 100 : s.pageSize
      const r = await axios.get(`${BASE_URL}expenses/`, { params: { per_page: ps, page_number: s.pageNumber, bank_id: bank.bankId } })
      const { expenses, topup, nonTopup, total } = get()._parseExpenses(r.data?.expenses || [])
      set({ filteredExpensesList: expenses, currentTotalOfTopupExpenses: topup, currentTotalOfExpenses: nonTopup, currentTotalExpenses: total })
    } catch (err) { get().pushAlert(handleError(err)) }
    finally { set({ showLoader: false }) }
  },

  async fetchExpenses() {
    set({ showLoader: true })
    try {
      const s = get()
      const ps = s.pageSize === ALL ? s.currentTotalExpenses * 100 : s.pageSize
      const data = { page_number: s.pageNumber, per_page: ps, operator: s.searchOperator, advanced_search: s.isAdvancedSearch }
      if (s.isAdvancedSearch) {
        if (s.searchSelectedTags?.length) data.search_by_tags = s.searchSelectedTags
        if (s.searchSelectedBanks?.length) data.search_by_bank_ids = s.searchSelectedBanks
        if (s.searchEntryKeyword) data.search_by_keyword = s.searchEntryKeyword
        if (s.searchSelectedDaterange) data.search_by_daterange = {
          start_date: `${formatMyDates(s.searchSelectedDaterange[0])} 00:00`,
          end_date: `${formatMyDates(s.searchSelectedDaterange[1])} 00:00`
        }
      } else {
        data.bank_id = s.currentSelectedBankId
      }
      const r = await axios.get(`${BASE_URL}expenses/`, { params: { data: JSON.stringify(data) } })
      const { expenses, topup, nonTopup, total } = get()._parseExpenses(r.data?.expenses || [])
      set({ filteredExpensesList: expenses, currentTotalOfTopupExpenses: topup, currentTotalOfExpenses: nonTopup, currentTotalExpenses: total })
    } catch (err) { get().pushAlert(handleError(err)) }
    finally { set({ showLoader: false }) }
  },

  async submitExpense(data) {
    set({ showLoader: true })
    try {
      data.created_at = get().expenseEntryCreationDate
      const r = await axios.post(`${BASE_URL}expenses/create`, data)
      if (r.status === 201) window.location.reload()
    } catch (err) { set({ showLoader: false }); get().pushAlert(handleError(err)) }
  },

  async submitExpenseEntry(expenseId, list) {
    set({ showLoader: true })
    try {
      const r = await axios.patch(`${BASE_URL}expenses/add-entry`, list, { params: { id: expenseId } })
      if (r.status === 201) window.location.reload()
    } catch (err) { set({ showLoader: false }); get().pushAlert(handleError(err)) }
  },

  async deleteExpense(id) {
    set({ showLoader: true })
    try {
      const r = await axios.delete(`${BASE_URL}expenses/delete`, { params: { id } })
      if (r.status === 204) window.location.reload()
    } catch (err) { set({ showLoader: false }); get().pushAlert(handleError(err)) }
  },

  async deleteExpenseEntry(expenseId, eeId) {
    set({ showLoader: true })
    try {
      const r = await axios.delete(`${BASE_URL}expenses/delete-entry`, { params: { id: expenseId, ee_id: eeId } })
      if (r.status === 204) window.location.reload()
    } catch (err) { set({ showLoader: false }); get().pushAlert(handleError(err)) }
  },

  async createNewTag(name) {
    set({ showLoader: true })
    try {
      const r = await axios.post(`${BASE_URL}entry-tags/create`, { name })
      if (r.status === 201) window.location.reload()
    } catch (err) { set({ showLoader: false }); get().pushAlert(handleError(err)) }
  },

  async applyTagsToExpenseEntry(data) {
    set({ showLoader: true })
    try {
      const r = await axios.patch(`${BASE_URL}expenses/update-entry`, data)
      if (r.status === 201) {
        set({ selectedTags: r.data.data.selected_tags, showLoader: false, isApplyEntryTagVisible: false })
        window.location.reload()
      }
    } catch (err) { set({ showLoader: false }); get().pushAlert(handleError(err)) }
  },

  async createBank(data) {
    set({ showLoader: true })
    try {
      const r = await axios.post(`${BASE_URL}banks/create`, { ...data, current_balance: data.initial_balance, total_disbursed_till_now: 0 })
      if (r.status === 200) window.location.reload()
    } catch (err) { set({ showLoader: false }); get().pushAlert(handleError(err)) }
  },

  async deleteBank(bankId) {
    set({ showLoader: true })
    try {
      const r = await axios.delete(`${BASE_URL}banks/delete`, { params: { bank_id: bankId } })
      if (r.status === 204) window.location.reload()
    } catch (err) { set({ showLoader: false }); get().pushAlert(handleError(err)) }
  },

  async loginUser(data) {
    set({ showLoader: true })
    try {
      const r = await axios.post(`${BASE_URL}login`, data)
      localStorage.setItem('access_token', r.data.token)
      axios.defaults.headers.common['x-access-token'] = r.data.token
      window.location.reload()
    } catch (err) { set({ showLoader: false }); get().pushAlert(handleError(err)) }
  },

  async registerUser(data) {
    set({ showLoader: true })
    try {
      const r = await axios.post(`${BASE_URL}register`, data)
      if (r.status === 200) window.location.reload()
    } catch (err) { set({ showLoader: false }); get().pushAlert(handleError(err)) }
  },

  async updateUserPreferences(payload) {
    set({ showLoader: true })
    try {
      const r = await axios.patch(`${BASE_URL}user-preferences/update`, payload)
      if (r.status === 200) window.location.reload()
    } catch (err) { set({ showLoader: false }); get().pushAlert(handleError(err)) }
  },

  logoutUser() {
    localStorage.removeItem('access_token')
    delete axios.defaults.headers.common['x-access-token']
    window.location.reload()
  }
}))
