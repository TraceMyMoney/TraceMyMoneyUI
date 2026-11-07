import React, { useEffect, useState } from "react";
import { useStore } from "../store/useStore.js";
import TagSearchSelect from "./TagSearchSelect.jsx";

/**
 * Lets the user pick tags that are hidden from the expense list by default.
 * Saved in user preferences; the filter bar can still change the exclusion
 * for the current session, and Reset returns to this default.
 */
export default function ExcludedTagsDialog({ open, onClose }) {
  const { entryTags, defaultExcludedTags, setDefaultExcludedTags } = useStore();
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setSelected(defaultExcludedTags || []);
  }, [open, defaultExcludedTags]);

  useEffect(() => {
    if (!open) return;
    const esc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open, onClose]);

  if (!open) return null;

  const save = async () => {
    setSaving(true);
    await setDefaultExcludedTags(selected);
    setSaving(false);
    onClose();
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-panel" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <div className="dialog-icon purple">🏷</div>
          <div>
            <div className="dialog-title">Default excluded tags</div>
            <div className="dialog-sub">
              Entries with these tags are hidden whenever expenses load
            </div>
          </div>
          <button className="dialog-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="create-tag-body">
          <label className="d-label">Excluded tags</label>
          <TagSearchSelect
            tags={entryTags}
            selected={selected}
            onChange={setSelected}
            placeholder="Select tags to hide"
            zIndex={700}
          />
          <p className="excluded-tags-hint">
            You can still change the exclusion for a session from the filter
            row; Reset brings these defaults back.
          </p>
        </div>

        <div className="dialog-footer">
          <button className="d-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="d-btn-create" disabled={saving} onClick={save}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
