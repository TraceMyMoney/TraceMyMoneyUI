import React, { useState } from 'react'
import { useStore, fmtNum, filterValidExpenses } from '../store/useStore.js'
import { Trash2, Tag } from 'lucide-react'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const monthName = m => MONTHS[parseInt(m,10)-1] || ''

/* ── Inline add entries (shared desktop + mobile) ── */
function InlineAddEntries({ expenseId, mini }) {
  const { entryTags, submitExpenseEntry } = useStore()
  const [entries, setEntries] = useState([])
  const add = () => setEntries(e => [...e, { amount:'', description:'', tags:[] }])
  const remove = i => setEntries(e => e.filter((_,j)=>j!==i))
  const update = (i,k,v) => setEntries(e => e.map((en,j) => j===i ? {...en,[k]:v} : en))
  const toggleTag = (i,v) => setEntries(e => e.map((en,j) => j===i ? {...en, tags: en.tags.includes(v) ? en.tags.filter(t=>t!==v) : [...en.tags,v]} : en))
  const submit = () => {
    const valid = filterValidExpenses(entries.map(e => ({ amount: Number(e.amount), description: e.description, entry_tags: e.tags })))
    if (valid.length) submitExpenseEntry(expenseId, valid)
  }
  const padClass = mini ? 'mobile-inline-add' : 'inline-add-entries'
  return (
    <div className={padClass}>
      {entries.map((en,i) => (
        <div key={i}>
          <div className="inline-entry-row">
            <input className="inline-input" type="number" placeholder="₹ Amount" value={en.amount} onChange={e=>update(i,'amount',e.target.value)} />
            <input className="inline-input desc" placeholder="Description..." value={en.description} onChange={e=>update(i,'description',e.target.value)} />
            <button className="inline-remove-btn" onClick={()=>remove(i)}>×</button>
          </div>
          {entryTags.length > 0 && (
            <div className="inline-entry-tags">
              {entryTags.slice(0,8).map(t => (
                <div key={t.value} className={`inline-tag-pill${en.tags.includes(t.value)?' active':''}`} onClick={()=>toggleTag(i,t.value)}>{t.title}</div>
              ))}
            </div>
          )}
        </div>
      ))}
      <div className="inline-actions">
        <button className="inline-add-btn" onClick={add}>＋ Add Entry</button>
        {entries.length > 0 && <button className="inline-save-btn" onClick={submit}>Save →</button>}
      </div>
    </div>
  )
}

/* ── Desktop table row ── */
function DesktopRow({ exp, open, onToggle, onEditEntry }) {
  const { privacyMode, deleteExpense, deleteExpenseEntry } = useStore()
  const day = (exp.created_at || '').slice(0, 2)
  const mon = monthName((exp.created_at || '').slice(3, 5))
  const allTags = (exp.expenses||[]).flatMap(e=>e.entry_tags||[]).filter((v,i,a)=>a.indexOf(v)===i).slice(0,3)
  const [hovEnt, setHovEnt] = useState(null)
  return (
    <div className="expense-group">
      <div className={`expense-row${open?' open':''}`} onClick={onToggle}>
        {open && <div className="expense-row-accent"/>}
        {/* Date */}
        <div>
          <div className={`exp-date-day${open?' active':''}`}>{day}</div>
          <div className="exp-date-mon">{mon}</div>
        </div>
        {/* Meta */}
        <div>
          <div className="exp-meta-bank"><div className="exp-meta-dot"/>{exp.bank_name}</div>
          <div className="exp-meta-day">{exp.day}</div>
        </div>
        {/* Preview tags — hidden on tablet */}
        <div className="exp-previews exp-preview-col">
          
        </div>
        {/* Topup — hidden on tablet/mobile */}
        <div className="exp-amt exp-remaining-col">
          {exp.topup_expense_total < 0
            ? <div className="exp-amt-main" style={{color:'var(--green)'}}>{privacyMode?'••••':`+₹${fmtNum(Math.abs(exp.topup_expense_total))}`}</div>
            : <div className="exp-amt-main" style={{color:'var(--faint)',fontSize:18}}>—</div>}
        </div>
        {/* Spent */}
        <div className="exp-amt">
          <div className="exp-amt-main" style={{color:'var(--red)'}}>{privacyMode?'••••':`₹${fmtNum(exp.expense_total)}`}</div>
        </div>
        {/* Remaining */}
        <div className="exp-amt exp-remaining-col" style={{marginRight: 12}}>
          <div className="exp-amt-main">{privacyMode?'••••':`₹${fmtNum(exp.remaining_amount_till_now)}`}</div>
        </div>
        {/* Actions */}
        <div className="exp-chev-wrap">
        <button className="exp-del-btn" onClick={e=>{e.stopPropagation(); if(confirm('Delete?')) deleteExpense(exp.id)}}>
          <Trash2 size={16} />
        </button> 
          <div className={`exp-chev${open?' open':''}`}>▾</div>
        </div>
      </div>

      {open && (
        <div className="entries-panel">
          {(exp.expenses||[]).map(item => (
            <div key={item.ee_id} className="entry-row" onMouseEnter={()=>setHovEnt(item.ee_id)} onMouseLeave={()=>setHovEnt(null)}>
              <div className='my__flex'>
                <div style={{display:'flex', alignItems: 'center'}}>
                  <div className="entry-desc" style={{marginRight: 5}} onClick={()=>onEditEntry({...item,expenseId:exp.id})}>{item.description}</div>
                  {item.entry_tags?.length > 0 && <Tag color="#5C970B" size={12} className="entry-tagged-icon" />}
                </div>
                <div className="entry-amt-val" style={{color:item.amount<0?'var(--green)':'var(--red)'}}>
                  {item.amount<0?`+₹${fmtNum(Math.abs(item.amount))}` : `₹${fmtNum(item.amount)}`}
                </div>
              </div>
              <button className="entry-del-btn" style={{opacity:hovEnt===item.ee_id?1:0}} onClick={()=>{if(confirm('Delete entry?')) deleteExpenseEntry(exp.id,item.ee_id)}}>×</button>
            </div>
          ))}
          <InlineAddEntries expenseId={exp.id} />
        </div>
      )}
    </div>
  )
}

