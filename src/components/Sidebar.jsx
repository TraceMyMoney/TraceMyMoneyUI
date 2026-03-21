import React, { useState } from 'react'
import { useStore, fmtNum } from '../store/useStore.js'

const TAGS = ['Rent','Food','Transport','Shopping','Health','Utilities','EMI','Misc']
const COLORS = ['var(--acid)', 'var(--blue)', 'var(--amber)', 'var(--purple)', 'var(--green)']

export default function Sidebar({ open, onClose, activeTagFilter, onTagFilter }) {
  const { banksList, privacyMode, currentTotalOfTopupExpenses, currentTotalOfExpenses, currentTotalExpenses, fetchFilteredExpensesList, setCreateBankDialogVisible, deleteBank } = useStore()
  const [activeIdx, setActiveIdx] = useState(0)

  const selectBank = (bank, i) => { setActiveIdx(i); fetchFilteredExpensesList(bank); onClose?.() }
  const delBank = (e, id) => { e.stopPropagation(); if (confirm('Delete this account?')) deleteBank(id) }
  const netBal = currentTotalOfTopupExpenses - currentTotalOfExpenses

  return (
    <>
      {/* Backdrop for mobile/tablet */}
      <div className={`sidebar-backdrop${open ? ' open' : ''}`} onClick={onClose} />

      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-section">
          <div style={{ height: 16 }} />
          <div className="sidebar-section-label">Accounts</div>

          {banksList.map((bank, i) => {
            const active = activeIdx === i
            const color = COLORS[i % COLORS.length]
            return (
              <div key={bank.bankId} className={`account-card${active ? ' active' : ''}`} onClick={() => selectBank(bank, i)}>
                {active && <div className="account-card-indicator" />}
                <div className="account-initial" style={active ? { background: `${color}15`, borderColor: `${color}35`, color } : {}}>{bank.bankName.charAt(0)}</div>
                <div className="account-info">
                  <div className="account-name">{bank.bankName}</div>
                  <div className="account-bal">₹{fmtNum(bank.remainingBalance, privacyMode)}</div>
                </div>
                <button className="account-del-btn" onClick={e => delBank(e, bank.bankId)}>×</button>
              </div>
            )
          })}

          <button className="add-account-btn" onClick={() => { setCreateBankDialogVisible(true); onClose?.() }}>
            ＋ New Account
          </button>
        </div>
        <div className="sidebar-footer">TMM v2.0 · {new Date().toLocaleDateString('en-IN')}</div>
      </aside>
    </>
  )
}
