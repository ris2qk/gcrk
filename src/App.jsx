import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles, Send, ShieldCheck, ArrowRight, TrendingUp, Building2,
  CreditCard, Umbrella, Coins, GraduationCap, Lock, Loader2,
  LayoutDashboard, Smartphone, CheckCircle2, Target, Gauge
} from "lucide-react";

// ── Visual tokens (no brand yet — name/logo left blank) ──
const C = {
  ink: "#123B30",
  inkDeep: "#0C2A22",
  gold: "#C58A2E",
  goldSoft: "#E9C77E",
  paper: "#F1EFE8",
  card: "#FFFFFF",
  line: "#E3DFD4",
  text: "#1C2B25",
  muted: "#6B7A72",
};

const SEGMENT_ICON = {
  "Starting to invest": TrendingUp,
  "Business funding": Building2,
  "Credit & debt": CreditCard,
  "Insurance & protection": Umbrella,
  "Side income": Coins,
  "General literacy": GraduationCap,
};

const STARTERS = {
  en: [
    "How do I start investing with R500?",
    "How do I get funding for my side hustle?",
    "What is a tax-free savings account?",
    "How do I register a business in South Africa?",
  ],
  af: [
    "Hoe begin ek belê met R500?",
    "Hoe kry ek befondsing vir my byverdienste?",
    "Wat is 'n belastingvrye spaarrekening?",
    "Hoe registreer ek 'n onderneming in Suid-Afrika?",
  ],
};

const GREETING = {
  en: "Sawubona! 👋 I'm your money coach. Ask me anything about money, business or building wealth in South Africa — it's free, and there's no such thing as a silly question.",
  af: "Hallo! 👋 Ek is jou geldafrigter. Vra my enigiets oor geld, besigheid of die bou van welvaart in Suid-Afrika — dit is gratis, en daar is nie iets soos 'n dom vraag nie.",
};

const PLACEHOLDER = {
  en: "Ask about saving, investing, business, debt…",
  af: "Vra oor spaar, belê, besigheid, skuld…",
};

const LANG_LABEL = { en: "English", af: "Afrikaans" };

const SEED_LEADS = [
  { id: "s1", name: "Thandi M.", segment: "Starting to invest", score: 82,
    partner: "Licensed investment platform", consent: true,
    rationale: "Engaged, asked three follow-ups on first steps and risk; high intent.", t: "11:42" },
  { id: "s2", name: "Sipho D.", segment: "Business funding", score: 74,
    partner: "SME lender / funder", consent: true,
    rationale: "Running a registered business, seeking R150k working capital.", t: "11:58" },
  { id: "s3", name: "Lerato K.", segment: "General literacy", score: 31,
    partner: "None yet — keep nurturing", consent: true,
    rationale: "Early-stage learner, no transactional intent yet.", t: "12:10" },
];

async function callModel(messages, system) {
  // Calls our own serverless function (/api/claude), which holds the API key
  // server-side. The key is never sent to the browser.
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, system }),
  });
  const data = await res.json();
  if (!data || !Array.isArray(data.content)) throw new Error("Bad response");
  return data.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
}

const TUTOR_SYSTEM = `You are a warm, encouraging South African financial educator for a free money-education platform for everyday South Africans (entrepreneurs, side-hustlers, first-time investors).

Teach general financial and business literacy in plain, simple language. Use South African context: Rand (R), SARS, tax-free savings accounts, stokvels, the JSE, FSCA-registered providers, the NCR. Keep every answer short and mobile-friendly — at most 2-3 short paragraphs, no long lists.

ABSOLUTE RULE: You educate only. Never recommend a specific product, fund, bank, policy, app or provider, and never give individualised financial advice. If asked "what should I buy / where should I put my money", explain the general options and how to weigh them up, then note that a licensed financial adviser can give product-specific advice. Never be salesy. Be the trusted friend who explains things clearly.`;

