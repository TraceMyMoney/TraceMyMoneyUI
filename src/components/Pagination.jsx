import React from 'react'
import { useStore } from '../store/useStore.js'
import { usePhoneScreen } from '../useWideScreen.js'
export default function Pagination() {
  const { currentTotalExpenses, pageNumber, pageSize, setPageNumber, fetchExpenses } = useStore()
  const phone = usePhoneScreen()
  const ps = pageSize === 'all' ? currentTotalExpenses : Number(pageSize)
  const totalPages = Math.max(1, Math.ceil(currentTotalExpenses / ps))
  const go = p => { setPageNumber(p); fetchExpenses() }
  const getRange = () => {
    if (totalPages <= 7) return Array.from({length:totalPages},(_,i)=>i+1)
    const pages = [1]
    if (pageNumber > 3) pages.push('...')
    for (let i = Math.max(2,pageNumber-1); i <= Math.min(totalPages-1,pageNumber+1); i++) pages.push(i)
    if (pageNumber < totalPages-2) pages.push('...')
    pages.push(totalPages)
    return pages
  }
  if (!currentTotalExpenses) return null
  const start = ((pageNumber-1)*ps)+1, end = Math.min(pageNumber*ps, currentTotalExpenses)
  if (phone) {
    // Compact dock for phones: prev, "Page 1 of 6", next. The Add button
    // floats on the right of this bar.
    return (
      <div className="pagination pagination--phone">
        <button className="pg-btn" aria-label="Previous page" disabled={pageNumber<=1} onClick={()=>go(pageNumber-1)}>‹</button>
        <div className="pg-compact">
          <b>Page {pageNumber} of {totalPages}</b>
          <span>{start}–{end} of {currentTotalExpenses}</span>
        </div>
        <button className="pg-btn" aria-label="Next page" disabled={pageNumber>=totalPages} onClick={()=>go(pageNumber+1)}>›</button>
      </div>
    )
  }
  return (
    <div className="pagination">
      <div className="pagination-info">{start}–{end} of {currentTotalExpenses} · page {pageNumber}/{totalPages}</div>
      <div className="pagination-btns">
        <button className="pg-btn" disabled={pageNumber<=1} onClick={()=>go(pageNumber-1)}>‹</button>
        {getRange().map((p,i) => p==='...'
          ? <span key={`d${i}`} className="pg-ellipsis">···</span>
          : <button key={p} className={`pg-btn${p===pageNumber?' active':''}`} onClick={()=>go(p)}>{p}</button>
        )}
        <button className="pg-btn" disabled={pageNumber>=totalPages} onClick={()=>go(pageNumber+1)}>›</button>
      </div>
    </div>
  )
}
