import { useState, useRef, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import api from "../services/api";
import {
  MessageSquare, X, Send, Sparkles, Bot, User, ChevronDown,
  Zap, TrendingUp, HelpCircle, Landmark, RotateCcw, Globe,
} from "lucide-react";

/* ── Language config ─────────────────────────────── */
const LANGUAGES = [
  { code: "en", label: "English", short: "EN", flag: "🇬🇧" },
  { code: "kn", label: "ಕನ್ನಡ", short: "ಕನ", flag: "🇮🇳" },
  { code: "hi", label: "हिंदी", short: "हि", flag: "🇮🇳" },
];

const QUICK_PROMPTS = {
  en: [
    { icon: TrendingUp, label: "Why is my score low?", color: "#EF4444" },
    { icon: Landmark, label: "Am I eligible for Mudra Yojana?", color: "#8B5CF6" },
    { icon: Zap, label: "How to improve my score?", color: "#F59E0B" },
    { icon: HelpCircle, label: "What loan can I get?", color: "#3B82F6" },
  ],
  kn: [
    { icon: TrendingUp, label: "ನನ್ನ ಸ್ಕೋರ್ ಏಕೆ ಕಡಿಮೆ ಇದೆ?", color: "#EF4444" },
    { icon: Landmark, label: "ನಾನು ಮುದ್ರಾ ಯೋಜನೆಗೆ ಅರ್ಹನೇ?", color: "#8B5CF6" },
    { icon: Zap, label: "ನನ್ನ ಸ್ಕೋರ್ ಹೆಚ್ಚಿಸುವುದು ಹೇಗೆ?", color: "#F59E0B" },
    { icon: HelpCircle, label: "ನನಗೆ ಯಾವ ಸಾಲ ಸಿಗುತ್ತದೆ?", color: "#3B82F6" },
  ],
  hi: [
    { icon: TrendingUp, label: "मेरा स्कोर कम क्यों है?", color: "#EF4444" },
    { icon: Landmark, label: "क्या मैं मुद्रा योजना के लिए पात्र हूँ?", color: "#8B5CF6" },
    { icon: Zap, label: "अपना स्कोर कैसे बढ़ाएं?", color: "#F59E0B" },
    { icon: HelpCircle, label: "मुझे कौन सा लोन मिल सकता है?", color: "#3B82F6" },
  ],
};

const GREETINGS = {
  en: (name) => `Hey ${name}! 👋\n\nI'm **CreditSaathi AI** — your personal credit advisor.\n\nI can help you understand your credit score, find eligible government schemes, and suggest ways to improve your financial health.\n\n**Try asking me something below!** 👇`,
  kn: (name) => `ನಮಸ್ಕಾರ ${name}! 👋\n\nನಾನು **CreditSaathi AI** — ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಕ್ರೆಡಿಟ್ ಸಲಹೆಗಾರ.\n\nನಿಮ್ಮ ಕ್ರೆಡಿಟ್ ಸ್ಕೋರ್ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು, ಅರ್ಹ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳನ್ನು ಹುಡುಕಲು, ಮತ್ತು ನಿಮ್ಮ ಆರ್ಥಿಕ ಆರೋಗ್ಯವನ್ನು ಸುಧಾರಿಸಲು ನಾನು ಸಹಾಯ ಮಾಡಬಲ್ಲೆ.\n\n**ಕೆಳಗೆ ಏನಾದರೂ ಕೇಳಿ!** 👇`,
  hi: (name) => `नमस्ते ${name}! 👋\n\nमैं **CreditSaathi AI** हूँ — आपका व्यक्तिगत क्रेडिट सलाहकार।\n\nमैं आपका क्रेडिट स्कोर समझने, पात्र सरकारी योजनाएं खोजने, और आपके वित्तीय स्वास्थ्य को बेहतर बनाने में मदद कर सकता हूँ।\n\n**नीचे कुछ पूछें!** 👇`,
};

const PLACEHOLDERS = {
  en: { input: "Ask about your credit score...", waiting: "Waiting for response...", thinking: "Thinking", advisor: "Your credit advisor", disclaimer: "AI advisor · Responses are generated, not financial advice" },
  kn: { input: "ನಿಮ್ಮ ಕ್ರೆಡಿಟ್ ಸ್ಕೋರ್ ಬಗ್ಗೆ ಕೇಳಿ...", waiting: "ಪ್ರತಿಕ್ರಿಯೆಗಾಗಿ ಕಾಯಲಾಗುತ್ತಿದೆ...", thinking: "ಯೋಚಿಸುತ್ತಿದ್ದೇನೆ", advisor: "ನಿಮ್ಮ ಕ್ರೆಡಿಟ್ ಸಲಹೆಗಾರ", disclaimer: "AI ಸಲಹೆಗಾರ · ಉತ್ತರಗಳು ಆರ್ಥಿಕ ಸಲಹೆ ಅಲ್ಲ" },
  hi: { input: "अपने क्रेडिट स्कोर के बारे में पूछें...", waiting: "प्रतिक्रिया की प्रतीक्षा...", thinking: "सोच रहा हूँ", advisor: "आपका क्रेडिट सलाहकार", disclaimer: "AI सलाहकार · उत्तर वित्तीय सलाह नहीं हैं" },
};

/* ── Markdown-lite renderer ─────────────────────── */
function renderMarkdown(text) {
  if (!text) return "";
  const lines = text.split("\n");
  const elements = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Bold
    line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    line = line.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Inline code
    line = line.replace(/`(.+?)`/g, '<code class="chat-inline-code">$1</code>');

    // Bullet points
    if (/^[\s]*[-•]\s/.test(line)) {
      elements.push(
        <div key={key++} className="chat-bullet" dangerouslySetInnerHTML={{ __html: "• " + line.replace(/^[\s]*[-•]\s/, "") }} />
      );
      continue;
    }

    // Numbered lists
    if (/^\d+\.\s/.test(line)) {
      elements.push(
        <div key={key++} className="chat-bullet" dangerouslySetInnerHTML={{ __html: line }} />
      );
      continue;
    }

    // Headers
    if (/^###\s/.test(line)) {
      elements.push(<div key={key++} className="chat-h3" dangerouslySetInnerHTML={{ __html: line.replace(/^###\s/, "") }} />);
      continue;
    }
    if (/^##\s/.test(line)) {
      elements.push(<div key={key++} className="chat-h2" dangerouslySetInnerHTML={{ __html: line.replace(/^##\s/, "") }} />);
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      elements.push(<div key={key++} className="h-2" />);
      continue;
    }

    // Normal text
    elements.push(
      <div key={key++} className="chat-text" dangerouslySetInnerHTML={{ __html: line }} />
    );
  }

  return elements;
}

/* ── Typing indicator ──────────────────────────── */
function TypingIndicator() {
  return (
    <div className="chat-msg-row bot">
      <div className="chat-avatar bot">
        <Sparkles size={14} />
      </div>
      <div className="chat-bubble bot typing-bubble">
        <div className="typing-dots">
          <span style={{ animationDelay: "0s" }} />
          <span style={{ animationDelay: "0.15s" }} />
          <span style={{ animationDelay: "0.3s" }} />
        </div>
      </div>
    </div>
  );
}

/* ── Language Picker ───────────────────────────── */
function LangPicker({ lang, setLang, onSwitch }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  return (
    <div className="lang-picker" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="chatbot-header-btn lang-toggle"
        title="Change language"
      >
        <Globe size={14} />
        <span className="lang-short">{current.short}</span>
      </button>
      {open && (
        <div className="lang-dropdown">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); onSwitch(l.code); setOpen(false); }}
              className={`lang-option ${l.code === lang ? "active" : ""}`}
            >
              <span className="lang-flag">{l.flag}</span>
              <span className="lang-name">{l.label}</span>
              {l.code === lang && <span className="lang-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main Widget ───────────────────────────────── */
export default function ChatbotWidget() {
  const { user } = useSelector((s) => s.auth);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [pulseBtn, setPulseBtn] = useState(true);
  const [lang, setLang] = useState("en");
  const messagesEndRef = useRef(null);
  const chatBodyRef = useRef(null);
  const inputRef = useRef(null);

  const t = PLACEHOLDERS[lang] || PLACEHOLDERS.en;

  // Initial greeting
  const showGreeting = useCallback((language) => {
    const greetFn = GREETINGS[language] || GREETINGS.en;
    const greeting = {
      role: "assistant",
      content: greetFn(user?.name?.split(" ")[0] || "there"),
      timestamp: new Date(),
    };
    setMessages([greeting]);
  }, [user]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      showGreeting(lang);
    }
  }, [isOpen]);

  // Language switch handler
  const handleLangSwitch = useCallback((newLang) => {
    setMessages([]);
    setTimeout(() => showGreeting(newLang), 100);
  }, [showGreeting]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  // Detect scroll position
  useEffect(() => {
    const el = chatBodyRef.current;
    if (!el) return;
    const handleScroll = () => {
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      setShowScrollBtn(!isNearBottom);
    };
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
      setPulseBtn(false);
    }
  }, [isOpen]);

  // Send message
  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;

    const userMsg = { role: "user", content: msg, timestamp: new Date() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const history = newMessages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.content }));

      const { data } = await api.post("/chat", {
        message: msg,
        conversation_history: history.slice(0, -1),
        language: lang,
      });

      const botMsg = {
        role: "assistant",
        content: data.data.reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errorMsg = {
        role: "assistant",
        content: "⚠️ Sorry, I couldn't connect to the AI service right now. Please try again in a moment.",
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetChat = () => {
    setMessages([]);
    setTimeout(() => showGreeting(lang), 100);
  };

  const hasUserSent = messages.some((m) => m.role === "user");
  const prompts = QUICK_PROMPTS[lang] || QUICK_PROMPTS.en;

  return (
    <>
      {/* ── Floating Action Button ── */}
      <button
        id="chatbot-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className={`chatbot-fab ${isOpen ? "open" : ""} ${pulseBtn ? "pulse" : ""}`}
        title="Chat with CreditSaathi AI"
      >
        <div className="chatbot-fab-inner">
          {isOpen ? <X size={22} strokeWidth={2.5} /> : <MessageSquare size={22} strokeWidth={2} />}
        </div>
        {!isOpen && pulseBtn && <span className="chatbot-fab-badge">AI</span>}
      </button>

      {/* ── Chat Window ── */}
      <div className={`chatbot-window ${isOpen ? "open" : ""}`}>
        {/* Header */}
        <div className="chatbot-header">
          <div className="chatbot-header-left">
            <div className="chatbot-header-avatar">
              <Sparkles size={16} />
              <span className="chatbot-status-dot" />
            </div>
            <div>
              <h3 className="chatbot-header-title">CreditSaathi AI</h3>
              <p className="chatbot-header-sub">
                {loading ? (
                  <span className="typing-text">{t.thinking}<span className="typing-ellipsis" /></span>
                ) : (
                  t.advisor
                )}
              </p>
            </div>
          </div>
          <div className="chatbot-header-actions">
            <LangPicker lang={lang} setLang={setLang} onSwitch={handleLangSwitch} />
            <button onClick={resetChat} className="chatbot-header-btn" title="New conversation">
              <RotateCcw size={15} />
            </button>
            <button onClick={() => setIsOpen(false)} className="chatbot-header-btn" title="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="chatbot-body" ref={chatBodyRef}>
          {messages.map((msg, i) => (
            <div key={i} className={`chat-msg-row ${msg.role === "user" ? "user" : "bot"} msg-animate`} style={{ animationDelay: `${i * 0.05}s` }}>
              {msg.role === "assistant" && (
                <div className="chat-avatar bot">
                  <Sparkles size={14} />
                </div>
              )}
              <div className={`chat-bubble ${msg.role === "user" ? "user" : "bot"} ${msg.isError ? "error" : ""}`}>
                {msg.role === "assistant" ? (
                  <div className="chat-md">{renderMarkdown(msg.content)}</div>
                ) : (
                  <span>{msg.content}</span>
                )}
                <span className="chat-time">
                  {msg.timestamp?.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              {msg.role === "user" && (
                <div className="chat-avatar user">
                  <User size={14} />
                </div>
              )}
            </div>
          ))}

          {loading && <TypingIndicator />}

          {/* Quick prompts */}
          {!hasUserSent && !loading && (
            <div className="chat-quick-prompts msg-animate">
              {prompts.map((p, i) => (
                <button key={i} onClick={() => sendMessage(p.label)} className="chat-quick-btn" style={{ animationDelay: `${0.3 + i * 0.08}s`, "--accent": p.color }}>
                  <p.icon size={14} style={{ color: p.color }} />
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom */}
        {showScrollBtn && (
          <button onClick={scrollToBottom} className="chatbot-scroll-btn">
            <ChevronDown size={16} />
          </button>
        )}

        {/* Input */}
        <div className="chatbot-input-area">
          <div className="chatbot-input-wrap">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={loading ? t.waiting : t.input}
              disabled={loading}
              className="chatbot-input"
              maxLength={2000}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className={`chatbot-send-btn ${input.trim() && !loading ? "active" : ""}`}
            >
              <Send size={16} />
            </button>
          </div>
          <p className="chatbot-disclaimer">{t.disclaimer}</p>
        </div>
      </div>
    </>
  );
}
