import React, { useEffect, useState } from "react";
import {
  User,
  KeyRound,
  Smartphone,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  BookOpen,
  Lock,
} from "lucide-react";
import { useStore, API_BASE_URL } from "../store/useStore.js";
import SetupGuideModal from "./SetupGuideModal.jsx";

const WEBHOOK_URL = `${API_BASE_URL}/ingest/sms`;

function copyText(text) {
  return navigator.clipboard?.writeText(text).catch(() => {});
}

function CopyBox({ value, label }) {
  const [done, setDone] = useState(false);
  return (
    <div className="profile-copybox">
      {label && <span className="profile-copylabel">{label}</span>}
      <div className="profile-copyrow">
        <code>{value}</code>
        <button
          type="button"
          className="profile-copybtn"
          aria-label={`Copy ${label || "value"}`}
          onClick={async () => {
            await copyText(value);
            setDone(true);
            setTimeout(() => setDone(false), 1400);
          }}
        >
          {done ? <Check size={15} /> : <Copy size={15} />}
        </button>
      </div>
    </div>
  );
}

function formatWhen(iso) {
  if (!iso) return "never";
  try {
    return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function ProfilePage() {
  const {
    profile,
    ingestStatus,
    fetchProfile,
    updateProfile,
    changePassword,
    createIngestToken,
    revokeIngestToken,
    setProfileOpen,
    requestConfirm,
  } = useStore();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [savingPw, setSavingPw] = useState(false);
  const [newToken, setNewToken] = useState(null); // plaintext, shown once
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);
  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setEmail(profile.email);
    }
  }, [profile]);

  const accountChanged =
    profile && (username.trim() !== profile.username || email.trim() !== profile.email);
  const pwMismatch = pw.confirm && pw.next !== pw.confirm;
  const pwReady = pw.current && pw.next.length >= 8 && pw.next === pw.confirm;

  const saveAccount = async (e) => {
    e.preventDefault();
    setSavingAccount(true);
    const payload = {};
    if (username.trim() !== profile.username) payload.username = username.trim();
    if (email.trim() !== profile.email) payload.email = email.trim();
    await updateProfile(payload);
    setSavingAccount(false);
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setSavingPw(true);
    const ok = await changePassword(pw.current, pw.next);
    if (ok) setPw({ current: "", next: "", confirm: "" });
    setSavingPw(false);
  };

  const generate = async () => {
    if (
      ingestStatus?.configured &&
      !(await requestConfirm("Replace the token? The old one stops working immediately.", "Replace"))
    )
      return;
    const token = await createIngestToken();
    if (token) setNewToken(token);
  };

  const revoke = async () => {
    if (!(await requestConfirm("Revoke the token? Your phone will stop sending messages.", "Revoke")))
      return;
    if (await revokeIngestToken()) setNewToken(null);
  };

  return (
    <div className="inline-view" aria-labelledby="profile-title">
      <div className="admin-page-inner">
        <div className="admin-page-header">
          <div className="dialog-icon acid">
            <User size={20} />
          </div>
          <div>
            <div id="profile-title" className="dialog-title">
              Profile
            </div>
            <div className="dialog-sub">Your account, password and SMS auto-capture</div>
          </div>
          <button
            className="dialog-close admin-page-close"
            onClick={() => setProfileOpen(false)}
            aria-label="Close profile"
          >
            ×
          </button>
        </div>

        <div className="admin-page-content">
          <div className="admin-dashboard-body profile-body">
            {/* Account */}
            <div className="admin-panel">
              <div className="admin-panel-title">
                <User size={15} />
                <span>Account</span>
              </div>
              <div className="admin-panel-desc">Your username is 7–20 characters. Email and username must be unique.</div>
              <form className="admin-ai-form profile-form" onSubmit={saveAccount}>
                <label className="admin-form-field">
                  <span>Username</span>
                  <input
                    className="d-input-field"
                    value={username}
                    minLength={7}
                    maxLength={20}
                    autoComplete="username"
                    autoCapitalize="none"
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </label>
                <label className="admin-form-field">
                  <span>Email</span>
                  <input
                    className="d-input-field"
                    type="email"
                    value={email}
                    autoComplete="email"
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <button
                  type="submit"
                  className="d-btn d-btn-primary profile-save"
                  disabled={!accountChanged || savingAccount || username.trim().length < 7}
                >
                  {savingAccount ? "Saving…" : "Save changes"}
                </button>
              </form>
            </div>

            {/* Password */}
            <div className="admin-panel">
              <div className="admin-panel-title">
                <Lock size={15} />
                <span>Password</span>
              </div>
              <div className="admin-panel-desc">Enter your current password to set a new one.</div>
              <form className="admin-ai-form profile-form" onSubmit={savePassword}>
                <label className="admin-form-field">
                  <span>Current password</span>
                  <input
                    className="d-input-field"
                    type="password"
                    autoComplete="current-password"
                    value={pw.current}
                    onChange={(e) => setPw({ ...pw, current: e.target.value })}
                  />
                </label>
                <label className="admin-form-field">
                  <span>New password (8+ characters)</span>
                  <input
                    className="d-input-field"
                    type="password"
                    autoComplete="new-password"
                    value={pw.next}
                    onChange={(e) => setPw({ ...pw, next: e.target.value })}
                  />
                </label>
                <label className="admin-form-field">
                  <span>Confirm new password</span>
                  <input
                    className="d-input-field"
                    type="password"
                    autoComplete="new-password"
                    value={pw.confirm}
                    onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                  />
                  {pwMismatch && <small className="profile-error">Passwords don't match</small>}
                </label>
                <button
                  type="submit"
                  className="d-btn d-btn-primary profile-save"
                  disabled={!pwReady || savingPw}
                >
                  {savingPw ? "Saving…" : "Change password"}
                </button>
              </form>
            </div>

            {/* Auto-capture */}
            <div className="admin-panel profile-wide">
              <div className="admin-panel-title">
                <Smartphone size={15} />
                <span>SMS auto-capture</span>
              </div>
              <div className="admin-panel-desc">
                Forward bank SMS from your iPhone to this account. Each transaction waits in your
                review list, so nothing is added without your confirmation.
              </div>

              <div className="profile-status">
                <span className={`profile-dot${ingestStatus?.configured ? " on" : ""}`} />
                {ingestStatus?.configured ? (
                  <span>
                    Token active · last used <b>{formatWhen(ingestStatus.last_used_at)}</b>
                  </span>
                ) : (
                  <span>No token yet</span>
                )}
              </div>

              <CopyBox label="Webhook address" value={WEBHOOK_URL} />

              {newToken && (
                <div className="profile-newtoken">
                  <CopyBox label="Your token (shown only once)" value={newToken} />
                  <p>Copy it into your Shortcut now. If you lose it, generate a new one.</p>
                </div>
              )}

              <div className="profile-actions">
                <button type="button" className="d-btn d-btn-primary" onClick={generate}>
                  <KeyRound size={15} />
                  {ingestStatus?.configured ? "Replace token" : "Generate token"}
                </button>
                <button type="button" className="d-btn d-btn-ghost" onClick={() => setGuideOpen(true)}>
                  <BookOpen size={15} /> How to set up
                </button>
                {ingestStatus?.configured && (
                  <button type="button" className="d-btn d-btn-ghost profile-revoke" onClick={revoke}>
                    <Trash2 size={15} /> Revoke
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <SetupGuideModal
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        webhookUrl={WEBHOOK_URL}
        token={newToken}
        hasToken={!!ingestStatus?.configured}
      />
    </div>
  );
}
