import { useEffect, useRef } from "react";
import { SHORTCUTS } from "../utils/shortcuts.js";

const COMBO_MS = 1000;
// Any of these on screen means a dialog, drawer or popup has the user's attention.
const OVERLAY_SELECTOR =
  ".dialog-overlay, .drawer-overlay, .chat-dialog-overlay, .insights-modal-backdrop, .alert-center";

export function isTypingInField(el) {
  if (!el || !el.tagName) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !!el.isContentEditable;
}

const hasOverlay = () => !!document.querySelector(OVERLAY_SELECTOR);

/**
 * One keydown listener for the dashboard shortcuts.
 * `handlers` maps a shortcut id (see utils/shortcuts.js) to a function; `enabled` turns it all off.
 * Rules: ignored while typing, ignored with Ctrl/Cmd/Alt, and while a dialog or drawer is open only
 * Esc and ? work. `handlers.escape` returns true when it closed something.
 */
export default function useKeyboardShortcuts(enabled, handlers) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    if (!enabled) return undefined;
    let pending = null; // first key of a two-key combo, e.g. "g"
    let timer = null;
    const clearPending = () => {
      pending = null;
      clearTimeout(timer);
    };

    const onKeyDown = (e) => {
      if (e.defaultPrevented || e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toLowerCase(); // "Escape" -> "escape", "E" -> "e"
      const h = ref.current;

      if (key === "escape") {
        clearPending();
        // Close the top panel first, even from inside one of its fields. A dropdown that
        // handled Esc itself (TagSearchSelect) calls preventDefault, so we never get here.
        if (h.escape?.()) {
          e.preventDefault();
          return;
        }
        const el = document.activeElement;
        if (isTypingInField(el)) el.blur();
        return;
      }

      if (isTypingInField(document.activeElement)) return;
      if (e.shiftKey && key !== "?") return;
      if (key === "shift" || key === "control" || key === "alt" || key === "meta") return;

      // Only the cheat-sheet toggle works while something is open on top of the page.
      if (hasOverlay() && key !== "?") return;
      // A focused button/link keeps its own Enter.
      const tag = document.activeElement?.tagName;
      if (key === "enter" && (tag === "BUTTON" || tag === "A")) return;

      const combo = pending ? `${pending} ${key}` : key;
      const exact = SHORTCUTS.find((s) => s.combo === combo);
      if (exact) {
        clearPending();
        if (h[exact.id]) {
          e.preventDefault();
          h[exact.id]();
        }
        return;
      }
      if (!pending && SHORTCUTS.some((s) => s.combo.startsWith(`${key} `))) {
        pending = key;
        clearTimeout(timer);
        timer = setTimeout(clearPending, COMBO_MS);
        e.preventDefault();
        return;
      }
      clearPending();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      clearTimeout(timer);
    };
  }, [enabled]);
}
