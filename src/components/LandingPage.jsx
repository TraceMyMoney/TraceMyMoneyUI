import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import BIRDS from "vanta/dist/vanta.birds.min";
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
  MessageSquareText,
  BellRing,
} from "lucide-react";
import { useStore } from "../store/useStore.js";
import { usePhoneScreen } from "../useWideScreen.js";

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
    icon: MessageSquareText,
    color: "acid",
    title: "Bank SMS, added by itself",
    desc: "Forward your bank's debit and credit alerts and each one becomes an expense on the right account and day, with the balance updated.",
  },
  {
    icon: BellRing,
    color: "purple",
    title: "Nothing slips through",
    desc: "If an SMS doesn't say which account it belongs to, it waits for you, and the app tells you the moment you open it.",
  },
  {
    icon: ShieldCheck,
    color: "green",
    title: "Private by default",
    desc: "A one-tap privacy mode hides every amount on screen, and your data never trains anyone else's model.",
  },
];

const SMS_POINTS = [
  "Forward bank SMS from your iPhone with a one-time Shortcut, no app to install",
  "AI reads the amount, the merchant and the account, and adds it to that day",
  "A new day gets a new expense, a day you already have just gets another entry",
  "Anything it can't place waits for you, and you get an alert when you open the app",
];

const SMS_DEMO = [
  {
    sms: "Dear UPI user A/C X1234 debited by 250.00 on date 06Nov26 trf to Cafe Mocha",
    merchant: "Cafe Mocha",
    amount: "- ₹250",
    bank: "SBI",
    kind: "neg",
  },
  {
    sms: "Credit Alert! Rs.12,000.00 credited to HDFC Bank A/c XX8497 on 07-11-26 from VPA rent@oksbi",
    merchant: "Rent",
    amount: "+ ₹12,000",
    bank: "HDFC",
    kind: "pos",
  },
  {
    sms: "Rs.1,230.00 spent on your SBI Credit Card ending 5678 at BIG BAZAAR on 08/11/26",
    merchant: "Big Bazaar",
    amount: "- ₹1,230",
    bank: "SBI Credit Card",
    kind: "neg",
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
    desc: "Type it, say it, forward your bank SMS, or use the quick-add form - whatever's fastest in the moment.",
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

function SmsDemo() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState("sms"); // "sms" -> "reading" -> "added"

  useEffect(() => {
    const durations = { sms: 1500, reading: 1100, added: 2800 };
    const id = setTimeout(() => {
      if (phase === "sms") setPhase("reading");
      else if (phase === "reading") setPhase("added");
      else {
        setPhase("sms");
        setIndex((i) => (i + 1) % SMS_DEMO.length);
      }
    }, durations[phase]);
    return () => clearTimeout(id);
  }, [phase]);

  const item = SMS_DEMO[index];
  return (
    <div className="landing-demo-chat landing-demo-sms">
      <div className="landing-demo-chat-head">
        <div className="landing-demo-chat-dot" />
        <span>Bank SMS</span>
      </div>
      <div className="landing-demo-chat-body">
        <div className="landing-demo-bubble landing-demo-bubble--ai landing-demo-sms-text" key={`s${index}`}>
          {item.sms}
        </div>
        {phase === "reading" && (
          <div className="landing-demo-sms-status">
            <Sparkles size={13} /> Reading the message…
          </div>
        )}
        {phase === "added" && (
          <div className="landing-demo-expense" key={`e${index}`}>
            <div>
              <b>{item.merchant}</b>
              <span>Added to {item.bank}</span>
            </div>
            <em className={item.kind}>{item.amount}</em>
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

  // Vanta.js flock of birds behind the page. Recreated when the theme flips
  // so the colours follow it; skipped for reduced-motion users and when
  // WebGL is unavailable (the plain gradient background stays).
  const birdsRef = useRef(null);
  useEffect(() => {
    const el = birdsRef.current;
    if (!el || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    let effect;
    try {
      effect = BIRDS({
        el,
        THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200,
        minWidth: 200,
        scale: 1,
        scaleMobile: 1,
        backgroundAlpha: 0,
        color1: isDarkMode ? 0xb8ff00 : 0x6b8f00,
        color2: isDarkMode ? 0x9b7fff : 0x7a5af5,
        colorMode: "variance",
        quantity: window.innerWidth < 600 ? 3 : 4,
        birdSize: 1,
        wingSpan: 26,
        speedLimit: 4,
        separation: 20,
        alignment: 20,
        cohesion: 20,
      });
    } catch {
      /* no WebGL: keep the static background */
    }
    return () => effect?.destroy();
  }, [isDarkMode]);

  // Phones: a sticky "Start tracking free" bar appears once the hero button
  // has scrolled away, and tucks away again at the closing call to action.
  const phone = usePhoneScreen();
  const heroCtaRef = useRef(null);
  const closingRef = useRef(null);
  const [heroGone, setHeroGone] = useState(false);
  const [closingVisible, setClosingVisible] = useState(false);
  useEffect(() => {
    if (!phone || !("IntersectionObserver" in window)) return undefined;
    const root = heroCtaRef.current?.closest(".landing-page") || null;
    const hero = new IntersectionObserver(
      ([e]) => setHeroGone(!e.isIntersecting && e.boundingClientRect.top < 0),
      { root, threshold: 0 },
    );
    const closing = new IntersectionObserver(
      ([e]) => setClosingVisible(e.isIntersecting),
      { root, threshold: 0.2 },
    );
    if (heroCtaRef.current) hero.observe(heroCtaRef.current);
    if (closingRef.current) closing.observe(closingRef.current);
    return () => {
      hero.disconnect();
      closing.disconnect();
    };
  }, [phone]);

  return (
    <div className="landing-page">
      <div className="landing-birds" ref={birdsRef} aria-hidden="true" />
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
            <button
              type="button"
              className="landing-hero-cta"
              ref={heroCtaRef}
              onClick={onGetStarted}
            >
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

      <section className="landing-analytics-spotlight landing-sms-spotlight">
        <div className="landing-analytics-copy">
          <span className="landing-eyebrow">New - Automation</span>
          <h2>Your bank SMS become expenses on their own</h2>
          <p>
            Set it up once and every debit and credit alert from your bank lands in the right
            account without you typing a thing. You only step in when it can't tell which account
            a message belongs to.
          </p>
          <ul className="landing-analytics-points">
            {SMS_POINTS.map((point) => (
              <li key={point}>
                <Check size={14} />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="landing-analytics-visual">
          <SmsDemo />
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

      <section className="landing-cta" ref={closingRef}>
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

      {phone && (
        <div
          className={`landing-sticky${heroGone && !closingVisible ? " show" : ""}`}
          aria-hidden={!(heroGone && !closingVisible)}
        >
          <button type="button" className="landing-sticky-main" onClick={onGetStarted}>
            Start tracking free <ArrowRight size={16} />
          </button>
          <button type="button" className="landing-sticky-alt" onClick={onSignIn}>
            Sign in
          </button>
        </div>
      )}
    </div>
  );
}
