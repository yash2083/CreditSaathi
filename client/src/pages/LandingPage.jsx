import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Shield, BarChart3, Landmark, Brain, Eye, Zap, ChevronRight } from "lucide-react";

/* ── Scroll reveal hook ── */
function useScrollReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.15 }
    );
    const el = ref.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, []);
  return ref;
}

function Section({ children, className = "", direction = "up" }) {
  const ref = useScrollReveal();
  const cls = direction === "left" ? "scroll-reveal-left" : direction === "right" ? "scroll-reveal-right" : "scroll-reveal";
  return <div ref={ref} className={`${cls} ${className}`}>{children}</div>;
}

/* ── Animated counter ── */
function CountUp({ target, suffix = "", duration = 1400 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started.current) {
          started.current = true;
          const start = Date.now();
          const tick = () => {
            const t = Math.min((Date.now() - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            setVal(Math.round(target * eased));
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => { if (ref.current) observer.unobserve(ref.current); };
  }, [target, duration]);

  return <span ref={ref}>{val}{suffix}</span>;
}

/* ── Mini gauge for landing ── */
function MiniGauge() {
  const [score, setScore] = useState(300);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) setTimeout(() => setScore(742), 300); },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => { if (ref.current) observer.unobserve(ref.current); };
  }, []);

  const r = 70, cx = 90, cy = 90;
  const circ = Math.PI * r;
  const pct = (score - 300) / 550;
  const offset = circ * (1 - pct);

  return (
    <svg ref={ref} width={180} height={110} viewBox="0 0 180 110">
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#E5E7EB" strokeWidth="10" strokeLinecap="round" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#1F7A63" strokeWidth="10" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)" }} />
      <text x={cx} y={cy - 12} textAnchor="middle" fill="#1F2937" style={{ fontSize: "28px", fontWeight: 700, fontFamily: "Inter" }}>{score > 300 ? score : ""}</text>
      <text x={cx} y={cy + 8} textAnchor="middle" fill="#2E7D32" style={{ fontSize: "10px", fontWeight: 600, fontFamily: "Inter" }}>{score > 300 ? "Low Risk" : ""}</text>
    </svg>
  );
}