const SCORE_SYSTEM = `You are a lead-qualification engine for a financial-education platform. Given a user's conversation with the education tutor, analyse their intent and qualify them as a commercial lead.

Respond with ONLY a valid JSON object. No preamble, no explanation, no markdown, no backticks.

Schema:
{
  "intent_segment": one of ["Starting to invest","Business funding","Credit & debt","Insurance & protection","Side income","General literacy"],
  "intent_confidence": integer 0-100,
  "lead_score": integer 0-100 (higher = more commercially ready, engaged and specific),
  "readiness": short phrase e.g. "Ready to act" / "Warming up" / "Early learner",
  "matched_partner_category": one of ["Licensed investment platform","SME lender / funder","FSCA-registered insurer","Bank / transactional","Business services","None yet — keep nurturing"],
  "profile_summary": one friendly sentence shown to the user about where they are,
  "rationale": one sentence for the operator explaining the score,
  "next_lesson": a short suggested free lesson title
}`;

export default function App() {
  const [mode, setMode] = useState("app");
  const [lang, setLang] = useState("en");
  const [messages, setMessages] = useState([
    { role: "assistant", content: GREETING.en },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [consent, setConsent] = useState({ education: true, partner: false });
  const [contact, setContact] = useState({ name: "", phone: "" });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [leads, setLeads] = useState(SEED_LEADS);
  const [err, setErr] = useState("");

  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const userTurns = messages.filter((m) => m.role === "user").length;

  function switchLang(l) {
    setLang(l);
    // If the conversation hasn't started, swap the greeting to match.
    if (userTurns === 0) setMessages([{ role: "assistant", content: GREETING[l] }]);
  }

  async function send(text) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setErr("");
    const next = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const reply = await callModel(
        next.map((m) => ({ role: m.role, content: m.content })),
        TUTOR_SYSTEM
      );
      setMessages([...next, { role: "assistant", content: reply || "Let me try that again — ask me once more." }]);
    } catch (e) {
      setMessages(next);
      setErr("The coach is offline for a moment. Try sending that again.");
    } finally {
      setLoading(false);
    }
  }

  function openProfile() {
    setConsent({ education: true, partner: false });
    setContact({ name: "", phone: "" });
    setConsentOpen(true);
  }

  async function generateProfile() {
    setConsentOpen(false);
    setProfileLoading(true);
    setErr("");
    try {
      const transcript = messages
        .map((m) => `${m.role === "user" ? "User" : "Tutor"}: ${m.content}`)
        .join("\n");
      const raw = await callModel(
        [{ role: "user", content: `Conversation:\n${transcript}\n\nQualify this lead now.` }],
        SCORE_SYSTEM
      );
      const clean = raw.replace(/```json|```/g, "").trim();
      const p = JSON.parse(clean);
      setProfile(p);
      if (consent.partner) {
        setLeads((prev) => [
          {
            id: "live" + Date.now(),
            name: contact.name?.trim() || "New lead",
            segment: p.intent_segment,
            score: p.lead_score,
            partner: p.matched_partner_category,
            consent: true,
            rationale: p.rationale,
            t: new Date().toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }),
            live: true,
          },
          ...prev,
        ]);
      }
    } catch (e) {
      setErr("Couldn't build the profile just now. Send one more message to the coach, then try again.");
    } finally {
      setProfileLoading(false);
    }
  }

  return (
    <div style={{ background: C.paper, color: C.text, minHeight: "100%", fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap');
        .imali-disp { font-family: 'Fraunces', Georgia, serif; }
        .imali-chip:hover { background:${C.ink}; color:#fff; border-color:${C.ink}; }
        .imali-chip { transition: all .15s ease; }
        .imali-fade { animation: imaliFade .45s ease both; }
        @keyframes imaliFade { from { opacity:0; transform: translateY(8px);} to {opacity:1; transform:none;} }
        .imali-btn:focus-visible, .imali-tap:focus-visible { outline: 2px solid ${C.gold}; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce){ .imali-fade{ animation:none; } }
        textarea::placeholder, input::placeholder { color:${C.muted}; }
      `}</style>

      {/* top bar */}
      <div style={{ background: C.inkDeep, color: "#fff" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 26, height: 26, borderRadius: 8, border: "1px dashed rgba(255,255,255,.35)", display: "grid", placeItems: "center" }}>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,.4)" }}>+</span>
            </span>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,.5)", letterSpacing: ".04em" }}>[ brand name TBD ]</span>
            <span style={{ fontSize: 11, color: C.goldSoft, marginLeft: 4, letterSpacing: ".08em", textTransform: "uppercase" }}>proof of concept</span>
          </div>
          <div style={{ display: "flex", background: "rgba(255,255,255,.08)", borderRadius: 999, padding: 3 }}>
            <ModeTab active={mode === "app"} onClick={() => setMode("app")} icon={Smartphone} label="The app" />
            <ModeTab active={mode === "operator"} onClick={() => setMode("operator")} icon={LayoutDashboard} label="Operator view" />
          </div>
        </div>
      </div>

      {mode === "app" ? (
        <ConsumerApp
          messages={messages} input={input} setInput={setInput} loading={loading}
          send={send} scrollRef={scrollRef} userTurns={userTurns} openProfile={openProfile}
          profile={profile} profileLoading={profileLoading} err={err}
          lang={lang} switchLang={switchLang}
        />
      ) : (
        <OperatorDashboard leads={leads} />
      )}

      {consentOpen && (
        <ConsentSheet
          consent={consent} setConsent={setConsent}
          contact={contact} setContact={setContact}
          onClose={() => setConsentOpen(false)} onConfirm={generateProfile}
        />
      )}
    </div>
  );
}

function ModeTab({ active, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick} className="imali-tap"
      style={{ display: "flex", alignItems: "center", gap: 6, border: "none", cursor: "pointer",
        padding: "7px 14px", borderRadius: 999, fontSize: 13, fontWeight: 500,
        background: active ? "#fff" : "transparent", color: active ? C.inkDeep : "rgba(255,255,255,.8)" }}>
      <Icon size={15} /> {label}
    </button>
  );
}

function LangToggle({ lang, switchLang }) {
  const opt = (code, label) => (
    <button onClick={() => switchLang(code)} className="imali-tap"
      style={{ border: "none", cursor: "pointer", padding: "5px 11px", borderRadius: 999,
        fontSize: 12, fontWeight: 600, letterSpacing: ".02em",
        background: lang === code ? C.ink : "transparent",
        color: lang === code ? "#fff" : C.muted }}>
      {label}
    </button>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", background: C.paper, border: `1px solid ${C.line}`, borderRadius: 999, padding: 2 }}>
      {opt("en", "EN")}
      {opt("af", "AF")}
    </div>
  );
}

function ConsumerApp({ messages, input, setInput, loading, send, scrollRef, userTurns, openProfile, profile, profileLoading, err, lang, switchLang }) {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "26px 16px 40px" }}>
      <div style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", color: C.gold, fontWeight: 600, margin: "0 0 8px" }}>
          Free money education
        </p>
        <h1 className="imali-disp" style={{ fontSize: 34, lineHeight: 1.08, margin: 0, color: C.ink, fontWeight: 600, letterSpacing: "-.02em" }}>
          Learn money the easy way.
        </h1>
        <p style={{ color: C.muted, fontSize: 15, margin: "10px 0 0", maxWidth: 460 }}>
          Ask anything about money, business or wealth — built for South Africa. We teach first. No jargon, no pressure.
        </p>
      </div>

      {/* chat card */}
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 20, overflow: "hidden", boxShadow: "0 1px 0 rgba(0,0,0,.02)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "13px 16px", borderBottom: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 30, height: 30, borderRadius: 9, background: C.ink, display: "grid", placeItems: "center" }}>
              <Sparkles size={16} color={C.goldSoft} />
            </span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Money coach</div>
              <div style={{ fontSize: 11, color: C.muted }}>Educates only · never sells you a product</div>
            </div>
          </div>
          <LangToggle lang={lang} switchLang={switchLang} />
        </div>

        <div ref={scrollRef} style={{ maxHeight: 380, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {messages.map((m, i) => <Bubble key={i} role={m.role} text={m.content} />)}
          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 7, color: C.muted, fontSize: 13 }}>
              <Loader2 size={15} className="" style={{ animation: "spin 1s linear infinite" }} /> coaching…
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}
        </div>

        {userTurns === 0 && (
          <div style={{ padding: "0 16px 12px", display: "flex", flexWrap: "wrap", gap: 8 }}>
            {STARTERS[lang].map((s) => (
              <button key={s} onClick={() => send(s)} className="imali-chip imali-tap"
                style={{ border: `1px solid ${C.line}`, background: C.paper, color: C.text, borderRadius: 999, padding: "8px 13px", fontSize: 12.5, cursor: "pointer", fontWeight: 500 }}>
                {s}
              </button>
            ))}
          </div>
        )}

        <div style={{ borderTop: `1px solid ${C.line}`, padding: 12, display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            value={input} onChange={(e) => setInput(e.target.value)} rows={1}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={PLACEHOLDER[lang]}
            style={{ flex: 1, resize: "none", border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 12px", fontSize: 14, fontFamily: "inherit", color: C.text, outline: "none", maxHeight: 120 }}
          />
          <button onClick={() => send()} disabled={loading || !input.trim()} className="imali-btn"
            style={{ border: "none", cursor: loading || !input.trim() ? "default" : "pointer", background: C.ink, opacity: loading || !input.trim() ? .5 : 1, color: "#fff", borderRadius: 12, padding: "11px 13px", display: "grid", placeItems: "center" }}>
            <Send size={16} />
          </button>
        </div>
      </div>

      {err && <p style={{ color: "#9B2C2C", fontSize: 13, marginTop: 10 }}>{err}</p>}

      {/* profile CTA / result */}
      {!profile && (
        <button onClick={openProfile} disabled={userTurns === 0 || profileLoading} className="imali-btn"
          style={{ width: "100%", marginTop: 16, border: "none", borderRadius: 16, padding: "15px 18px", cursor: userTurns === 0 ? "default" : "pointer",
            background: userTurns === 0 ? "#D9D5C9" : C.gold, color: userTurns === 0 ? C.muted : C.inkDeep, fontWeight: 600, fontSize: 15,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
          {profileLoading ? <><Loader2 size={17} style={{ animation: "spin 1s linear infinite" }} /> Building your money profile…</>
            : <><Target size={17} /> Get my free money profile <ArrowRight size={16} /></>}
        </button>
      )}
      {userTurns === 0 && !profile && (
        <p style={{ textAlign: "center", color: C.muted, fontSize: 12, marginTop: 8 }}>Ask the coach a question first to unlock your profile.</p>
      )}

      {profile && <ProfileCard p={profile} />}

      <p style={{ marginTop: 22, fontSize: 11.5, color: C.muted, textAlign: "center", lineHeight: 1.5 }}>
        Working proof of concept · brand name and logo to be added · the coach is a live AI model<br />
        Education only — not financial advice under the FAIS Act.
      </p>
    </div>
  );
}

function renderRich(text) {
  // Turn **bold** into real bold and *italic* into real italics; leave the rest as-is.
  const parts = String(text).split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**") && p.length > 4)
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*") && p.length > 2)
      return <em key={i}>{p.slice(1, -1)}</em>;
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
}

function Bubble({ role, text }) {
  const me = role === "user";
  return (
    <div className="imali-fade" style={{ display: "flex", justifyContent: me ? "flex-end" : "flex-start" }}>
      <div style={{ maxWidth: "85%", whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.5,
        padding: "10px 13px", borderRadius: 14,
        background: me ? C.ink : C.paper, color: me ? "#fff" : C.text,
        border: me ? "none" : `1px solid ${C.line}`,
        borderBottomRightRadius: me ? 4 : 14, borderBottomLeftRadius: me ? 14 : 4 }}>
        {renderRich(text)}
      </div>
    </div>
  );
}

function ProfileCard({ p }) {
  const Icon = SEGMENT_ICON[p.intent_segment] || GraduationCap;
  const hot = p.lead_score >= 65;
  return (
    <div className="imali-fade" style={{ marginTop: 18, background: C.ink, color: "#fff", borderRadius: 20, overflow: "hidden" }}>
      <div style={{ padding: "20px 20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(233,199,126,.18)", display: "grid", placeItems: "center" }}>
            <Icon size={19} color={C.goldSoft} />
          </span>
          <div>
            <div style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: C.goldSoft }}>Your money profile</div>
            <div className="imali-disp" style={{ fontSize: 20, fontWeight: 600 }}>{p.intent_segment}</div>
          </div>
        </div>
        <p style={{ fontSize: 14.5, lineHeight: 1.5, color: "rgba(255,255,255,.9)", margin: 0 }}>{p.profile_summary}</p>
      </div>
      <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,.12)" }}>
        <Stat label="Readiness" value={p.readiness} />
        <Stat label="Suggested next lesson" value={p.next_lesson} border />
      </div>
      <div style={{ background: "rgba(0,0,0,.18)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 10 }}>
        <CheckCircle2 size={18} color={C.goldSoft} />
        <div style={{ fontSize: 13.5, lineHeight: 1.4 }}>
          We can connect you with a <b>{p.matched_partner_category}</b> when you're ready.
          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.6)", marginTop: 2 }}>A category, not a product — the choice always stays yours.</div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, border }) {
  return (
    <div style={{ flex: 1, padding: "13px 18px", borderLeft: border ? "1px solid rgba(255,255,255,.12)" : "none" }}>
      <div style={{ fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.55)" }}>{label}</div>
      <div style={{ fontSize: 13.5, fontWeight: 500, marginTop: 3 }}>{value}</div>
    </div>
  );
}

function ConsentSheet({ consent, setConsent, contact, setContact, onClose, onConfirm }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(12,42,34,.5)", display: "grid", placeItems: "end center", zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} className="imali-fade"
        style={{ width: "100%", maxWidth: 720, background: C.card, borderRadius: "22px 22px 0 0", padding: "22px 20px 26px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
          <ShieldCheck size={20} color={C.ink} />
          <h3 className="imali-disp" style={{ fontSize: 20, margin: 0, color: C.ink, fontWeight: 600 }}>Before we build your profile</h3>
        </div>
        <p style={{ fontSize: 13.5, color: C.muted, margin: "0 0 16px" }}>
          We follow POPIA. You choose exactly what you agree to, and you can opt out any time.
        </p>

        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <Field label="First name" value={contact.name} onChange={(v) => setContact({ ...contact, name: v })} placeholder="Optional" />
          <Field label="WhatsApp number" value={contact.phone} onChange={(v) => setContact({ ...contact, phone: v })} placeholder="Optional" />
        </div>

        <ConsentRow checked={consent.education} onToggle={() => setConsent({ ...consent, education: !consent.education })}
          title="Send me free lessons & tips" sub="Personalised education on WhatsApp or email." />
        <ConsentRow checked={consent.partner} onToggle={() => setConsent({ ...consent, partner: !consent.partner })}
          title="Connect me with a matched, licensed partner" sub="Only when relevant. Separate, explicit, opt-in — and logged." />

        <button onClick={onConfirm} className="imali-btn"
          style={{ width: "100%", marginTop: 16, border: "none", borderRadius: 14, padding: "14px", cursor: "pointer", background: C.gold, color: C.inkDeep, fontWeight: 600, fontSize: 15 }}>
          Build my profile
        </button>
        <button onClick={onClose} style={{ width: "100%", marginTop: 8, border: "none", background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>
          Not now
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <label style={{ flex: 1 }}>
      <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 5, fontWeight: 500 }}>{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 11px", fontSize: 14, fontFamily: "inherit", outline: "none", color: C.text }} />
    </label>
  );
}

function ConsentRow({ checked, onToggle, title, sub }) {
  return (
    <button onClick={onToggle} className="imali-tap"
      style={{ width: "100%", textAlign: "left", display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer",
        border: `1px solid ${checked ? C.ink : C.line}`, background: checked ? "rgba(18,59,48,.04)" : C.card, borderRadius: 14, padding: "13px 14px", marginBottom: 9 }}>
      <span style={{ marginTop: 1, width: 22, height: 22, borderRadius: 7, flexShrink: 0, display: "grid", placeItems: "center",
        background: checked ? C.ink : "#fff", border: `1px solid ${checked ? C.ink : C.line}` }}>
        {checked && <CheckCircle2 size={15} color="#fff" />}
      </span>
      <span>
        <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: C.text }}>{title}</span>
        <span style={{ display: "block", fontSize: 12.5, color: C.muted, marginTop: 2 }}>{sub}</span>
      </span>
    </button>
  );
}

function OperatorDashboard({ leads }) {
  const consented = leads.filter((l) => l.consent);
  const avg = consented.length ? Math.round(consented.reduce((a, l) => a + l.score, 0) / consented.length) : 0;
  const segCount = {};
  consented.forEach((l) => { segCount[l.segment] = (segCount[l.segment] || 0) + 1; });
  const topSeg = Object.entries(segCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  return (
    <div style={{ background: C.inkDeep, minHeight: "82vh" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "26px 18px 48px", color: "#fff" }}>
        <p style={{ fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: C.goldSoft, fontWeight: 600, margin: "0 0 6px" }}>
          The engine room
        </p>
        <h2 className="imali-disp" style={{ fontSize: 28, margin: 0, fontWeight: 600, letterSpacing: "-.01em" }}>Lead engine</h2>
        <p style={{ color: "rgba(255,255,255,.6)", fontSize: 14, margin: "8px 0 22px", maxWidth: 560 }}>
          Every consented learner is scored on intent and routed to a matched partner category. This is the proprietary layer a content brand alone can't build.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 22 }}>
          <Metric icon={ShieldCheck} label="Consented leads" value={consented.length} />
          <Metric icon={Gauge} label="Avg lead score" value={avg} />
          <Metric icon={Target} label="Top intent" value={topSeg} small />
          <Metric icon={Lock} label="POPIA basis" value="Opt-in, logged" small />
        </div>

        <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.3fr .9fr .5fr 1.1fr 1.5fr", gap: 8, padding: "12px 16px", fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: "rgba(255,255,255,.5)", borderBottom: "1px solid rgba(255,255,255,.1)" }}>
            <span>Lead</span><span>Intent</span><span>Score</span><span>Routed to</span><span>Why</span>
          </div>
          {leads.map((l) => <LeadRow key={l.id} l={l} />)}
        </div>
        <p style={{ fontSize: 11.5, color: "rgba(255,255,255,.45)", marginTop: 14 }}>
          Live leads you generate in the app appear here, scored by the same AI engine in real time.
        </p>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, small }) {
  return (
    <div style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 14, padding: "14px 16px" }}>
      <Icon size={17} color={C.goldSoft} />
      <div className="imali-disp" style={{ fontSize: small ? 17 : 26, fontWeight: 600, marginTop: 8, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.55)", marginTop: 3 }}>{label}</div>
    </div>
  );
}

function LeadRow({ l }) {
  const Icon = SEGMENT_ICON[l.segment] || GraduationCap;
  const color = l.score >= 65 ? C.goldSoft : l.score >= 40 ? "#9FB5AC" : "rgba(255,255,255,.5)";
  return (
    <div className="imali-fade" style={{ display: "grid", gridTemplateColumns: "1.3fr .9fr .5fr 1.1fr 1.5fr", gap: 8, padding: "13px 16px", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,.06)", fontSize: 13 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontWeight: 600 }}>{l.name}</span>
        {l.live && <span style={{ fontSize: 9.5, background: C.gold, color: C.inkDeep, padding: "1px 6px", borderRadius: 999, fontWeight: 700 }}>LIVE</span>}
        <span style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>{l.t}</span>
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,.85)" }}>
        <Icon size={14} color="rgba(255,255,255,.6)" /> {l.segment}
      </span>
      <span style={{ fontWeight: 700, color }}>{l.score}</span>
      <span style={{ color: "rgba(255,255,255,.85)", fontSize: 12.5 }}>{l.partner}</span>
      <span style={{ color: "rgba(255,255,255,.55)", fontSize: 12 }}>{l.rationale}</span>
    </div>
  );
}
