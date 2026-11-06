import React, { useEffect, useState } from "react";
import {
  MessageCircle,
  Mic,
  FileDown,
  Landmark,
  ShieldCheck,
  Tags,
  ArrowRight,
  Check,
  Wallet,
  Sparkles,
  Sun,
  Moon,
} from "lucide-react";
import { useStore } from "../store/useStore.js";

// Cycled in the hero's mock chat bubble - a quick, concrete demo of what
// "just talk to it" actually looks like, without needing a live backend
// call or a real account. Each one maps to a real capability this app
// has, not aspirational copy.
const DEMO_MESSAGES = [
  { you: "add 250 for groceries to HDFC", reply: "Done - ₹250 for groceries logged to HDFC." },
  { you: "download pdf of top 5 food expenses", reply: "Here's your PDF - sorted, grouped by bank, ready to download." },
  { you: "how much did I spend on travel this month?", reply: "₹4,120 across 6 entries this month." },
  { you: "turn on dark mode", reply: "Dark mode turned on." },
  { you: "show me my spending analytics", reply: "Opening Analytics - spend by bank, by tag, and over time." },
];

const FEATURES = [
  {
    icon: MessageCircle,
    color: "acid",
    title: "Talk to your money",
    desc: "No forms, no dropdowns - just type what happened in plain English and the AI assistant logs it, searches it, or explains it back to you.",
  },
  {
    icon: Mic,
    color: "purple",
    title: "Or just say it",
    desc: "Hands full? Tap the mic and speak your expense - it transcribes live and sends straight to the assistant.",
  },
  {
    icon: FileDown,
    color: "green",
    title: "Real PDF & CSV reports",
    desc: "\"Download my top 5 junkfood expenses\" gets you an actual file - grouped by bank, sorted by recency, expenses and top-ups kept separate so nothing nets out confusingly.",
  },
  {
    icon: Landmark,
    color: "acid",
    title: "Every account, one place",
    desc: "Track as many bank accounts as you want, each with its own running balance, top-ups, and full history.",
  },
  {
    icon: Tags,
    color: "purple",
    title: "Tag it your way",
    desc: "Organize spending with your own tags and instantly filter, search, or export by any of them.",
  },
  {
    icon: ShieldCheck,
    color: "green",
    title: "Private by default",
    desc: "A one-tap privacy mode hides every amount on screen, and your data never trains anyone else's model.",
  },
];

const ANALYTICS_POINTS = [
  "Spend over time, by bank, and by tag - three charts, one screen",
  "Filter by date range, account, tag, or a keyword search",
  "Quick presets - last 7 days, month to date, year to date, last month",
];

// A tiny hand-animated mock of the real Analytics view - bars rippling in,
// a donut slowly turning, a sparkline drawing itself - the same "concrete
// demo, not aspirational copy" approach as TypingDemo above, just for the
// chart feature instead of the chat one.
const ANALYTICS_BARS = [38, 62, 48, 78, 44, 68, 58];

const STEPS = [
  {
    n: "01",
    title: "Create your accounts",
    desc: "Add your bank accounts in seconds - set a starting balance and you're tracking.",
  },
  {
    n: "02",
    title: "Log expenses your way",
    desc: "Type it, say it, or use the quick-add form - whatever's fastest in the moment.",
  },
  {
    n: "03",
    title: "Ask anything, anytime",
    desc: "\"What did I spend on food in October?\" \"Download my top expenses as a PDF.\" Just ask.",
  },
];

function TypingDemo() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState("you"); // "you" -> "reply" -> "pause"

  useEffect(() => {
    const durations = { you: 1400, reply: 2200, pause: 900 };
    const id = setTimeout(() => {
      if (phase === "you") setPhase("reply");
      else if (phase === "reply") setPhase("pause");
      else {
        setPhase("you");
        setIndex((i) => (i + 1) % DEMO_MESSAGES.length);
      }
    }, durations[phase]);
    return () => clearTimeout(id);
  }, [phase]);

  const msg = DEMO_MESSAGES[index];
  const showReply = phase === "reply" || phase === "pause";

  return (
    <div className="landing-demo-chat">
      <div className="landing-demo-chat-head">
        <div className="landing-demo-chat-dot" />
        <span>Chat</span>
      </div>
      <div className="landing-demo-chat-body">
        <div className="landing-demo-bubble landing-demo-bubble--user">{msg.you}</div>
        {showReply && (
          <div className="landing-demo-bubble landing-demo-bubble--ai">{msg.reply}</div>
        )}
        {!showReply && (
          <div className="landing-demo-bubble landing-demo-bubble--ai landing-demo-bubble--typing">
            <span />
            <span />
            <span />
          </div>
        )}
      </div>
    </div>
  );
}

