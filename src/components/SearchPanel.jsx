import React, { useState } from 'react'
import DatePicker from 'react-datepicker'
import { useStore } from '../store/useStore.js'

const PAGE_SIZES = [5, 10, 15, 20, 'ALL']

export default function SearchPanel({ open }) {
  const { entryTags, bankItems, searchSelectedTags, searchSelectedBanks, searchOperator, pageSize, isAdvancedSearch,
    setSearchSelectedTags, setSearchSelectedBanks, setSearchEntryKeyword, setSearchSelectedDaterange,
    setSearchOperator, setPageSize, setPageNumber, setAdvancedSearch, fetchExpenses } = useStore()
  const [keyword, setKeyword] = useState('')
  const [dateRange, setDateRange] = useState([null, null])
  const [start, end] = dateRange

  const toggleTag  = v => setSearchSelectedTags(searchSelectedTags.includes(v)  ? searchSelectedTags.filter(t => t !== v)  : [...searchSelectedTags, v])
  const toggleBank = v => setSearchSelectedBanks(searchSelectedBanks.includes(v) ? searchSelectedBanks.filter(b => b !== v) : [...searchSelectedBanks, v])

  const search = () => {
    setAdvancedSearch(true)
    setSearchEntryKeyword(keyword)
    if (start && end) setSearchSelectedDaterange([start, end])
    fetchExpenses()
  }
  const reset = () => {
    setSearchSelectedTags([]); setSearchSelectedBanks([]); setSearchEntryKeyword(''); setSearchSelectedDaterange(null)
    setSearchOperator('and'); setAdvancedSearch(false); setPageNumber(1)
    setKeyword(''); setDateRange([null, null]); fetchExpenses()
  }

  return (
    <div className={`search-panel${open ? ' open' : ''}`}>
      <div className="search-panel-inner">
        <div className="search-grid">
          <div>
            <label className="search-field-label">Filter by Tag</label>
            <div className="search-tags-cloud">
              {entryTags.slice(0,8).map(t => (
                <div key={t.value} className={`search-chip${searchSelectedTags.includes(t.value) ? ' active' : ''}`} onClick={() => toggleTag(t.value)}>{t.title}</div>
              ))}
            </div>
          </div>
          <div>
            <label className="search-field-label">Filter by Account</label>
            <div className="search-tags-cloud">
              {bankItems.map(b => (
                <div key={b.value} className={`search-chip${searchSelectedBanks.includes(b.value) ? ' active' : ''}`} onClick={() => toggleBank(b.value)}>{b.title}</div>
              ))}
            </div>
          </div>
          <div>
            <label className="search-field-label">Keyword</label>
            <div className="search-input-wrap">
              <input className="search-input" placeholder="Search descriptions..." value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} />
              {keyword && <button onClick={() => { setKeyword(''); setSearchEntryKeyword('') }} style={{ padding:'0 8px', background:'transparent', border:'none', cursor:'pointer', color:'var(--faint)', fontSize:16 }}>×</button>}
            </div>
          </div>
          <div>
            <label className="search-field-label">Date Range</label>
            <DatePicker selectsRange startDate={start} endDate={end} onChange={([s,e]) => setDateRange([s,e])} maxDate={new Date()} placeholderText="Select range..." dateFormat="dd/MM/yyyy" isClearable />
          </div>
        </div>
        <div className="search-controls">
          <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
            <div className="op-toggle">
              <button className={`op-btn${searchOperator === 'and' ? ' active' : ''}`} onClick={() => setSearchOperator('and')}>AND</button>
              <button className={`op-btn${searchOperator === 'or' ? ' active' : ''}`} onClick={() => setSearchOperator('or')}>OR</button>
            </div>
            <select className="page-size-select" value={pageSize} onChange={e => { setPageSize(e.target.value === 'ALL' ? 'all' : Number(e.target.value)); setPageNumber(1); fetchExpenses() }}>
              {PAGE_SIZES.map(p => <option key={p} value={p}>{p} per page</option>)}
            </select>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button className={`reset-btn${isAdvancedSearch ? ' active' : ''}`} onClick={reset}>↺ Reset</button>
            <button className="search-btn" onClick={search}>Search →</button>
          </div>
        </div>
      </div>
    </div>
  )
}
