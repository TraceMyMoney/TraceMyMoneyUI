import React, { useState, useMemo, useRef, useEffect } from "react";
import { useStore } from "../store/useStore.js";

export default function CreateTagDialog({ open, onClose }) {
  const { entryTags, createNewTag } = useStore();
  const [name, setName] = useState("");
  const inputWrapRef = useRef(null);
  const dropdownRef = useRef(null);

  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();

  const exactMatch = useMemo(
    () => entryTags.find((t) => t.title.toLowerCase() === lower),
    [entryTags, lower],
  );

  const suggestions = useMemo(() => {
    if (!trimmed) return [];
    return entryTags.filter((t) => t.title.toLowerCase().includes(lower));
  }, [entryTags, trimmed, lower]);

  const canCreate = trimmed.length > 0 && !exactMatch;
  const showDropdown = trimmed.length > 0 && suggestions.length > 0;

  const submit = () => {
    if (canCreate) createNewTag(trimmed);
  };

  const handleKey = (e) => {
    if (e.key === "Enter") submit();
    if (e.key === "Escape") onClose();
  };

  // Position the dropdown directly below the input wrap
  useEffect(() => {
    if (!showDropdown || !inputWrapRef.current || !dropdownRef.current) return;
    const rect = inputWrapRef.current.getBoundingClientRect();
    dropdownRef.current.style.top = `${rect.bottom + 4}px`;
    dropdownRef.current.style.left = `${rect.left}px`;
    dropdownRef.current.style.width = `${rect.width}px`;
  }, [showDropdown, suggestions]);

  // Reset input when dialog opens
  useEffect(() => {
    if (open) setName("");
  }, [open]);

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dialog-header">
          <div className="dialog-icon purple">🏷</div>
          <div>
            <div className="dialog-title">Create Tag</div>
            <div className="dialog-sub">Type a name to search or create</div>
          </div>
          <button className="dialog-close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Body — fixed layout, never resizes */}
        <div className="create-tag-body">
          <label className="d-label">Tag Name</label>

          {/* Input row */}
          <div
            ref={inputWrapRef}
            className={`d-input-wrap${exactMatch ? " d-input-wrap--error" : ""}`}
          >
            <div className="d-input-icon">🏷</div>
            <input
              className="d-input-field"
              placeholder="e.g. Groceries, Rent…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKey}
              autoFocus
              autoComplete="off"
            />
            {trimmed.length > 0 &&
              (exactMatch ? (
                <span className="tag-input-badge tag-input-badge--exists">
                  Already exists
                </span>
              ) : (
                <span className="tag-input-badge tag-input-badge--new">
                  New ✦
                </span>
              ))}
          </div>

          {/* Static hint line — always occupies same space */}
          <div className="create-tag-hint">
            {!trimmed &&
              "Start typing to search existing tags or create a new one."}
            {trimmed && exactMatch && (
              <span className="create-tag-hint--error">
                ⚠ <strong>{exactMatch.title}</strong> already exists — pick a
                different name.
              </span>
            )}
            {trimmed && !exactMatch && (
              <span className="create-tag-hint--ok">
                ↵ Press Enter or click Create Tag to add{" "}
                <strong>{trimmed}</strong>.
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="dialog-footer">
          <button className="d-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="d-btn-create"
            disabled={!canCreate}
            onClick={submit}
          >
            Create Tag
          </button>
        </div>
      </div>

      {/* Dropdown rendered at document level so it never pushes layout */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="tag-search-dropdown"
          onClick={(e) => e.stopPropagation()}
        >
          {suggestions.map((t) => (
            <div
              key={t.value}
              className={`tag-search-dropdown__item${t.title.toLowerCase() === lower ? " tag-search-dropdown__item--exact" : ""}`}
            >
              <span className="tag-search-dropdown__name">{t.title}</span>
              {t.title.toLowerCase() === lower && (
                <span className="tag-search-dropdown__badge">exists</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
