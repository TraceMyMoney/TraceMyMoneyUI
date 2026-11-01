import React, { useEffect, useState } from "react";
import { useStore } from "../store/useStore.js";
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
  SlidersHorizontal,
  Save,
  BarChart3,
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
  { value: "groq", label: "Groq (ChatGroq)" },
  { value: "openai", label: "OpenAI (ChatOpenAI)" },
  { value: "anthropic", label: "Anthropic (ChatAnthropic)" },
  { value: "openrouter", label: "OpenRouter" },
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

function UsersTab() {
  const {
    adminUsers,
    adminUsersLoading,
    fetchAdminUsers,
    setUserChatbotAccess,
    setUserIsAdmin,
    setUserDisabled,
  } = useStore();
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchAdminUsers();
  }, []);

  const enabledCount = adminUsers.filter((u) => u.chatbot_enabled).length;
  const q = query.trim().toLowerCase();
  const visibleUsers = q
    ? adminUsers.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q),
      )
    : adminUsers;

  return (
    <div className="admin-dashboard-body">
      <div className="admin-panel">
        <div className="admin-panel-row">
          <div className="admin-tab-sub admin-tab-sub--wide admin-tab-sub--tight">
            {q
              ? `${visibleUsers.length} of ${adminUsers.length} users`
              : `${adminUsers.length} user${adminUsers.length === 1 ? "" : "s"}`}{" "}
            · {enabledCount} with AI chatbot access
          </div>

          {!adminUsersLoading && adminUsers.length > 0 && (
            <div className="d-input-wrap admin-search-wrap">
              <div className="d-input-icon">
                <Search size={15} />
              </div>
              <input
                className="d-input-field"
                placeholder="Search by username or email..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
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
          )}
        </div>

        {adminUsersLoading ? (
          <div className="admin-dashboard-empty">Loading users…</div>
        ) : adminUsers.length === 0 ? (
          <div className="admin-dashboard-empty">No users found.</div>
        ) : visibleUsers.length === 0 ? (
          <div className="admin-dashboard-empty">No users match "{query}".</div>
        ) : (
          <div className="admin-user-table admin-user-table--wide">
            <div className="admin-user-row admin-user-row--head">
              <span>User</span>
              <span>Joined</span>
              <span>Admin</span>
              <span>AI Chatbot</span>
              <span>Disabled</span>
            </div>
            {visibleUsers.map((u) => (
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
      </div>
    </div>
  );
}

function ProviderKeysPanel() {
  const { providerKeys, providerKeysLoading, providerKeysSaving, fetchProviderKeys, saveProviderKey } =
    useStore();
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    fetchProviderKeys();
  }, []);

  if (providerKeysLoading && !providerKeys) {
    return <div className="admin-dashboard-empty">Loading API keys…</div>;
  }

  const onSave = async (provider) => {
    const value = (drafts[provider] || "").trim();
    const ok = await saveProviderKey(provider, value);
    if (ok) setDrafts((d) => ({ ...d, [provider]: "" }));
  };

  return (
    <div className="admin-keys-list admin-keys-list--cards">
      {PROVIDERS.map((p) => {
        const status = providerKeys?.[p.value];
        const saving = !!providerKeysSaving?.[p.value];
        return (
          <div className="admin-key-row" key={p.value}>
            <div className="admin-key-row-head">
              <span className="admin-key-provider">{p.label}</span>
              {status?.configured ? (
                <span className={`admin-badge admin-badge--${status.source === "database" ? "admin" : "neutral"}`}>
                  <Check size={11} /> {status.masked}
                  {status.source === "env" ? " (.env)" : ""}
                </span>
              ) : (
                <span className="admin-badge admin-badge--warn">Not set</span>
              )}
            </div>
            <div className="admin-key-row-input">
              <input
                className="d-input-field"
                type="password"
                autoComplete="off"
                placeholder={status?.configured ? "Enter a new key to replace it…" : "Paste API key…"}
                value={drafts[p.value] || ""}
                onChange={(e) => setDrafts((d) => ({ ...d, [p.value]: e.target.value }))}
              />
              <button
                type="button"
                className="d-btn d-btn-primary admin-key-save"
                disabled={saving || !(drafts[p.value] || "").trim()}
                onClick={() => onSave(p.value)}
              >
                {saving ? "…" : "Save"}
              </button>
              {status?.source === "database" && (
                <button
                  type="button"
                  className="admin-key-clear"
                  disabled={saving}
                  onClick={() => saveProviderKey(p.value, "")}
                  title="Clear this key (falls back to .env, if set)"
                >
                  <X size={14} />
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

          <div className="admin-form-row">
            <label className="admin-form-field">
              <span>Temperature</span>
              <input
                className="d-input-field"
                type="number"
                step="0.1"
                min="0"
                max="2"
                placeholder="default"
                value={form.temperature ?? ""}
                onChange={(e) => set("temperature", e.target.value)}
              />
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
        <ProviderKeysPanel />
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
    <div className="admin-page" role="dialog" aria-modal="true" aria-labelledby="admin-dashboard-title">
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
