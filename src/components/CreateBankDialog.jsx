import React, { useState } from 'react'
import { useStore } from '../store/useStore.js'
export default function CreateBankDialog() {
  const { isCreateBankDialogVisible, setCreateBankDialogVisible, createBank } = useStore()
  const [name, setName] = useState('')
  const [bal, setBal] = useState('')
  const submit = () => { if (name && bal) createBank({ name, initial_balance: Number(bal) }) }
  if (!isCreateBankDialogVisible) return null
  return (
    <div className="dialog-overlay" onClick={()=>setCreateBankDialogVisible(false)}>
      <div className="dialog-panel" onClick={e=>e.stopPropagation()}>
        <div className="dialog-header">
          <div className="dialog-icon acid">🏦</div>
          <div><div className="dialog-title">New Account</div><div className="dialog-sub">Add a bank or wallet to track</div></div>
          <button className="dialog-close" onClick={()=>setCreateBankDialogVisible(false)}>×</button>
        </div>
        <div className="dialog-body">
          <div>
            <label className="d-label">Account Name</label>
            <div className="d-input-wrap">
              <div className="d-input-icon">🏛</div>
              <input className="d-input-field" placeholder="HDFC SAVINGS" value={name} onChange={e=>setName(e.target.value.toUpperCase())} onKeyDown={e=>e.key==='Enter'&&submit()} autoFocus />
            </div>
          </div>
          <div>
            <label className="d-label">Initial Balance (₹)</label>
            <div className="d-input-wrap">
              <div className="d-input-icon">₹</div>
              <input className="d-input-field" style={{fontFamily:'var(--f-mono)'}} type="number" placeholder="0.00" value={bal} onChange={e=>setBal(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} />
            </div>
          </div>
        </div>
        <div className="dialog-footer">
          <button className="d-btn-cancel" onClick={()=>setCreateBankDialogVisible(false)}>Cancel</button>
          <button className="d-btn-create" disabled={!name||!bal} onClick={submit}>Create Account</button>
        </div>
      </div>
    </div>
  )
}
