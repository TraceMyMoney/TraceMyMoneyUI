import React, { useState, useEffect } from 'react'
import DatePicker from 'react-datepicker'
import { useStore, filterValidExpenses } from '../store/useStore.js'
import TagSearchSelect from './TagSearchSelect.jsx'

export default function AddExpenseDrawer({ open, onClose }) {
  const { bankItems, entryTags, setExpenseEntryCreationDate, submitExpense } = useStore()
  const [bank, setBank] = useState('')
  const [date, setDate] = useState(new Date())
  const [entries, setEntries] = useState([{ amount:'', description:'', tags:[] }])

  useEffect(() => { if (open && bankItems.length) setBank(bankItems[0].value) }, [open, bankItems])

  const addEntry = () => setEntries(e => [...e, { amount:'', description:'', tags:[] }])
  const removeEntry = i => setEntries(e => e.filter((_,j)=>j!==i))
  const updateEntry = (i,k,v) => setEntries(e => e.map((en,j) => j===i ? {...en,[k]:v} : en))
  const submit = async () => {
    const d = new Date(date)
    setExpenseEntryCreationDate(`${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()} 00:00`)
    const valid = filterValidExpenses(entries.map(e => ({ amount:Number(e.amount), description:e.description, entry_tags:e.tags })))
    if (!valid.length || !bank) return
    const ok = await submitExpense({ bank_id: bank, expenses: valid })
    if (ok) {
      setEntries([{ amount: '', description: '', tags: [] }])
      onClose?.()
    }
  }

  if (!open) return null
  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <div className="drawer-title">Add <span>Expense</span></div>
          <button className="drawer-close" onClick={onClose}>×</button>
        </div>
        <div className="drawer-body">
          <div>
            <label className="d-label">Account</label>
            <select className="d-select" value={bank} onChange={e=>setBank(e.target.value)}>
              {bankItems.map(b=><option key={b.value} value={b.value}>{b.title}</option>)}
            </select>
          </div>
          <div>
            <label className="d-label">Date</label>
            <DatePicker selected={date} onChange={d=>setDate(d)} maxDate={new Date()} dateFormat="dd/MM/yyyy" />
          </div>
          <div>
            <label className="d-label">Entries</label>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {entries.map((en,i) => (
                <div key={i} className="d-entry-card">
                  <div className="d-entry-row">
                    <input className="d-entry-input" type="number" placeholder="₹ Amount" value={en.amount} onChange={e=>updateEntry(i,'amount',e.target.value)} />
                    <input className="d-entry-input desc" placeholder="Description (-ve = top-up)" value={en.description} onChange={e=>updateEntry(i,'description',e.target.value)} />
                    <button className="d-entry-del" onClick={()=>removeEntry(i)}>×</button>
                  </div>
                  {entryTags.length > 0 && (
                    <div className="d-entry-tags-field">
                      <label className="d-label d-label-inline">Tags</label>
                      <TagSearchSelect
                        tags={entryTags}
                        selected={en.tags}
                        onChange={next => updateEntry(i, 'tags', next)}
                      />
                    </div>
                  )}
                </div>
              ))}
              <button className="d-add-entry-btn" onClick={addEntry}>＋ Add Another Entry</button>
            </div>
          </div>
        </div>
        <div className="drawer-footer">
          <button className="d-btn d-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="d-btn d-btn-primary" onClick={submit}>Submit →</button>
        </div>
      </div>
    </>
  )
}
