import React, { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";

function CopyChip({ value }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="guide-chip"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
        } catch {
          /* clipboard blocked: the value is still selectable */
        }
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
    >
      <code>{value}</code>
      {done ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

/**
 * Step-by-step setup for forwarding bank SMS from an iPhone (Shortcuts app)
 * to the webhook. Values the user has to type are click-to-copy.
 */
export default function SetupGuideModal({ open, onClose, webhookUrl, token, hasToken }) {
  useEffect(() => {
    if (!open) return undefined;
    const esc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open, onClose]);

  if (!open) return null;

  const tokenValue = token || "smm_… (your token)";

  const steps = [
    {
      title: "Open the Shortcuts app",
      body: <p>It's already on your iPhone (purple and pink icon). Go to the <b>Automation</b> tab and tap <b>+</b>.</p>,
    },
    {
      title: "Pick the Message trigger",
      body: (
        <>
          <p>Choose <b>Message</b>. Under <b>Message Contains</b> type a word your bank SMS always has, for example:</p>
          <p className="guide-row"><CopyChip value="debited" /> <CopyChip value="credited" /></p>
          <p className="guide-note">Make one automation per word (also <i>spent</i>, <i>sent</i> if your bank uses them). Leave Sender empty, then tap Next.</p>
        </>
      ),
    },
    {
      title: "Add the Get Contents of URL action",
      body: (
        <p>Tap <b>Create New Shortcut</b> (or <b>New Blank Automation</b>), then search for <b>Get Contents of URL</b> and add it.</p>
      ),
    },
    {
      title: "Fill in the URL and method",
      body: (
        <>
          <p><b>URL</b></p>
          <p className="guide-row"><CopyChip value={webhookUrl} /></p>
          <p>Tap the small arrow on the action and set <b>Method</b> to <b>POST</b>.</p>
        </>
      ),
    },
    {
      title: "Add the token header",
      body: (
        <>
          <p>Under <b>Headers</b>, tap <b>Add new header</b>:</p>
          <p className="guide-row"><span>Key</span> <CopyChip value="X-Ingest-Token" /></p>
          <p className="guide-row"><span>Value</span> <CopyChip value={tokenValue} /></p>
          {!token && (
            <p className="guide-note">
              {hasToken
                ? "Your token is only shown when you create it. If you didn't save it, generate a new one on the Profile page."
                : "Generate your token on the Profile page first."}
            </p>
          )}
        </>
      ),
    },
    {
      title: "Send the message text",
      body: (
        <>
          <p>Set <b>Request Body</b> to <b>JSON</b>, tap <b>Add new field</b> → <b>Text</b>:</p>
          <p className="guide-row"><span>Key</span> <CopyChip value="text" /></p>
          <p className="guide-row"><span>Value</span> the variable <b>Shortcut Input</b></p>
        </>
      ),
    },
    {
      title: "Run it silently",
      body: (
        <p>Tap Next, choose <b>Run Immediately</b>, turn <b>Notify When Run</b> off, and tap Done. New bank SMS now appear in your review list.</p>
      ),
    },
  ];

  return (
    <div className="dialog-overlay" onClick={onClose} style={{ zIndex: 700 }}>
      <div
        className="dialog-panel wide guide-panel"
        role="dialog"
        aria-labelledby="guide-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-header">
          <div className="dialog-icon acid">📱</div>
          <div>
            <div id="guide-title" className="dialog-title">Set up on iPhone</div>
            <div className="dialog-sub">Forward bank SMS with the Shortcuts app</div>
          </div>
          <button className="dialog-close" onClick={onClose} aria-label="Close guide">×</button>
        </div>
        <ol className="guide-steps">
          {steps.map((s, i) => (
            <li key={s.title}>
              <span className="guide-num">{i + 1}</span>
              <div>
                <div className="guide-title">{s.title}</div>
                {s.body}
              </div>
            </li>
          ))}
        </ol>
        <div className="dialog-footer">
          <button className="d-btn d-btn-primary" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}
