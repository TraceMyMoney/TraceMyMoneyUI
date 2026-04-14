import React, { useState, useEffect } from 'react'
import { useStore } from '../store/useStore.js'
import TagSearchSelect from './TagSearchSelect.jsx'
export default function ApplyTagsDialog() {
  const { isApplyEntryTagVisible, setApplyEntryTagVisible, applyTagEntry, entryTags, applyTagsToExpenseEntry } = useStore()
  const [desc, setDesc] = useState('')
  const [tags, setTags] = useState([])
  useEffect(() => {
    if (isApplyEntryTagVisible && applyTagEntry) { setDesc(applyTagEntry.description||''); setTags(applyTagEntry.entry_tags||[]) }
  }, [isApplyEntryTagVisible, applyTagEntry])
  const save = () => {
    if (!applyTagEntry) return
    applyTagsToExpenseEntry({ entry_id:applyTagEntry.ee_id, expense_id:applyTagEntry.expenseId, entry_tags:tags, updated_description:desc })
  }
  if (!isApplyEntryTagVisible) return null
  return (
    <div className="dialog-overlay" onClick={()=>setApplyEntryTagVisible(false)}>
      <div className="dialog-panel wide" onClick={e=>e.stopPropagation()}>
        <div className="dialog-header">
          <div className="dialog-icon purple">🏷</div>
          <div><div className="dialog-title">Edit Entry</div><div className="dialog-sub">Update description & labels</div></div>
          <button className="dialog-close" onClick={()=>setApplyEntryTagVisible(false)}>×</button>
        </div>
        <div className="dialog-body">
          <div>
            <label className="d-label">Description</label>
            <div className="d-input-wrap">
              <div className="d-input-icon">✏</div>
              <input className="d-input-field" style={{fontFamily:'var(--f-body)'}} value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Entry description..." />
            </div>
          </div>
          {entryTags.length > 0 && (
            <div className="d-entry-tags-field">
              <label className="d-label d-label-inline">Tags ({tags.length} selected)</label>
              <TagSearchSelect tags={entryTags} selected={tags} onChange={setTags} zIndex={650} />
            </div>
          )}
        </div>
        <div className="dialog-footer">
          <button className="d-btn-cancel" onClick={()=>setApplyEntryTagVisible(false)}>Cancel</button>
          <button className="d-btn-purple" onClick={save}>Save Changes</button>
        </div>
      </div>
    </div>
  )
}
