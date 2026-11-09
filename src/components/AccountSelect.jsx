import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

// Single-select dropdown that replaces the native <select> (which the browser
// draws in its own style). Reuses the tag picker's list/option look.
export default function AccountSelect({
  options,
  value,
  onChange,
  placeholder = "Choose account…",
  ariaLabel,
  zIndex = 502,
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const [hi, setHi] = useState(-1);
  const btnRef = useRef(null);
  const optRefs = useRef([]);

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  const place = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const GUTTER = 10;
    const below = window.innerHeight - r.bottom - GUTTER;
    const above = r.top - GUTTER;
    const flip = below < 160 && above > below;
    const maxHeight = Math.max(120, Math.min(260, flip ? above : below));
    const width = Math.min(Math.max(r.width, 200), window.innerWidth - 2 * GUTTER);
    const left = Math.max(GUTTER, Math.min(r.left, window.innerWidth - width - GUTTER));
    setPos(
      flip
        ? { bottom: window.innerHeight - r.top + 4, left, width, maxHeight }
        : { top: r.bottom + 4, left, width, maxHeight },
    );
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    setHi(selectedIndex >= 0 ? selectedIndex : 0);
    const onDoc = (e) => {
      if (btnRef.current?.contains(e.target)) return;
      if (e.target.closest?.(".acct-select-portal")) return;
      setOpen(false);
    };
    const onScroll = (e) => {
      if (e.target.closest?.(".acct-select-portal")) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      window.removeEventListener("scroll", onScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open && hi >= 0) optRefs.current[hi]?.scrollIntoView({ block: "nearest" });
  }, [hi, open]);

  const pick = (v) => {
    onChange(v);
    setOpen(false);
    btnRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return setOpen(true);
      const n = options.length;
      if (n) setHi((i) => (e.key === "ArrowDown" ? (i + 1) % n : (i - 1 + n) % n));
    } else if (e.key === "Enter" && open && options[hi]) {
      e.preventDefault();
      pick(options[hi].value);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <>
      <button
        type="button"
        ref={btnRef}
        className={`acct-select-btn${open ? " open" : ""}${selected ? "" : " empty"}`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="acct-select-text">{selected ? selected.title : placeholder}</span>
        <ChevronDown size={15} className="acct-select-chevron" aria-hidden="true" />
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            className="acct-select-portal tag-search-list"
            role="listbox"
            style={{ position: "fixed", ...pos, zIndex }}
          >
            {options.length === 0 ? (
              <div className="tag-search-empty">No accounts yet</div>
            ) : (
              options.map((o, i) => {
                const on = o.value === value;
                return (
                  <div
                    key={o.value}
                    ref={(el) => (optRefs.current[i] = el)}
                    role="option"
                    aria-selected={on}
                    className={`tag-search-option${on ? " active" : ""}${i === hi ? " highlighted" : ""}`}
                    onMouseEnter={() => setHi(i)}
                    onClick={() => pick(o.value)}
                  >
                    <span className="tag-search-option-label">{o.title}</span>
                    {on && <Check size={14} className="tag-search-check" aria-hidden="true" />}
                  </div>
                );
              })
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