function AnalyticsDemo() {
  return (
    <div className="landing-demo-chat landing-demo-analytics">
      <div className="landing-demo-chat-head">
        <div className="landing-demo-chat-dot" />
        <span>Analytics</span>
      </div>
      <div className="landing-demo-analytics-body">
        <svg
          className="landing-demo-sparkline"
          viewBox="0 0 200 42"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <polyline points="0,32 18,24 36,28 54,12 72,20 90,8 108,18 126,10 144,22 162,6 180,14 200,4" />
        </svg>
        <div className="landing-demo-analytics-row">
          <div className="landing-demo-bars">
            {ANALYTICS_BARS.map((h, i) => (
              <div
                key={i}
                className="landing-demo-bar"
                style={{ "--h": `${h}%`, animationDelay: `${i * 0.18}s` }}
              />
            ))}
          </div>
          <div className="landing-demo-donut">
            <div className="landing-demo-donut-hole" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage({ onGetStarted, onSignIn }) {
  const [hoveredFeature, setHoveredFeature] = useState(null);
  // Local-only toggle (setIsDarkMode, not the preference-syncing action
  // used post-login) - a stranger browsing this page has no account yet
  // to persist a preference against; App.jsx's own effect already
  // applies/removes body.light off this same store value.
  const { isDarkMode, setIsDarkMode } = useStore();

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="landing-nav-logo">
          <div className="auth-logo-hex">₹</div>
          <div className="auth-logo-name">
            Stalk<span>My</span>Money
          </div>
        </div>
        <div className="landing-nav-actions">
          <button
            type="button"
            className="landing-theme-toggle"
            onClick={() => setIsDarkMode(!isDarkMode)}
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button type="button" className="landing-nav-signin" onClick={onSignIn}>
            Sign in
          </button>
          <button type="button" className="landing-nav-cta" onClick={onGetStarted}>
            Get started <ArrowRight size={15} />
          </button>
        </div>
      </nav>

      <header className="landing-hero">
        <div className="landing-hero-copy">
          <div className="landing-hero-badge">
            <Sparkles size={13} /> AI-powered expense tracking
          </div>
          <h1 className="landing-hero-title">
            Your money,
            <br />
            tracked by <span>conversation</span>.
          </h1>
          <p className="landing-hero-sub">
            Stop wrestling with forms and spreadsheets. Just tell StalkMyMoney what you spent,
            ask it anything about your finances, and get real reports back - all through one
            chat window.
          </p>
          <div className="landing-hero-actions">
            <button type="button" className="landing-hero-cta" onClick={onGetStarted}>
              Start tracking free <ArrowRight size={16} />
            </button>
            <button type="button" className="landing-hero-secondary" onClick={onSignIn}>
              I already have an account
            </button>
          </div>
          <div className="landing-hero-trust">
            <Check size={14} /> No credit card needed
            <Check size={14} /> Set up in under a minute
          </div>
        </div>
        <div className="landing-hero-visual">
          <TypingDemo />
        </div>
      </header>

      <section className="landing-features">
        <div className="landing-section-head">
          <span className="landing-eyebrow">Features</span>
          <h2>Everything a finance tracker should be - and talks back</h2>
        </div>
        <div className="landing-features-grid">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className={`landing-feature-card${hoveredFeature === i ? " is-hovered" : ""}`}
                onMouseEnter={() => setHoveredFeature(i)}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <div className={`landing-feature-icon landing-feature-icon--${f.color}`}>
                  <Icon size={20} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="landing-analytics-spotlight">
        <div className="landing-analytics-copy">
          <span className="landing-eyebrow">New - Analytics</span>
          <h2>Watch your spending patterns surface themselves</h2>
          <p>
            Every expense you log already feeds a live dashboard - no extra setup, no exports to
            a spreadsheet. Open it, pick a range, and see it.
          </p>
          <ul className="landing-analytics-points">
            {ANALYTICS_POINTS.map((point) => (
              <li key={point}>
                <Check size={14} />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="landing-analytics-visual">
          <AnalyticsDemo />
        </div>
      </section>

      <section className="landing-steps">
        <div className="landing-section-head">
          <span className="landing-eyebrow">How it works</span>
          <h2>Three steps. No learning curve.</h2>
        </div>
        <div className="landing-steps-row">
          {STEPS.map((s) => (
            <div className="landing-step" key={s.n}>
              <div className="landing-step-num">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-cta">
        <Wallet size={26} className="landing-cta-icon" />
        <h2>Ready to stop guessing where your money went?</h2>
        <p>Create your free account and log your first expense in the next 60 seconds.</p>
        <button type="button" className="landing-hero-cta" onClick={onGetStarted}>
          Get started free <ArrowRight size={16} />
        </button>
      </section>

      <footer className="landing-footer">
        <div className="landing-nav-logo">
          <div className="auth-logo-hex">₹</div>
          <div className="auth-logo-name">
            Stalk<span>My</span>Money
          </div>
        </div>
        <span>A conversational way to track every rupee.</span>
      </footer>
    </div>
  );
}
