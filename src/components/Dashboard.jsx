import React, { useState } from 'react'
import { useStore } from '../store/useStore.js'
import Topbar from './Topbar.jsx'
import Sidebar from './Sidebar.jsx'
import SearchPanel from './SearchPanel.jsx'
import ExpenseTable from './ExpenseTable.jsx'
import Pagination from './Pagination.jsx'
import AddExpenseDrawer from './AddExpenseDrawer.jsx'
import CreateBankDialog from './CreateBankDialog.jsx'
import CreateTagDialog from './CreateTagDialog.jsx'
import ApplyTagsDialog from './ApplyTagsDialog.jsx'

export default function Dashboard() {
  const { setApplyEntryTagVisible, setApplyTagEntry } = useStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [drawerOpen,  setDrawerOpen]  = useState(false)
  const [searchOpen,  setSearchOpen]  = useState(false)
  const [tagDialogOpen, setTagDialogOpen] = useState(false)
  const [tagFilter,   setTagFilter]   = useState(null)
  const [activeTab,   setActiveTab]   = useState('home') // for bottom nav
  const handleEditEntry = entry => { setApplyTagEntry(entry); setApplyEntryTagVisible(true) }

  return (
    <div className="app-shell">
      <Topbar onMenuClick={() => setSidebarOpen(v => !v)} />

      <div className="body-layout">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} activeTagFilter={tagFilter} onTagFilter={setTagFilter} />

        <main className="main-content">
          {/* Command Bar */}
          <div className="command-bar">
            <div className="cmd-search" onClick={() => setSearchOpen(v => !v)} style={{cursor:'pointer'}}>
              <span style={{color:'var(--faint)',fontSize:16,flexShrink:0}}>⌕</span>
              <span className="cmd-input-area" style={{color:'var(--faint)'}}>Search / filter expenses...</span>
            </div>
            <div className="cmd-actions">
              
              <button onClick={() => setTagDialogOpen(true)} className='add-expense-btn'>
                + Tag
              </button>
              <button className="add-expense-btn" onClick={() => setDrawerOpen(true)}>
                <span>＋</span><span className="btn-text">Add Expense</span>
              </button>
            </div>
          </div>

          {/* Search Panel */}
          <SearchPanel open={searchOpen} />

          {/* Expense Table */}
          <ExpenseTable onEditEntry={handleEditEntry} />

          {/* Pagination */}
          <Pagination />
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          <button className={`bnav-item${activeTab==='home'?' active':''}`} onClick={() => setActiveTab('home')}>
            <div className="bnav-icon">📊</div>
            <div className="bnav-label">Expenses</div>
          </button>
          <button className={`bnav-item${sidebarOpen?' active':''}`} onClick={() => setSidebarOpen(v=>!v)}>
            <div className="bnav-icon">🏦</div>
            <div className="bnav-label">Accounts</div>
          </button>
          {/* FAB */}
          <button className="bnav-add-btn" onClick={() => setDrawerOpen(true)}>
            <div className="bnav-add-circle">＋</div>
          </button>
          <button className={`bnav-item${searchOpen?' active':''}`} onClick={() => setSearchOpen(v=>!v)}>
            <div className="bnav-icon">🔍</div>
            <div className="bnav-label">Search</div>
          </button>
          <button className={`bnav-item${activeTab==='tags'?' active':''}`} onClick={() => { setActiveTab('tags'); setTagDialogOpen(true) }}>
            <div className="bnav-icon">🏷</div>
            <div className="bnav-label">Tags</div>
          </button>
        </div>
      </nav>

      {/* Overlays */}
      <AddExpenseDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <CreateBankDialog />
      <CreateTagDialog open={tagDialogOpen} onClose={() => setTagDialogOpen(false)} />
      <ApplyTagsDialog />
    </div>
  )
}
