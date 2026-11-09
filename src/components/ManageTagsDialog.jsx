import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Trash2, X, Plus, Tag } from "lucide-react";
import { useStore } from "../store/useStore.js";
import { usePhoneScreen } from "../useWideScreen.js";
import { normalizeTagName, TAG_NAME_MAX } from "../utils/tags.js";

// One-tap starters for a brand-new user with no tags.
const STARTERS = ["Food", "Rent", "Travel", "Subscriptions"];

const countLabel = (n, short = false) =>
  n === 0 ? "unused" : short ? String(n) : n === 1 ? "1 entry" : `${n} entries`;

const lower = (s) => s.toLowerCase();

/**
 * Manage tags: search/add, rename and delete in one dialog. On phones the
 * shared .dialog-overlay/.dialog-panel CSS turns it into a bottom sheet.
 * All server work goes through store actions (addTag/renameTag/deleteTag),
 * which answer { ok, error } so errors show next to the input and typed text
 * is kept.
 */
export default function ManageTagsDialog({ open, onClose }) {
  const { entryTags, fetchEntryTags, addTag, renameTag, deleteTag } = useStore();
  const phone = usePhoneScreen();

  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");

  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState("");
  const [renameBusy, setRenameBusy] = useState(false);

  const [confirmId, setConfirmId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [rowError, setRowError] = useState(null); // { id, msg }

  const renameInputRef = useRef(null);

  // Fresh state each time the dialog opens; refresh counts from the server.
  useEffect(() => {
    if (!open) return undefined;
    setQuery("");
    setAddError("");
    setNotice("");
    setRenamingId(null);
    setConfirmId(null);
    setRowError(null);
    setLoadError("");
    // The list is normally already in the store; only show placeholders when it is not.
    setLoading(useStore.getState().entryTags.length === 0);
    let alive = true;
    fetchEntryTags().then((r) => {
      if (!alive) return;
      setLoading(false);
      if (!r.ok) setLoadError(r.error);
    });
    return () => {
      alive = false;
    };
  }, [open, fetchEntryTags]);

  // Esc: cancel a rename, then a delete confirmation, then close.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (renamingId) setRenamingId(null);
      else if (confirmId) setConfirmId(null);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, renamingId, confirmId, onClose]);

  // A short "Added Food" / "Deleted Fuel" line that fades away by itself.
  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(""), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      const end = renameInputRef.current.value.length;
      renameInputRef.current.setSelectionRange(end, end); // caret at the end, no blue selection
    }
  }, [renamingId]);

  const trimmed = query.trim();
  const saveAs = normalizeTagName(query);
  const exact = useMemo(
    () => (saveAs ? entryTags.find((t) => lower(t.title) === lower(saveAs)) : null),
    [entryTags, saveAs],
  );
  const matches = useMemo(
    () => (trimmed ? entryTags.filter((t) => lower(t.title).includes(lower(trimmed))) : entryTags),
    [entryTags, trimmed],
  );
  const tooLong = saveAs.length > TAG_NAME_MAX;
  const canAdd = saveAs.length > 0 && !tooLong && !exact && !adding;

  if (!open) return null;

  const submitAdd = async (nameArg) => {
    const name = normalizeTagName(nameArg ?? query);
    if (!name || name.length > TAG_NAME_MAX || adding) return;
    if (entryTags.some((t) => lower(t.title) === lower(name))) return;
    setAdding(true);
    setAddError("");
    const r = await addTag(name);
    setAdding(false);
    if (r.ok) {
      setQuery("");
      setNotice(`Added ${r.name}`);
    } else {
      setAddError(r.error);
    }
  };

  const startRename = (tag) => {
    setRenamingId(tag.value);
    setRenameValue(tag.title);
    setRenameError("");
    setConfirmId(null);
    setRowError(null);
  };

  const saveRename = async (tag) => {
    const name = normalizeTagName(renameValue);
    if (!name) return setRenameError("A tag name can't be empty.");
    if (name.length > TAG_NAME_MAX) return setRenameError(`A tag name can be at most ${TAG_NAME_MAX} characters.`);
    if (name === tag.title) return setRenamingId(null);
    const clash = entryTags.find((t) => t.value !== tag.value && lower(t.title) === lower(name));
    if (clash) return setRenameError(`A tag called ${clash.title} already exists. Pick another name.`);
    setRenameBusy(true);
    setRenameError("");
    const r = await renameTag(tag.value, renameValue);
    setRenameBusy(false);
    if (r.ok) {
      setRenamingId(null);
      setNotice(`Renamed to ${r.name}`);
    } else {
      setRenameError(r.error); // stay in edit mode, keep what was typed
    }
  };

  const runDelete = async (tag) => {
    setDeletingId(tag.value);
    setRowError(null);
    const r = await deleteTag(tag.value);
    setDeletingId(null);
    if (r.ok) {
      setConfirmId(null);
      setNotice(`Deleted ${tag.title}`);
    } else {
      setRowError({ id: tag.value, msg: r.error });
    }
  };

  // Deleting ALWAYS asks first (the confirmation shows how many entries lose the tag).
  const requestDelete = (tag) => {
    setRowError(null);
    setRenamingId(null);
    setConfirmId(tag.value);
  };

  const renderRow = (tag) => {
    if (renamingId === tag.value) {
      const preview = normalizeTagName(renameValue);
      return (
        <li key={tag.value} className="tm-row tm-row--edit">
          <input
            ref={renameInputRef}
            className={`tm-input${renameError ? " tm-input--error" : ""}`}
            aria-label={`New name for ${tag.title}`}
            aria-invalid={Boolean(renameError)}
            value={renameValue}
            onChange={(e) => {
              setRenameValue(e.target.value);
              setRenameError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveRename(tag);
            }}
            autoComplete="off"
          />
          <div className="tm-edit-actions">
            <button
              type="button"
              className="tm-btn tm-btn--primary"
              disabled={renameBusy}
              onClick={() => saveRename(tag)}
            >
              Save
            </button>
            <button type="button" className="tm-btn tm-btn--ghost" onClick={() => setRenamingId(null)}>
              Cancel
            </button>
          </div>
          <div className="tm-edit-msg" aria-live="polite">
            {renameError ? (
              <span className="tm-error" role="alert">
                {renameError}
              </span>
            ) : (
              preview && (
                <span className="tm-hint">
                  Will be saved as <strong>{preview}</strong>
                </span>
              )
            )}
          </div>
        </li>
      );
    }

    if (confirmId === tag.value) {
      return (
        <li key={tag.value} className="tm-row tm-row--confirm">
          <div className="tm-row-main">
            <span className="tm-chip">{tag.title}</span>
            <span className="tm-count">{countLabel(tag.count)}</span>
          </div>
          <p className="tm-confirm-text">
            {tag.count === 0 ? (
              <>
                Delete <strong>{tag.title}</strong>? No entry uses it.
              </>
            ) : (
              <>
                Delete <strong>{tag.title}</strong>? It is used by <strong>{countLabel(tag.count)}</strong>. They will
                lose this tag. The entries and their amounts stay.
              </>
            )}
          </p>
          {rowError?.id === tag.value && (
            <div className="tm-error" role="alert">
              {rowError.msg}
            </div>
          )}
          <div className="tm-confirm-actions">
            <button type="button" className="tm-btn tm-btn--outline" onClick={() => setConfirmId(null)}>
              Keep it
            </button>
            <button
              type="button"
              className="tm-btn tm-btn--danger"
              disabled={deletingId === tag.value}
              onClick={() => runDelete(tag)}
            >
              Delete tag
            </button>
          </div>
        </li>
      );
    }

    return (
      <li key={tag.value} className="tm-row">
        <div className="tm-row-main">
          <span className="tm-chip">{tag.title}</span>
          <span className="tm-count">{countLabel(tag.count, phone)}</span>
        </div>
        <button
          type="button"
          className="tm-iconbtn"
          aria-label={`Rename ${tag.title}`}
          onClick={() => startRename(tag)}
        >
          <Pencil size={17} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="tm-iconbtn"
          aria-label={`Delete ${tag.title}`}
          disabled={deletingId === tag.value}
          onClick={() => requestDelete(tag)}
        >
          <Trash2 size={17} aria-hidden="true" />
        </button>
        {rowError?.id === tag.value && (
          <div className="tm-error tm-row-error" role="alert">
            {rowError.msg}
          </div>
        )}
      </li>
    );
  };

  const hasTags = entryTags.length > 0;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog-panel tm-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-header">
          <div className="dialog-icon purple">
            <Tag size={20} aria-hidden="true" />
          </div>
          <div>
            <div className="dialog-title" id="tm-title">
              Manage tags
            </div>
            <div className="dialog-sub">
              {hasTags
                ? `${entryTags.length} ${entryTags.length === 1 ? "tag" : "tags"}. Rename or delete; entries keep their amounts.`
                : "Tags group your spending, like Food or Rent."}
            </div>
          </div>
          <button type="button" className="dialog-close" onClick={onClose} aria-label="Close">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="tm-body">
          <div className="tm-top">
          <label className="tm-label" htmlFor="tm-search">
            Search or add a tag
          </label>
          <div className="tm-add-row">
            <input
              id="tm-search"
              className={`tm-input${exact || tooLong || addError ? " tm-input--error" : ""}`}
              placeholder={phone ? "Search or add a tag" : "Type a name"}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setAddError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canAdd) submitAdd();
              }}
              autoFocus={!phone}
              autoComplete="off"
              aria-invalid={Boolean(exact || tooLong)}
            />
            <button type="button" className="tm-btn tm-btn--primary tm-add-btn" disabled={!canAdd} onClick={() => submitAdd()}>
              Add
            </button>
          </div>
          <div className="tm-note" aria-live="polite">
            {exact && (
              <span className="tm-error" role="alert">
                A tag called {exact.title} already exists. Pick another name, or rename that one.
              </span>
            )}
            {!exact && tooLong && (
              <span className="tm-error" role="alert">
                A tag name can be at most {TAG_NAME_MAX} characters (you typed {saveAs.length}).
              </span>
            )}
            {!exact && !tooLong && addError && (
              <span className="tm-error" role="alert">
                {addError}
              </span>
            )}
            {!exact && !tooLong && !addError && saveAs && (
              <span className="tm-hint">
                Will be saved as <strong>{saveAs}</strong>. Press Enter to add.
              </span>
            )}
            {!saveAs && notice && <span className="tm-hint tm-notice">{notice}</span>}
          </div>

          </div>
          <div className="tm-scroll">
          {loadError && (
            <div className="tm-error" role="alert">
              {loadError}
            </div>
          )}

          {loading ? (
            <div className="tm-skeletons" role="status" aria-label="Loading tags">
              <div className="tm-skel" />
              <div className="tm-skel" />
              <div className="tm-skel" />
            </div>
          ) : !hasTags ? (
            <div className="tm-empty">
              <div className="tm-empty-title">No tags yet</div>
              <p className="tm-empty-text">
                Tags group your spending, like Food or Rent. Type a name above and tap Add, or pick one of these.
              </p>
              <div className="tm-starters">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="tm-starter"
                    disabled={adding}
                    onClick={() => submitAdd(s)}
                  >
                    <Plus size={14} aria-hidden="true" /> {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {matches.length === 0 && (
                <div className="tm-nomatch">No tag matches &ldquo;{trimmed}&rdquo;.</div>
              )}
              {canAdd && matches.length === 0 && (
                <button type="button" className="tm-addrow" onClick={() => submitAdd()}>
                  <Plus size={18} aria-hidden="true" /> Add tag &ldquo;{saveAs}&rdquo;
                </button>
              )}
              <ul className="tm-list">{matches.map(renderRow)}</ul>
            </>
          )}
          </div>
        </div>

        <div className="tm-foot">
          Deleting a tag never deletes expenses.{phone ? "" : " Esc closes this window."}
        </div>
      </div>
    </div>
  );
}