/* ── Mobile card ── */
function MobileCard({ exp, open, onToggle, onEditEntry }) {
  const { privacyMode, deleteExpense, deleteExpenseEntry } = useStore()
  const day = (exp.created_at||'').slice(8,10)
  const mon = monthName((exp.created_at||'').slice(5,7))
  const allTags = (exp.expenses||[]).flatMap(e=>e.entry_tags||[]).filter((v,i,a)=>a.indexOf(v)===i).slice(0,4)

  return (
    <div className={`expense-card${open?' open':''}`} onClick={onToggle}>
      <div className="expense-card-top">
        <div className="expense-card-date">
          <div className="expense-card-day">{day}</div>
          <div className="expense-card-mon">{mon}</div>
        </div>
        <div className="expense-card-body">
          <div className="expense-card-bank">
            <div className="exp-meta-dot"/>
            {exp.bank_name}
          </div>
          <div className="expense-card-amounts">
            {exp.topup_expense_total < 0 && (
              <span className="expense-card-amt" style={{color:'var(--green)',fontSize:15}}>{privacyMode?'••••':`+₹${fmtNum(Math.abs(exp.topup_expense_total))}`}</span>
            )}
            <span className="expense-card-amt" style={{color:'var(--red)'}}>{privacyMode?'••••':`₹${fmtNum(exp.expense_total)}`}</span>
            <span className="expense-card-remaining">=₹{privacyMode?'••••':fmtNum(exp.remaining_amount_till_now)}</span>
          </div>
          {allTags.length > 0 && (
            <div className="expense-card-tags">
              {allTags.map(t=><div key={t} className="exp-preview-tag">{t}</div>)}
            </div>
          )}
        </div>
        <div className="expense-card-actions" onClick={e=>e.stopPropagation()}>
          <button style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--faint)',fontSize:18}} onClick={()=>{if(confirm('Delete?')) deleteExpense(exp.id)}}>🗑</button>
          <div className={`exp-card-chev${open?' open':''}`}>▾</div>
        </div>
      </div>

      {open && (
        <div className="mobile-entries-panel" onClick={e=>e.stopPropagation()}>
          {(exp.expenses||[]).map(item => (
            <div key={item.ee_id} className="mobile-entry-item">
              <div style={{flex:1,minWidth:0}}>
                <div className="mobile-entry-desc" onClick={()=>onEditEntry({...item,expenseId:exp.id})}>{item.description}</div>
                {item.entry_tags?.length > 0 && <div className="entry-tag-list" style={{marginTop:4}}>{item.entry_tags.map(t=><span key={t} className="entry-tag">{t}</span>)}</div>}
              </div>
              <div className="mobile-entry-amt" style={{color:item.amount<0?'var(--green)':'var(--red)'}}>
                {item.amount<0?`+₹${fmtNum(Math.abs(item.amount))}` : `₹${fmtNum(item.amount)}`}
              </div>
              <button style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--faint)',fontSize:16,flexShrink:0}} onClick={()=>{if(confirm('Delete entry?')) deleteExpenseEntry(exp.id,item.ee_id)}}>×</button>
            </div>
          ))}
          <InlineAddEntries expenseId={exp.id} mini />
        </div>
      )}
    </div>
  )
}

/* ── Main component ── */
export default function ExpenseTable({ onEditEntry }) {
  const { filteredExpensesList } = useStore()
  const [openRows, setOpenRows] = useState(new Set())

  const toggle = id => setOpenRows(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  if (!filteredExpensesList.length) return (
    <div className="table-area">
      <div className="table-empty">
        <div className="table-empty-rupee">₹</div>
        <div className="table-empty-title">No records found</div>
        <div className="table-empty-sub">Add your first expense using the button above</div>
      </div>
    </div>
  )

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
        <div/>
      </div>

      {filteredExpensesList.map(exp => (
        <React.Fragment key={exp.id}>
          {/* Desktop row */}
          <DesktopRow exp={exp} open={openRows.has(exp.id)} onToggle={() => toggle(exp.id)} onEditEntry={onEditEntry} />
          {/* Mobile card — CSS shows/hides via media query */}
          <MobileCard exp={exp} open={openRows.has(exp.id)} onToggle={() => toggle(exp.id)} onEditEntry={onEditEntry} />
        </React.Fragment>
      ))}
    </div>
  )
}
