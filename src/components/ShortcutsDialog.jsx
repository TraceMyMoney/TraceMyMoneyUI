import React from "react";
import { Keyboard } from "lucide-react";
import { useStore } from "../store/useStore.js";
import { SHORTCUTS, SHORTCUT_GROUPS, FORM_SHORTCUTS } from "../utils/shortcuts.js";

/** Cheat-sheet of every keyboard shortcut. Opened with ?, closed with Esc, ? or the × button. */
export default function ShortcutsDialog() {
  const { shortcutsOpen, setShortcutsOpen, chatbotEnabled } = useStore();
  if (!shortcutsOpen) return null;
  const close = () => setShortcutsOpen(false);

  return (
    <div className="dialog-overlay" onClick={close}>
      <div
        className="dialog-panel wide shortcuts-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
      >
        <div className="dialog-header">
          <div className="dialog-icon acid">
            <Keyboard size={18} aria-hidden="true" />
          </div>
          <div>
            <div id="shortcuts-title" className="dialog-title">
              Keyboard shortcuts
            </div>
            <div className="dialog-sub">
              Press a key anywhere on the dashboard (not while typing in a box)
            </div>
          </div>
          <button className="dialog-close" onClick={close} aria-label="Close shortcuts">
            ×
          </button>
        </div>
        <div className="dialog-body shortcuts-body">
          {SHORTCUT_GROUPS.map((group) => (
            <section key={group} className="shortcuts-group">
              <h3 className="shortcuts-group-title">{group}</h3>
              <ul className="shortcuts-list">
                {SHORTCUTS.filter((s) => s.group === group && (s.id !== "chat" || chatbotEnabled)).map((s) => (
                  <li key={s.id} className="shortcuts-row">
                    <span className="shortcuts-label">{s.label}</span>
                    <span className="shortcuts-keys">
                      {s.keys.map((k, i) => (
                        <React.Fragment key={k}>
                          {i > 0 && <span className="shortcuts-then">then</span>}
                          <kbd className="kb-key">{k}</kbd>
                        </React.Fragment>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <section className="shortcuts-group">
            <h3 className="shortcuts-group-title">In the Add Expense form</h3>
            <ul className="shortcuts-list">
              {FORM_SHORTCUTS.map((s) => (
                <li key={s.label} className="shortcuts-row">
                  <span className="shortcuts-label">{s.label}</span>
                  <span className="shortcuts-keys">
                    {s.keys.map((k, i) => (
                      <React.Fragment key={k}>
                        {i > 0 && <span className="shortcuts-then">{s.joiner || "then"}</span>}
                        <kbd className="kb-key">{k}</kbd>
                      </React.Fragment>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