export default function LandingPage() {
  const [headerSolid, setHeaderSolid] = useState(false);

  useEffect(() => {
    const handler = () => setHeaderSolid(window.scrollY > 60);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="bg-bg min-h-screen">
      {/* ── Sticky Header ── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${headerSolid ? "bg-white border-b border-border shadow-subtle" : "bg-transparent"}`}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xs">CS</div>
            <span className="text-sm font-semibold text-txt">CreditSaathi</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-txt-secondary hover:text-txt transition-colors font-medium">Sign In</Link>
            <Link to="/register" className="btn-primary text-sm py-2 px-4">Get Started <ArrowRight size={14} /></Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <Section direction="left">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-4">AI-Powered Credit Intelligence</p>
            <h1 className="text-4xl lg:text-5xl font-extrabold text-txt leading-[1.1] tracking-tight">
              Smarter Credit Intelligence for MSMEs
            </h1>
            <p className="text-txt-secondary mt-5 text-base leading-relaxed max-w-lg">
              CreditSaathi helps India&apos;s 63 million MSMEs build creditworthiness through explainable AI scoring, real-time risk analytics, and automated loan matching.
            </p>
            <div className="flex items-center gap-3 mt-8">
              <Link to="/register" className="btn-primary py-2.5 px-6">Get Started <ArrowRight size={16} /></Link>
              <Link to="/login" className="btn-secondary py-2.5 px-6">Sign In</Link>
            </div>
            <div className="flex items-center gap-8 mt-10 pt-6 border-t border-border">
              <div><p className="text-2xl font-bold text-txt"><CountUp target={63} suffix="M+" /></p><p className="text-xs text-txt-muted">MSMEs in India</p></div>
              <div><p className="text-2xl font-bold text-txt"><CountUp target={82} suffix="%" /></p><p className="text-xs text-txt-muted">Lack formal credit</p></div>
              <div><p className="text-2xl font-bold text-txt">₹<CountUp target={25} suffix="L Cr" /></p><p className="text-xs text-txt-muted">Credit gap</p></div>
            </div>
          </Section>

          <Section direction="right" className="flex justify-center">
            <div className="card p-8 max-w-sm w-full">
              <p className="text-xs text-txt-muted uppercase tracking-wide mb-4">Live Credit Score Preview</p>
              <div className="flex justify-center"><MiniGauge /></div>
              <div className="mt-4 space-y-2.5">
                {[
                  { label: "GST Consistency", val: "+0.082", pos: true, w: 80 },
                  { label: "Cash Flow Health", val: "+0.065", pos: true, w: 65 },
                  { label: "Revenue Growth", val: "+0.041", pos: true, w: 40 },
                  { label: "Cheque Bounce", val: "-0.028", pos: false, w: 28 },
                ].map((f, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-txt-secondary">{f.label}</span>
                      <span className={f.pos ? "text-success" : "text-danger"}>{f.val}</span>
                    </div>
                    <div className="h-1 bg-surface-alt rounded-full"><div className={`h-full rounded-full ${f.pos ? "bg-success" : "bg-danger"}`} style={{ width: `${f.w}%`, transition: "width 0.8s ease" }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        </div>
      </section>

      {/* ── Problem ── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <Section>
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">The Problem</p>
            <h2 className="text-3xl font-bold text-txt tracking-tight">India&apos;s MSME credit gap is massive</h2>
            <p className="text-txt-secondary mt-4 max-w-2xl mx-auto leading-relaxed">
              Over 80% of Indian MSMEs lack access to formal credit. Traditional underwriting fails to assess businesses without extensive financial history, leaving millions underserved.
            </p>
          </Section>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {[
              { stat: "63M+", label: "MSMEs in India's economy" },
              { stat: "82%", label: "Cannot access formal credit" },
              { stat: "₹25L Cr", label: "Estimated credit demand gap" },
            ].map((item, i) => (
              <Section key={i}>
                <div className="card p-6 text-center">
                  <p className="text-3xl font-bold text-primary">{item.stat}</p>
                  <p className="text-sm text-txt-secondary mt-2">{item.label}</p>
                </div>
              </Section>
            ))}
          </div>
        </div>
      </section>

      {/* ── Solution ── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <Section className="text-center mb-14">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">The Solution</p>
            <h2 className="text-3xl font-bold text-txt tracking-tight">AI scoring that banks can trust</h2>
            <p className="text-txt-secondary mt-4 max-w-xl mx-auto">CreditSaathi uses alternative data (GST filings, bank transactions, UPI activity) to build comprehensive, explainable credit profiles.</p>
          </Section>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Brain, title: "AI Credit Scoring", desc: "XGBoost model trained on MSME-specific financial signals, delivering credit scores from 300–850." },
              { icon: Eye, title: "Full Explainability", desc: "SHAP-based feature impact analysis so every scoring decision is transparent and auditable." },
              { icon: Zap, title: "Real-time Insights", desc: "Stress signals, fraud detection, and government scheme matching — all automated." },
            ].map((f, i) => (
              <Section key={i} direction={i === 0 ? "left" : i === 2 ? "right" : "up"}>
                <div className="card-hover p-6">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center mb-4">
                    <f.icon size={20} className="text-primary" strokeWidth={1.8} />
                  </div>
                  <h3 className="text-base font-semibold text-txt mb-2">{f.title}</h3>
                  <p className="text-sm text-txt-secondary leading-relaxed">{f.desc}</p>
                </div>
              </Section>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features / Dashboard Preview ── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <Section direction="left">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Platform Features</p>
            <h2 className="text-3xl font-bold text-txt tracking-tight">Everything you need in one dashboard</h2>
            <div className="mt-8 space-y-5">
              {[
                { icon: BarChart3, title: "Credit Score Gauge", desc: "Animated semi-circle gauge with real-time score updates and risk categorization." },
                { icon: Shield, title: "Risk & Fraud Detection", desc: "Early warning signals for cash flow stress, revenue decline, and data anomalies." },
                { icon: Landmark, title: "Loan Center", desc: "Apply for loans, track applications, and match with government schemes automatically." },
              ].map((f, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <f.icon size={18} className="text-primary" strokeWidth={1.8} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-txt">{f.title}</h4>
                    <p className="text-sm text-txt-secondary mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section direction="right">
            <div className="card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-txt">Dashboard Preview</h4>
                <span className="badge-low">Live</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[{ l: "Credit Score", v: "742" }, { l: "Risk Level", v: "Low" }, { l: "Loan Eligible", v: "₹50L" }, { l: "Data Status", v: "Active" }].map((c, i) => (
                  <div key={i} className="bg-surface-alt rounded-lg p-3">
                    <p className="text-[10px] text-txt-muted uppercase tracking-wide">{c.l}</p>
                    <p className="text-lg font-bold text-txt mt-1">{c.v}</p>
                  </div>
                ))}
              </div>
              <div className="bg-surface-alt rounded-lg p-3">
                <p className="text-[10px] text-txt-muted uppercase tracking-wide mb-2">Revenue Trend (8 months)</p>
                <div className="flex items-end gap-1 h-12">
                  {[45, 52, 38, 61, 49, 57, 63, 42].map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm bg-primary" style={{ height: `${h}%`, opacity: 0.5 + (h / 126), transition: `height 0.4s ease ${i * 80}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          </Section>
        </div>
      </section>

      {/* ── Trust / SHAP ── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Section>
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Explainable AI</p>
            <h2 className="text-3xl font-bold text-txt tracking-tight">Every decision is transparent</h2>
            <p className="text-txt-secondary mt-4 max-w-xl mx-auto">
              We use SHAP (Shapley Additive Explanations) to show exactly which factors influenced each credit score — no black boxes.
            </p>
          </Section>

          <Section className="mt-10">
            <div className="card p-6 max-w-lg mx-auto text-left">
              <h4 className="text-sm font-semibold text-txt mb-4">Feature Impact Analysis</h4>
              {[
                { f: "GST Filing Consistency", v: "+0.082", p: true, w: 82 },
                { f: "Cash Flow Health", v: "+0.065", p: true, w: 65 },
                { f: "Revenue Growth", v: "+0.041", p: true, w: 41 },
                { f: "Payment Behaviour", v: "+0.032", p: true, w: 32 },
                { f: "Digital Payments", v: "-0.015", p: false, w: 15 },
                { f: "Cheque Bounce Rate", v: "-0.028", p: false, w: 28 },
              ].map((f, i) => (
                <div key={i} className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-txt-secondary">{f.f}</span>
                    <span className={`font-mono font-medium ${f.p ? "text-success" : "text-danger"}`}>{f.v}</span>
                  </div>
                  <div className="h-1.5 bg-surface-alt rounded-full">
                    <div className={`h-full rounded-full ${f.p ? "bg-success" : "bg-danger"}`} style={{ width: `${f.w}%`, transition: `width 0.6s ease ${i * 100}ms` }} />
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <Section>
            <h2 className="text-3xl font-bold text-txt tracking-tight">Ready to transform your credit access?</h2>
            <p className="text-txt-secondary mt-4 max-w-lg mx-auto">
              Join thousands of MSMEs building stronger credit profiles with CreditSaathi&apos;s AI-powered platform.
            </p>
            <div className="flex items-center justify-center gap-3 mt-8">
              <Link to="/register" className="btn-primary py-3 px-8 text-base">Get Started Free <ArrowRight size={18} /></Link>
              <Link to="/login" className="btn-secondary py-3 px-8 text-base">Sign In <ChevronRight size={18} /></Link>
            </div>
          </Section>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center text-white font-bold text-[10px]">CS</div>
            <span className="text-sm font-medium text-txt">CreditSaathi</span>
          </div>
          <p className="text-xs text-txt-muted">© 2024 CreditSaathi Technologies. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
