import React, { useEffect, useRef, useState } from "react";
import { useStore } from "../store/useStore.js";
import { usePhoneScreen } from "../useWideScreen.js";
import {
  ShieldCheck,
  Search,
  X,
  Users,
  Cpu,
  ToggleRight,
  Activity,
  RefreshCw,
  KeyRound,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Save,
  BarChart3,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

const PROVIDERS = [
  { value: "groq", label: "Groq (ChatGroq)", short: "Groq", tech: "ChatGroq", color: "acid" },
  { value: "openai", label: "OpenAI (ChatOpenAI)", short: "OpenAI", tech: "ChatOpenAI", color: "green" },
  {
    value: "anthropic",
    label: "Anthropic (ChatAnthropic)",
    short: "Anthropic",
    tech: "ChatAnthropic",
    color: "purple",
  },
  { value: "openrouter", label: "OpenRouter", short: "OpenRouter", tech: "proxy", color: "blue" },
];

// Curated, not exhaustive - each provider (especially OpenRouter, a proxy
// in front of dozens of upstream models) adds new model ids over time, so
// "Custom..." always stays available as an escape hatch rather than
// hard-blocking anything not in this list.
const MODEL_OPTIONS = {
  groq: [
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "gemma2-9b-it",
  ],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "o3-mini"],
  anthropic: [
    "claude-opus-5-5",
    "claude-sonnet-5-5",
    "claude-haiku-5-5",
    "claude-fable-5-1",
  ],
  openrouter: [
    "openai/gpt-4o",
    "anthropic/claude-sonnet-5-5",
    "meta-llama/llama-3.1-70b-instruct",
    "google/gemini-flash-1.5",
  ],
};
const CUSTOM_MODEL = "__custom__";

const TABS = [
  { id: "users", label: "Users", icon: Users },
  { id: "ai", label: "AI Provider", icon: Cpu },
  { id: "flags", label: "Feature Flags", icon: ToggleRight },
  { id: "usage", label: "Usage", icon: Activity },
];

const ADMIN_USERS_PAGE_SIZES = [5, 10, 15, 20, 50];

