import React, { useState } from 'react'
import { useStore } from '../store/useStore.js'
export default function CreateTagDialog({ open, onClose }) {
  const { entryTags, createNewTag } = useStore()
  const [name, setName] = useState('')
  const submit = () => { if (name.trim()) createNewTag(name.trim()) }
  if (!open) return null
  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-panel" onClick={e=>e.stopPropagation()}>
        <div className="dialog-header">
          <div className="dialog-icon purple">🏷</div>
          <div><div className="dialog-title">Create Tag</div><div className="dialog-sub">Add a label for your entries</div></div>
          <button className="dialog-close" onClick={onClose}>×</button>
        </div>
        <div className="dialog-body">
          <div>
            <label className="d-label">Tag Name</label>
            <div className="d-input-wrap">
              <div className="d-input-icon">🏷</div>
              <input className="d-input-field" placeholder="e.g. Groceries, Rent..." value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} autoFocus />
            </div>
          </div>
          {entryTags.length > 0 && (
            <div>
              <label className="d-label">Existing ({entryTags.length})</label>
              <div className="tag-pills-grid">
                {entryTags.map(t=><div key={t.value} className="tag-select-pill">{t.title}</div>)}
              </div>
            </div>
          )}
        </div>
        <div className="dialog-footer">
          <button className="d-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="d-btn-create" disabled={!name.trim()} onClick={submit}>Create Tag</button>
        </div>
      </div>
    </div>
  )
}
