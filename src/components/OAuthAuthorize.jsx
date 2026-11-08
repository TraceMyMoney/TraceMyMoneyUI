import React, { useEffect, useState } from "react";
import axios from "axios";
import { ShieldCheck, Check } from "lucide-react";
import { useStore, API_BASE_URL } from "../store/useStore.js";

/**
 * The page Claude's connector sends the browser to (via the API's
 * GET /oauth/authorize). The user is already signed in here (App.jsx shows
 * the login first), so the approval goes through axios with their normal
 * session: the API checks the request, issues a one-time code and tells us
 * where to send the browser back to Claude.
 */

const PERMISSIONS = [
  "See your accounts, balances and expenses",
  "Add, edit and delete expenses and tags",
  "Review and add the bank SMS waiting for you",
];

export default function OAuthAuthorize() {
  const { userName } = useStore();
  const q = new URLSearchParams(window.location.search);
  const params = {
    client_id: q.get("client_id") || "",
    redirect_uri: q.get("redirect_uri") || "",
    state: q.get("state") || "",
    code_challenge: q.get("code_challenge") || "",
    code_challenge_method: q.get("code_challenge_method") || "S256",
  };

  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/oauth/authorize/info`, { params })
      .then((r) => setInfo(r.data))
      .catch((e) => setError(e?.response?.data?.detail || "This connection request is not valid."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const decide = async (approve) => {
    setBusy(true);
    setError("");
    try {
      const r = await axios.post(`${API_BASE_URL}/oauth/authorize/decision`, { ...params, approve });
      window.location.assign(r.data.redirect_url);
    } catch (e) {
      setError(e?.response?.data?.detail || "Something went wrong. Please try again.");
      setBusy(false);
    }
  };

  const name = info?.client_name || "Claude";

  return (
    <div className="oauth-shell">
      <div className="oauth-card">
        <div className="oauth-brand">
          <div className="auth-logo-hex">₹</div>
          <div className="auth-logo-name">
            Stalk<span>My</span>Money
          </div>
        </div>

        {error && !info ? (
          <>
            <h1 className="oauth-title">Can't connect</h1>
            <p className="oauth-error">{error}</p>
          </>
        ) : (
          <>
            <div className="oauth-icon">
              <ShieldCheck size={22} />
            </div>
            <h1 className="oauth-title">{name} wants to access your money</h1>
            <p className="oauth-sub">
              Signed in as <b>{userName}</b>. You can disconnect any time from your Profile.
            </p>

            <ul className="oauth-perms">
              {PERMISSIONS.map((p) => (
                <li key={p}>
                  <Check size={15} /> {p}
                </li>
              ))}
            </ul>

            {info && (
              <p className="oauth-host">
                After you approve, you'll be sent back to <b>{info.redirect_host}</b>.
              </p>
            )}
            {error && <p className="oauth-error">{error}</p>}

            <div className="oauth-actions">
              <button type="button" className="oauth-btn" disabled={busy} onClick={() => decide(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="oauth-btn primary"
                disabled={busy || !info}
                onClick={() => decide(true)}
              >
                {busy ? "Connecting…" : "Authorize"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