function UsersPagination() {
  const { adminUsersTotal, adminUsersPage, adminUsersPageSize, setAdminUsersPage } = useStore();
  const phone = usePhoneScreen();
  const totalPages = Math.max(1, Math.ceil(adminUsersTotal / adminUsersPageSize));
  if (!adminUsersTotal || totalPages <= 1) return null;

  if (phone) {
    return (
      <div className="admin-pagination admin-pagination--phone">
        <button
          type="button"
          className="admin-pg-btn admin-pg-btn--nav"
          disabled={adminUsersPage <= 1}
          onClick={() => setAdminUsersPage(adminUsersPage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="admin-pg-compact">
          <b>Page {adminUsersPage} of {totalPages}</b>
          <span>{adminUsersTotal} users</span>
        </div>
        <button
          type="button"
          className="admin-pg-btn admin-pg-btn--nav"
          disabled={adminUsersPage >= totalPages}
          onClick={() => setAdminUsersPage(adminUsersPage + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  const getRange = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [1];
    if (adminUsersPage > 3) pages.push("...");
    for (let i = Math.max(2, adminUsersPage - 1); i <= Math.min(totalPages - 1, adminUsersPage + 1); i++)
      pages.push(i);
    if (adminUsersPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  const start = (adminUsersPage - 1) * adminUsersPageSize + 1;
  const end = Math.min(adminUsersPage * adminUsersPageSize, adminUsersTotal);

  return (
    <div className="admin-pagination">
      <div className="admin-pagination-info">
        {start}–{end} of {adminUsersTotal} · page {adminUsersPage}/{totalPages}
      </div>
      <div className="admin-pagination-btns">
        <button
          type="button"
          className="admin-pg-btn admin-pg-btn--nav"
          disabled={adminUsersPage <= 1}
          onClick={() => setAdminUsersPage(adminUsersPage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </button>
        {getRange().map((p, i) =>
          p === "..." ? (
            <span key={`d${i}`} className="admin-pg-ellipsis">
              ···
            </span>
          ) : (
            <button
              type="button"
              key={p}
              className={`admin-pg-btn${p === adminUsersPage ? " active" : ""}`}
              onClick={() => setAdminUsersPage(p)}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          className="admin-pg-btn admin-pg-btn--nav"
          disabled={adminUsersPage >= totalPages}
          onClick={() => setAdminUsersPage(adminUsersPage + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function UsersTab() {
  const {
    adminUsers,
    adminUsersLoading,
    adminUsersTotal,
    adminUsersPageSize,
    fetchAdminUsers,
    setAdminUsersSearch,
    setAdminUsersPageSize,
    setUserChatbotAccess,
    setUserIsAdmin,
    setUserDisabled,
  } = useStore();
  const phone = usePhoneScreen();
  const [query, setQuery] = useState("");
  const skipNextDebounce = useRef(true);

  useEffect(() => {
    fetchAdminUsers();
  }, []);

  // Debounced server-side search - the list is paginated now, so filtering
  // the already-loaded array client-side (the old approach) would only
  // ever search the current page, not the whole user base.
  useEffect(() => {
    if (skipNextDebounce.current) {
      skipNextDebounce.current = false;
      return;
    }
    const id = setTimeout(() => setAdminUsersSearch(query), 400);
    return () => clearTimeout(id);
  }, [query]);

  const enabledCount = adminUsers.filter((u) => u.chatbot_enabled).length;

  return (
    <div className="admin-dashboard-body">
      <div className="admin-panel">
        <div className="admin-panel-row">
          <div className="admin-tab-sub admin-tab-sub--wide admin-tab-sub--tight">
            {adminUsersTotal} user{adminUsersTotal === 1 ? "" : "s"} · {enabledCount} on this
            page with AI chatbot access
          </div>

          <div className="admin-users-controls">
            <label className="admin-page-size-wrap">
              <span className="admin-page-size-label">Rows</span>
              <span className="admin-page-size-value">{adminUsersPageSize}</span>
              <ChevronDown size={14} className="admin-page-size-chevron" />
              {/* Invisible but covers the whole pill (position:absolute;
                  inset:0) - the <select>'s own native hit-area is only as
                  wide as its rendered text, so without this most of the
                  visible pill wasn't actually clickable: clicking the
                  *label* around it only focuses a <select>, it doesn't
                  open the dropdown, in every major browser. */}
              <select
                className="admin-page-size-select"
                value={adminUsersPageSize}
                onChange={(e) => setAdminUsersPageSize(Number(e.target.value))}
                aria-label="Rows per page"
              >
                {ADMIN_USERS_PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>

            <div className="d-input-wrap admin-search-wrap">
              <div className="d-input-icon">
                <Search size={15} />
              </div>
              <input
                className="d-input-field"
                placeholder={phone ? "Search users" : "Search by username or email..."}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus={!phone}
              />
              {query && (
                <button
                  type="button"
                  className="admin-search-clear"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {adminUsersLoading ? (
          <div className="admin-dashboard-empty">Loading users…</div>
        ) : adminUsers.length === 0 ? (
          <div className="admin-dashboard-empty">
            {query ? `No users match "${query}".` : "No users found."}
          </div>
        ) : phone ? (
          <div className="admin-ucards">
            {adminUsers.map((u) => (
              <div className={`admin-ucard${u.is_disabled ? " is-disabled" : ""}`} key={u.id}>
                <div className="admin-ucard-top">
                  <div className="admin-user-av">{u.username.charAt(0).toUpperCase()}</div>
                  <div className="admin-ucard-id">
                    <div className="admin-user-name">{u.username}</div>
                    <div className="admin-user-email">{u.email}</div>
                  </div>
                  <span className="admin-ucard-date">{formatDate(u.created_at)}</span>
                </div>
                <div className="admin-ucard-tiles">
                  <button
                    type="button"
                    className={`admin-tile${u.is_admin ? " on" : ""}`}
                    onClick={() => setUserIsAdmin(u.id, !u.is_admin)}
                    aria-pressed={u.is_admin}
                  >
                    <span className="admin-tile-cap">Admin</span>
                    <span className={`admin-toggle${u.is_admin ? " on" : ""}`}>
                      <span className="admin-toggle-knob" />
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`admin-tile${u.chatbot_enabled ? " on" : ""}`}
                    onClick={() => setUserChatbotAccess(u.id, !u.chatbot_enabled)}
                    aria-pressed={u.chatbot_enabled}
                  >
                    <span className="admin-tile-cap">AI chatbot</span>
                    <span className={`admin-toggle${u.chatbot_enabled ? " on" : ""}`}>
                      <span className="admin-toggle-knob" />
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`admin-tile admin-tile--danger${u.is_disabled ? " on" : ""}`}
                    onClick={() => setUserDisabled(u.id, !u.is_disabled)}
                    aria-pressed={u.is_disabled}
                  >
                    <span className="admin-tile-cap">Disabled</span>
                    <span className={`admin-toggle admin-toggle--danger${u.is_disabled ? " on" : ""}`}>
                      <span className="admin-toggle-knob" />
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="admin-user-table admin-user-table--wide">
            <div className="admin-user-row admin-user-row--head">
              <span>User</span>
              <span>Joined</span>
              <span>Admin</span>
              <span>AI Chatbot</span>
              <span>Disabled</span>
            </div>
            {adminUsers.map((u) => (
              <div className="admin-user-row" key={u.id}>
                <div className="admin-user-identity">
                  <div className="admin-user-av">
                    {u.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="admin-user-name">{u.username}</div>
                    <div className="admin-user-email">{u.email}</div>
                  </div>
                </div>
                <span className="admin-user-joined">{formatDate(u.created_at)}</span>
                <button
                  type="button"
                  className={`admin-toggle${u.is_admin ? " on" : ""}`}
                  onClick={() => setUserIsAdmin(u.id, !u.is_admin)}
                  aria-pressed={u.is_admin}
                  title={u.is_admin ? "Revoke admin access" : "Grant admin access"}
                >
                  <span className="admin-toggle-knob" />
                </button>
                <button
                  type="button"
                  className={`admin-toggle${u.chatbot_enabled ? " on" : ""}`}
                  onClick={() => setUserChatbotAccess(u.id, !u.chatbot_enabled)}
                  aria-pressed={u.chatbot_enabled}
                  title={
                    u.chatbot_enabled ? "Revoke AI chatbot access" : "Grant AI chatbot access"
                  }
                >
                  <span className="admin-toggle-knob" />
                </button>
                <button
                  type="button"
                  className={`admin-toggle admin-toggle--danger${u.is_disabled ? " on" : ""}`}
                  onClick={() => setUserDisabled(u.id, !u.is_disabled)}
                  aria-pressed={u.is_disabled}
                  title={u.is_disabled ? "Re-enable this account" : "Disable this account (blocks login)"}
                >
                  <span className="admin-toggle-knob" />
                </button>
              </div>
            ))}
          </div>
        )}
        <UsersPagination />
      </div>
    </div>
  );
}

function ProviderKeysPanel({ activeProvider, onSelectProvider }) {
  const {
    providerKeys,
    providerKeysLoading,
    providerKeysSaving,
    fetchProviderKeys,
    saveProviderKey,
  } = useStore();
  const [drafts, setDrafts] = useState({});
  const [revealed, setRevealed] = useState({});
  const [justSaved, setJustSaved] = useState(null);

  useEffect(() => {
    fetchProviderKeys();
  }, []);

  if (providerKeysLoading && !providerKeys) {
    return <div className="admin-dashboard-empty">Loading API keys…</div>;
  }

  const onSave = async (provider) => {
    const value = (drafts[provider] || "").trim();
    const ok = await saveProviderKey(provider, value);
    if (ok) {
      setDrafts((d) => ({ ...d, [provider]: "" }));
      setJustSaved(provider);
      setTimeout(() => setJustSaved((cur) => (cur === provider ? null : cur)), 1400);
    }
  };

  return (
    <div className="admin-keys-list admin-keys-list--flat">
      {PROVIDERS.map((p) => {
        const status = providerKeys?.[p.value];
        const saving = !!providerKeysSaving?.[p.value];
        const isActive = activeProvider === p.value;
        const hasDraft = !!(drafts[p.value] || "").trim();
        const statusKind = status?.configured
          ? status.source === "database"
            ? "set"
            : "env"
          : "unset";
        return (
          <div
            className={`admin-key-row admin-key-row--${statusKind}${isActive ? " is-active" : ""}${
              justSaved === p.value ? " just-saved" : ""
            }`}
            key={p.value}
            role="button"
            tabIndex={0}
            onClick={() => onSelectProvider?.(p.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectProvider?.(p.value);
              }
            }}
            title={isActive ? undefined : `Switch Model config to ${p.short}`}
          >
            <div className={`admin-key-avatar admin-key-avatar--${p.color}`}>
              {p.short.charAt(0)}
            </div>
            <div className="admin-key-identity">
              <span className="admin-key-provider">
                {p.short}
                {isActive && <span className="admin-key-active-pill">Active</span>}
              </span>
              <span className="admin-key-sub">
                <span className={`admin-key-dot admin-key-dot--${statusKind}`} />
                {status?.configured
                  ? `${status.masked}${status.source === "env" ? " · .env" : ""}`
                  : "Not configured"}
              </span>
            </div>
            <div className="admin-key-row-input" onClick={(e) => e.stopPropagation()}>
              <div className="admin-key-input-wrap">
                <input
                  className="admin-key-input"
                  type={revealed[p.value] ? "text" : "password"}
                  autoComplete="off"
                  placeholder={status?.configured ? "Replace key…" : "Paste API key…"}
                  value={drafts[p.value] || ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [p.value]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && hasDraft && !saving) onSave(p.value);
                  }}
                />
                <button
                  type="button"
                  className="admin-key-reveal"
                  onClick={() => setRevealed((r) => ({ ...r, [p.value]: !r[p.value] }))}
                  tabIndex={-1}
                  title={revealed[p.value] ? "Hide" : "Show"}
                >
                  {revealed[p.value] ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              <button
                type="button"
                className={`admin-key-save${hasDraft ? " is-armed" : ""}${
                  justSaved === p.value ? " just-saved" : ""
                }`}
                disabled={saving || !hasDraft}
                onClick={() => onSave(p.value)}
                title="Save key"
              >
                {saving ? (
                  <span className="admin-key-save-spinner" />
                ) : justSaved === p.value ? (
                  <Check size={14} />
                ) : (
                  <ArrowRight size={14} />
                )}
              </button>
              {status?.source === "database" && (
                <button
                  type="button"
                  className="admin-key-clear"
                  disabled={saving}
                  onClick={() => saveProviderKey(p.value, "")}
                  title="Clear this key (falls back to .env, if set)"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AiProviderTab() {
  const { aiConfig, aiConfigLoading, aiConfigSaving, fetchAiConfig, saveAiConfig } = useStore();
  const [form, setForm] = useState(null);
  const [customModel, setCustomModel] = useState(false);

  useEffect(() => {
    fetchAiConfig();
  }, []);

  useEffect(() => {
    if (aiConfig && !form) {
      setForm(aiConfig);
      setCustomModel(!!aiConfig.model && !MODEL_OPTIONS[aiConfig.provider]?.includes(aiConfig.model));
    }
  }, [aiConfig]);

  if (aiConfigLoading || !form) {
    return <div className="admin-dashboard-empty">Loading AI config…</div>;
  }

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const onProviderChange = (provider) => {
    const options = MODEL_OPTIONS[provider] || [];
    setForm((f) => ({ ...f, provider, model: options[0] || "" }));
    setCustomModel(false);
  };

  const onModelSelectChange = (value) => {
    if (value === CUSTOM_MODEL) {
      setCustomModel(true);
      set("model", "");
    } else {
      setCustomModel(false);
      set("model", value);
    }
  };

  const onSave = async (e) => {
    e.preventDefault();
    await saveAiConfig({
      provider: form.provider,
      model: form.model || null,
      temperature: form.temperature === "" ? null : Number(form.temperature),
      max_tokens: form.max_tokens === "" ? null : Number(form.max_tokens),
      timeout: Number(form.timeout) || 20,
      max_retries: Number(form.max_retries) || 1,
    });
  };

  const modelOptions = MODEL_OPTIONS[form.provider] || [];

  return (
    <div className="admin-dashboard-body">
      <div className="admin-ai-columns">
      <div className="admin-panel">
        <div className="admin-panel-title">
          <SlidersHorizontal size={15} />
          <span>Model</span>
        </div>
        <div className="admin-panel-desc">
          Switch the chat LLM provider/model live - takes effect on the next chat turn, no
          redeploy.
        </div>

        <form className="admin-ai-form" onSubmit={onSave}>
          <label className="admin-form-field">
            <span>Provider</span>
            <div className="admin-select-wrap">
              <select
                className="d-input-field admin-select"
                value={form.provider}
                onChange={(e) => onProviderChange(e.target.value)}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="admin-select-chevron" />
            </div>
          </label>

          <label className="admin-form-field">
            <span>Model</span>
            <div className="admin-select-wrap">
              <select
                className="d-input-field admin-select"
                value={customModel ? CUSTOM_MODEL : form.model || ""}
                onChange={(e) => onModelSelectChange(e.target.value)}
              >
                {!modelOptions.includes(form.model) && form.model && !customModel && (
                  <option value={form.model}>{form.model}</option>
                )}
                {modelOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
                <option value={CUSTOM_MODEL}>Custom…</option>
              </select>
              <ChevronDown size={16} className="admin-select-chevron" />
            </div>
          </label>

          {customModel && (
            <label className="admin-form-field">
              <span>Custom model name</span>
              <input
                className="d-input-field"
                placeholder="e.g. mistralai/mistral-large"
                value={form.model || ""}
                onChange={(e) => set("model", e.target.value)}
                autoFocus
              />
            </label>
          )}

          <div className="admin-form-divider">Advanced</div>

          <div className="admin-form-row">
            <label className="admin-form-field">
              <span>
                Temperature
                <span className="admin-field-value">
                  {form.temperature === "" || form.temperature == null ? "default" : form.temperature}
                </span>
              </span>
              <div className="admin-slider-row">
                <input
                  className="admin-slider"
                  type="range"
                  step="0.1"
                  min="0"
                  max="2"
                  value={form.temperature === "" || form.temperature == null ? 1 : form.temperature}
                  onChange={(e) => set("temperature", e.target.value)}
                  style={{
                    "--pct": `${(((form.temperature === "" || form.temperature == null ? 1 : form.temperature) / 2) * 100)}%`,
                  }}
                />
                <input
                  className="d-input-field admin-slider-number"
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  placeholder="1.0"
                  value={form.temperature ?? ""}
                  onChange={(e) => set("temperature", e.target.value)}
                />
              </div>
            </label>
            <label className="admin-form-field">
              <span>Max tokens</span>
              <input
                className="d-input-field"
                type="number"
                min="1"
                placeholder="default"
                value={form.max_tokens ?? ""}
                onChange={(e) => set("max_tokens", e.target.value)}
              />
            </label>
          </div>

          <div className="admin-form-row">
            <label className="admin-form-field">
              <span>Timeout (s)</span>
              <input
                className="d-input-field"
                type="number"
                min="1"
                value={form.timeout}
                onChange={(e) => set("timeout", e.target.value)}
              />
            </label>
            <label className="admin-form-field">
              <span>Max retries</span>
              <input
                className="d-input-field"
                type="number"
                min="0"
                value={form.max_retries}
                onChange={(e) => set("max_retries", e.target.value)}
              />
            </label>
          </div>

          <button type="submit" className="d-btn d-btn-primary admin-ai-save" disabled={aiConfigSaving}>
            <Save size={15} />
            {aiConfigSaving ? "Saving…" : "Save AI config"}
          </button>
        </form>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-title">
          <KeyRound size={15} />
          <span>Provider API Keys</span>
        </div>
        <div className="admin-panel-desc">
          Set directly here, or leave blank to fall back to that provider's .env value (Groq
          already works out of the box this way).
        </div>
        <ProviderKeysPanel activeProvider={form.provider} onSelectProvider={onProviderChange} />
      </div>
      </div>
    </div>
  );
}

function FeatureFlagsTab() {
  const { featureFlags, featureFlagsLoading, fetchFeatureFlags, setFeatureFlag } = useStore();

  useEffect(() => {
    fetchFeatureFlags();
  }, []);

  if (featureFlagsLoading || !featureFlags) {
    return <div className="admin-dashboard-empty">Loading feature flags…</div>;
  }

  const items = [
    {
      key: "jev_fast_path_enabled",
      label: "Jev fast-path commands",
      desc: "Bypass the LLM entirely for simple commands (dark mode, privacy mode, listing banks/tags).",
    },
    {
      key: "voice_input_enabled",
      label: "Voice input (mic button)",
      desc: "Shows the speech-to-text mic button in the chat window.",
    },
  ];

  return (
    <div className="admin-dashboard-body">
      <div className="admin-panel">
        <div className="admin-panel-title">
          <ToggleRight size={15} />
          <span>Runtime Toggles</span>
        </div>
        <div className="admin-panel-desc">
          Flip instantly for every user, no redeploy needed.
        </div>
        <div className="admin-flag-list">
          {items.map((item) => (
            <div className="admin-flag-row" key={item.key}>
              <div>
                <div className="admin-flag-label">{item.label}</div>
                <div className="admin-flag-desc">{item.desc}</div>
              </div>
              <button
                type="button"
                className={`admin-toggle${featureFlags[item.key] ? " on" : ""}`}
                onClick={() => setFeatureFlag(item.key, !featureFlags[item.key])}
                aria-pressed={featureFlags[item.key]}
              >
                <span className="admin-toggle-knob" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatTokenTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return iso;
  }
}

function TokenMetricsPanel() {
  const { llmMetrics, llmMetricsLoading, fetchLlmMetrics } = useStore();

  useEffect(() => {
    fetchLlmMetrics();
  }, []);

  const today = llmMetrics?.today;
  const lifetime = llmMetrics?.lifetime;
  const recent = llmMetrics?.recent || [];

  return (
    <div className="admin-panel">
      <div className="admin-panel-row">
        <div>
          <div className="admin-panel-title">
            <BarChart3 size={15} />
            <span>Token Usage</span>
          </div>
          <div className="admin-panel-desc admin-panel-desc--tight">
            How many tokens chat requests are actually sending to the LLM - process-local,
            resets on restart, not a billing system of record.
          </div>
        </div>
        <button
          type="button"
          className="admin-refresh-btn"
          onClick={fetchLlmMetrics}
          disabled={llmMetricsLoading}
          title="Refresh"
        >
          <RefreshCw size={14} className={llmMetricsLoading ? "spin" : ""} />
        </button>
      </div>

      {llmMetricsLoading && !llmMetrics ? (
        <div className="admin-dashboard-empty">Loading…</div>
      ) : (
        <>
          <div className="admin-stat-grid">
            <div className="admin-stat-tile">
              <div className="admin-stat-label">Requests Today</div>
              <div className="admin-stat-value">{today?.requests ?? 0}</div>
            </div>
            <div className="admin-stat-tile">
              <div className="admin-stat-label">Tokens Today</div>
              <div className="admin-stat-value">{(today?.total_tokens ?? 0).toLocaleString()}</div>
            </div>
            <div className="admin-stat-tile">
              <div className="admin-stat-label">Avg Tokens / Req (today)</div>
              <div className="admin-stat-value">
                {today?.requests ? Math.round(today.total_tokens / today.requests).toLocaleString() : 0}
              </div>
            </div>
            <div className="admin-stat-tile">
              <div className="admin-stat-label">Lifetime Requests</div>
              <div className="admin-stat-value">{lifetime?.requests ?? 0}</div>
            </div>
            <div className="admin-stat-tile">
              <div className="admin-stat-label">Lifetime Tokens</div>
              <div className="admin-stat-value">{(lifetime?.total_tokens ?? 0).toLocaleString()}</div>
            </div>
          </div>

          {recent.length === 0 ? (
            <div className="admin-dashboard-empty">No chat requests recorded yet this session.</div>
          ) : (
            <div className="admin-token-table">
              <div className="admin-token-row admin-token-row--head">
                <span>Time</span>
                <span>Provider / Model</span>
                <span className="admin-token-category">Category</span>
                <span>In</span>
                <span>Out</span>
                <span>Total</span>
              </div>
              {recent.map((e, i) => (
                <div className="admin-token-row" key={i}>
                  <span className="admin-token-time">{formatTokenTime(e.at)}</span>
                  <span className="admin-token-model" title={e.model || ""}>
                    {e.provider}
                    {e.model ? ` · ${e.model}` : ""}
                  </span>
                  <span className="admin-token-category">{e.category || "—"}</span>
                  <span className="admin-token-num">{e.input_tokens.toLocaleString()}</span>
                  <span className="admin-token-num">{e.output_tokens.toLocaleString()}</span>
                  <span className="admin-token-num admin-token-num--total">
                    {e.total_tokens.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function UsageTab() {
  const { llmStatus, llmStatusLoading, fetchLlmStatus } = useStore();

  useEffect(() => {
    fetchLlmStatus();
  }, []);

  const err = llmStatus?.last_error;

  return (
    <div className="admin-dashboard-body">
      <div className="admin-panel">
        <div className="admin-panel-row">
          <div>
            <div className="admin-panel-title">
              <Activity size={15} />
              <span>LLM Status</span>
            </div>
            <div className="admin-panel-desc admin-panel-desc--tight">
              Most recent chat-LLM failure, if any - lets you see why chat is slow/erroring
              without reading server logs.
            </div>
          </div>
          <button
            type="button"
            className="admin-refresh-btn"
            onClick={fetchLlmStatus}
            disabled={llmStatusLoading}
            title="Refresh"
          >
            <RefreshCw size={14} className={llmStatusLoading ? "spin" : ""} />
          </button>
        </div>

        {llmStatusLoading && !llmStatus ? (
          <div className="admin-dashboard-empty">Loading…</div>
        ) : !err ? (
          <div className="admin-dashboard-empty admin-dashboard-empty--ok">
            <Check size={15} /> No recent errors - the chat LLM is responding normally.
          </div>
        ) : (
          <div className="admin-usage-card">
            <div className="admin-usage-row">
              <span className="admin-usage-key">Provider</span>
              <span className="admin-usage-val">{err.provider}</span>
            </div>
            <div className="admin-usage-row">
              <span className="admin-usage-key">At</span>
              <span className="admin-usage-val">{new Date(err.at).toLocaleString()}</span>
            </div>
            {err.quota && (
              <>
                <div className="admin-usage-row">
                  <span className="admin-usage-key">Tokens used</span>
                  <span className="admin-usage-val">
                    {err.quota.used.toLocaleString()} / {err.quota.limit.toLocaleString()}
                  </span>
                </div>
                <div className="admin-usage-row">
                  <span className="admin-usage-key">Retry after</span>
                  <span className="admin-usage-val">
                    {Math.ceil(err.quota.retry_after_seconds / 60)} min
                  </span>
                </div>
              </>
            )}
            <div className="admin-usage-message">{err.message}</div>
          </div>
        )}
      </div>

      <TokenMetricsPanel />
    </div>
  );
}

export default function AdminDashboard() {
  const { isAdminDashboardOpen, setAdminDashboardOpen } = useStore();
  const [tab, setTab] = useState("users");

  useEffect(() => {
    if (!isAdminDashboardOpen) setTab("users");
  }, [isAdminDashboardOpen]);

  if (!isAdminDashboardOpen) return null;

  const close = () => setAdminDashboardOpen(false);

  return (
    <div className="inline-view" aria-labelledby="admin-dashboard-title">
      <div className="admin-page-inner">
        <div className="admin-page-header">
          <div className="dialog-icon acid">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div id="admin-dashboard-title" className="dialog-title">
              Admin Dashboard
            </div>
            <div className="dialog-sub">Manage users, the AI provider, and runtime settings</div>
          </div>
          <button className="dialog-close admin-page-close" onClick={close} aria-label="Close">
            ×
          </button>
        </div>

        <div className="admin-tabs">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                className={`admin-tab-btn${tab === t.id ? " active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                <Icon size={15} />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="admin-page-content">
          {tab === "users" && <UsersTab />}
          {tab === "ai" && <AiProviderTab />}
          {tab === "flags" && <FeatureFlagsTab />}
          {tab === "usage" && <UsageTab />}
        </div>
      </div>
    </div>
  );
}
