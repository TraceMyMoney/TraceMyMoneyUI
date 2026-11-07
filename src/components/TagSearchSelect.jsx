import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useCallback,
} from "react";
import { createPortal } from "react-dom";

function clampMenuPosition(rect) {
  const GUTTER = 10;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const maxUsableW = Math.max(120, vw - 2 * GUTTER);
  const minPreferred = Math.min(220, maxUsableW);
  let width = Math.max(rect.width, minPreferred);
  width = Math.min(width, maxUsableW);
  const left = Math.max(
    GUTTER,
    Math.min(rect.left, Math.max(GUTTER, vw - width - GUTTER)),
  );
  const top = rect.bottom + 4;
  const maxListHeight = Math.max(120, Math.min(280, vh - top - GUTTER));
  return { top, left, width, maxListHeight };
}

export default function TagSearchSelect({
  tags,
  selected,
  onChange,
  placeholder = "Search tags…",
  zIndex = 502,
  summary = false, // collapse 2+ chips into one "N selected" chip
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapRef = useRef(null);
  const optionRefs = useRef([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tags;
    return tags.filter(
      (t) =>
        (t.title || "").toLowerCase().includes(q) ||
        String(t.value ?? "")
          .toLowerCase()
          .includes(q),
    );
  }, [tags, query]);

  // Keep the highlight in range whenever the list changes (typing a query,
  // opening/closing) instead of pointing at a stale/out-of-bounds index.
  useEffect(() => {
    setHighlightedIndex(filtered.length > 0 ? 0 : -1);
  }, [filtered, open]);

  useEffect(() => {
    if (highlightedIndex < 0) return;
    optionRefs.current[highlightedIndex]?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  const syncMenuPosition = useCallback(() => {
    if (!wrapRef.current) return;
    setMenuPos(clampMenuPosition(wrapRef.current.getBoundingClientRect()));
  }, []);

  useLayoutEffect(() => {
    if (!open || !wrapRef.current) return;
    syncMenuPosition();
    window.addEventListener("resize", syncMenuPosition);
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", syncMenuPosition);
    }
    return () => {
      window.removeEventListener("resize", syncMenuPosition);
      if (vv) {
        vv.removeEventListener("resize", syncMenuPosition);
      }
    };
  }, [open, query, syncMenuPosition]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current?.contains(e.target)) return;
      if (e.target.closest?.(".tag-search-dropdown-portal")) return;
      setOpen(false);
    };
    const onScroll = () => {
      // Only close if the anchor element has scrolled out of the visible viewport.
      // This prevents the iOS virtual keyboard appearance (which slightly shifts
      // the page and fires a scroll event) from dismissing the dropdown.
      if (!wrapRef.current) {
        setOpen(false);
        return;
      }
      const rect = wrapRef.current.getBoundingClientRect();
      const inView = rect.bottom > 0 && rect.top < window.innerHeight;
      if (!inView) {
        setOpen(false);
      } else {
        syncMenuPosition();
      }
    };
    document.addEventListener("pointerdown", onDoc);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, syncMenuPosition]);

  const toggle = (value) => {
    const next = selected.includes(value)
      ? selected.filter((x) => x !== value)
      : [...selected, value];
    onChange(next);
  };

  const remove = (value) => onChange(selected.filter((x) => x !== value));

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlightedIndex((i) =>
        filtered.length === 0 ? -1 : (i + 1) % filtered.length,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlightedIndex((i) =>
        filtered.length === 0 ? -1 : (i - 1 + filtered.length) % filtered.length,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const option = filtered[highlightedIndex];
      if (option) toggle(option.value);
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  const selectedMeta = useMemo(
    () => selected.map((v) => tags.find((t) => t.value === v)).filter(Boolean),
    [selected, tags],
  );

  return (
    <div className="tag-search-select" ref={wrapRef}>
      {selectedMeta.length > 0 && (
        <div className="tag-search-selected">
          {summary && selectedMeta.length > 1 ? (
            <span
              className="tag-search-chip"
              title={selectedMeta.map((t) => t.title).join(", ")}
            >
              <span className="tag-search-chip-text">
                {selectedMeta.length} selected
              </span>
              <button
                type="button"
                className="tag-search-chip-remove"
                aria-label="Clear selection"
                onClick={() => onChange([])}
              >
                ×
              </button>
            </span>
          ) : (
            selectedMeta.map((t) => (
              <span key={t.value} className="tag-search-chip">
                <span className="tag-search-chip-text">{t.title}</span>
                <button
                  type="button"
                  className="tag-search-chip-remove"
                  aria-label={`Remove ${t.title}`}
                  onClick={() => remove(t.value)}
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>
      )}
      <input
        type="text"
        className="tag-search-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-activedescendant={
          highlightedIndex >= 0 && filtered[highlightedIndex]
            ? `tag-search-option-${filtered[highlightedIndex].value}`
            : undefined
        }
      />
      {open &&
        menuPos &&
        createPortal(
          <div
            className="tag-search-dropdown-portal"
            style={{
              position: "fixed",
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
              zIndex,
            }}
            role="listbox"
            aria-multiselectable="true"
          >
            <div
              className="tag-search-list"
              style={{ maxHeight: menuPos.maxListHeight }}
            >
              {filtered.length === 0 ? (
                <div className="tag-search-empty">No tags match</div>
              ) : (
                filtered.map((t, i) => {
                  const isOn = selected.includes(t.value);
                  const isHighlighted = i === highlightedIndex;
                  return (
                    <div
                      key={t.value}
                      id={`tag-search-option-${t.value}`}
                      ref={(el) => (optionRefs.current[i] = el)}
                      role="option"
                      aria-selected={isOn}
                      tabIndex={-1}
                      className={`tag-search-option${isOn ? " active" : ""}${isHighlighted ? " highlighted" : ""}`}
                      onMouseEnter={() => setHighlightedIndex(i)}
                      onClick={() => toggle(t.value)}
                    >
                      <span className="tag-search-option-label">{t.title}</span>
                      {isOn && <span className="tag-search-check">✓</span>}
                    </div>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
