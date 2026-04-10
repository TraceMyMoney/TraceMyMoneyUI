import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'

function clampMenuPosition(rect) {
  const GUTTER = 10
  const vw = window.innerWidth
  const vh = window.innerHeight
  const maxUsableW = Math.max(120, vw - 2 * GUTTER)
  const minPreferred = Math.min(220, maxUsableW)
  let width = Math.max(rect.width, minPreferred)
  width = Math.min(width, maxUsableW)
  const left = Math.max(GUTTER, Math.min(rect.left, Math.max(GUTTER, vw - width - GUTTER)))
  const top = rect.bottom + 4
  const maxListHeight = Math.max(120, Math.min(280, vh - top - GUTTER))
  return { top, left, width, maxListHeight }
}

export default function TagSearchSelect({ tags, selected, onChange, placeholder = 'Search tags…', zIndex = 502 }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState(null)
  const wrapRef = useRef(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tags
    return tags.filter(
      t =>
        (t.title || '').toLowerCase().includes(q) || String(t.value ?? '').toLowerCase().includes(q)
    )
  }, [tags, query])

  const syncMenuPosition = useCallback(() => {
    if (!wrapRef.current) return
    setMenuPos(clampMenuPosition(wrapRef.current.getBoundingClientRect()))
  }, [])

  useLayoutEffect(() => {
    if (!open || !wrapRef.current) return
    syncMenuPosition()
    window.addEventListener('resize', syncMenuPosition)
    const vv = window.visualViewport
    if (vv) {
      vv.addEventListener('resize', syncMenuPosition)
    }
    return () => {
      window.removeEventListener('resize', syncMenuPosition)
      if (vv) {
        vv.removeEventListener('resize', syncMenuPosition)
      }
    }
  }, [open, query, syncMenuPosition])

  useEffect(() => {
    if (!open) return
    const onDoc = e => {
      if (wrapRef.current?.contains(e.target)) return
      if (e.target.closest?.('.tag-search-dropdown-portal')) return
      setOpen(false)
    }
    const onScroll = () => setOpen(false)
    document.addEventListener('pointerdown', onDoc)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('pointerdown', onDoc)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  const toggle = value => {
    const next = selected.includes(value) ? selected.filter(x => x !== value) : [...selected, value]
    onChange(next)
  }

  const remove = value => onChange(selected.filter(x => x !== value))

  const selectedMeta = useMemo(
    () => selected.map(v => tags.find(t => t.value === v)).filter(Boolean),
    [selected, tags]
  )

  return (
    <div className="tag-search-select" ref={wrapRef}>
      {selectedMeta.length > 0 && (
        <div className="tag-search-selected">
          {selectedMeta.map(t => (
            <span key={t.value} className="tag-search-chip">
              <span className="tag-search-chip-text">{t.title}</span>
              <button type="button" className="tag-search-chip-remove" aria-label={`Remove ${t.title}`} onClick={() => remove(t.value)}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        className="tag-search-input"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        aria-expanded={open}
        aria-haspopup="listbox"
      />
      {open &&
        menuPos &&
        createPortal(
          <div
            className="tag-search-dropdown-portal"
            style={{
              position: 'fixed',
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
              zIndex,
            }}
            role="listbox"
            aria-multiselectable="true"
          >
            <div className="tag-search-list" style={{ maxHeight: menuPos.maxListHeight }}>
              {filtered.length === 0 ? (
                <div className="tag-search-empty">No tags match</div>
              ) : (
                filtered.map(t => {
                  const isOn = selected.includes(t.value)
                  return (
                    <div
                      key={t.value}
                      role="option"
                      aria-selected={isOn}
                      tabIndex={-1}
                      className={`tag-search-option${isOn ? ' active' : ''}`}
                      onClick={() => toggle(t.value)}
                    >
                      <span className="tag-search-option-label">{t.title}</span>
                      {isOn && <span className="tag-search-check">✓</span>}
                    </div>
                  )
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
