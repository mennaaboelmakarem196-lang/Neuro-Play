/**
 * InteractiveTutor.tsx — Phase B: The AI Streaming Tutor
 *
 * ADHD-optimized streaming chat with Nova the Space Tutor.
 * Features:
 *  - SSE streaming via /api/tutor/stream
 *  - Confetti on positive responses
 *  - Brain Break button (always visible)
 *  - XP reward display per interaction
 *  - Micro-chunked responses (max 3 sentences enforced by system prompt)
 *  - Suggested prompts for low-friction engagement
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fireConfetti } from "@/lib/confetti";
import type { ContentStudioConfig } from "./ContentStudio";
import type { CurriculumSummary } from "../../../server/ai";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "assistant";
  content: string;
  xpEarned?: number;
}

interface InteractiveTutorProps {
  config: ContentStudioConfig;
  curriculumSummary?: CurriculumSummary;
  onXPEarned?: (xp: number) => void;
  onBrainBreak?: () => void;
  onProceedToQuiz?: () => void;
  onBack?: () => void;
}

// ─── Suggested prompts for ADHD-friendly engagement ──────────────────────────

const SUGGESTED_PROMPTS = [
  "Tell me something AMAZING about space! 🚀",
  "What is the biggest planet? 🪐",
  "Why does Earth have seasons? 🌍",
  "How hot is the Sun? ☀️",
  "What would happen if I jumped on the Moon? 🌙",
  "Are there other solar systems? ✨",
];

// ─── Component ────────────────────────────────────────────────────────────────

export function InteractiveTutor({

  config,
  curriculumSummary,
  onXPEarned,
  onBrainBreak,
  onProceedToQuiz,
  onBack,
}: InteractiveTutorProps) {
  const { lang: appLang } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [totalXP, setTotalXP] = useState(0);
  const [interactionCount, setInteractionCount] = useState(0);
  const [showBrainBreakPulse, setShowBrainBreakPulse] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Brain break pulse after 10 minutes
  useEffect(() => {
    const timer = setTimeout(() => setShowBrainBreakPulse(true), 10 * 60 * 1000);
    return () => clearTimeout(timer);
  }, []);

  // Send a message and stream the response
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMessage: Message = { role: "user", content: text.trim() };
      setMessages(prev => [...prev, userMessage]);
      setInput("");
      setIsStreaming(true);

      // Placeholder assistant message for streaming
      const assistantMsg: Message = { role: "assistant", content: "" };
      setMessages(prev => [...prev, assistantMsg]);

      abortRef.current = new AbortController();

      try {
        const response = await fetch("/api/tutor/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMessage].map(m => ({
              role: m.role,
              content: m.content,
            })),
            topic: config.focusTopic,
            learningStyle: config.learningStyle,
            difficulty: config.difficulty,
            curriculumSummary,
          }),
          signal: abortRef.current.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error("Stream failed");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]") continue;
            if (trimmed.startsWith("data: ")) {
              try {
                const json = JSON.parse(trimmed.slice(6));
                if (json.delta) {
                  fullContent += json.delta;
                  setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      ...updated[updated.length - 1],
                      content: fullContent,
                    };
                    return updated;
                  });
                }
                if (json.error) {
                  throw new Error(json.error);
                }
              } catch {
                // Malformed chunk — skip
              }
            }
          }
        }

        // Award XP for interaction
        const xpEarned = 25;
        const newTotal = totalXP + xpEarned;
        setTotalXP(newTotal);
        setInteractionCount(prev => prev + 1);
        onXPEarned?.(xpEarned);

        // Confetti every 3 interactions
        if ((interactionCount + 1) % 3 === 0) {
          fireConfetti();
        }

        // Update final message with XP
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            xpEarned,
          };
          return updated;
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: "Oops! Nova had a glitch. Try again! 🛸",
          };
          return updated;
        });
      } finally {
        setIsStreaming(false);
        inputRef.current?.focus();
      }
    },
    [messages, config, curriculumSummary, isStreaming, totalXP, interactionCount, onXPEarned]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "#0F172A", fontFamily: "'Comfortaa', sans-serif" }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "rgba(0,229,255,0.15)", background: "rgba(15,23,42,0.95)" }}
      >
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
              style={{
                background: "rgba(30,41,59,0.8)",
                border: "1px solid rgba(0,229,255,0.25)",
                color: "#00E5FF",
                cursor: "pointer",
              }}
            >
              ← رجوع
            </button>
          )}
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="text-2xl"
          >
            🤖
          </motion.div>
          <div>
            <p className="font-black text-sm" style={{ color: "#00E5FF" }}>
              Nova — AI Tutor
            </p>
            <p className="text-xs" style={{ color: "#475569" }}>
              {config.focusTopic} · {config.learningStyle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LanguageToggle compact />
          {/* XP Counter */}
          <motion.div
            key={totalXP}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ background: "rgba(174,234,0,0.12)", border: "1px solid rgba(174,234,0,0.3)" }}
        >
          <span className="text-sm">⚡</span>
          <span className="font-black text-sm" style={{ color: "#AEEA00" }}>
            +{totalXP} XP
          </span>
        </motion.div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome message */}
        {messages.length === 0 && (() => {
          const isAr =
            curriculumSummary?.language === "ar" ||
            /[\u0600-\u06FF]/.test(config.focusTopic);

          const dynamicPrompts = isAr
            ? [
                `اشرح لي أهم فكرة في ${config.focusTopic} 💡`,
                `لخص لي الدرس في 3 نقاط بسيطة 📝`,
                `ما هي أهم الكلمات والمفاهيم؟ 🔍`,
                `اسألني سؤال لتختبر فهمي 🎯`,
              ]
            : [
                `Explain the main idea of ${config.focusTopic} 💡`,
                `Summarize this into 3 simple bullet points 📝`,
                `What are the key vocabulary words? 🔍`,
                `Quiz me with a fun question! 🎯`,
              ];

          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-6 px-2"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-5xl mb-3"
              >
                🤖
              </motion.div>
              <p className="font-black text-xl mb-1" style={{ color: "#00E5FF" }}>
                {isAr ? "أهلاً يا بطل! أنا نوفا، معلمك الذكي 🌟" : `Hi! I'm Nova, your AI Tutor! 🌟`}
              </p>
              <p className="text-sm mb-4" style={{ color: "#94A3B8" }}>
                {isAr
                  ? `قرأت ملف: "${curriculumSummary?.title || config.focusTopic}" وجاهز لأشرحه لك!`
                  : `I've analyzed "${curriculumSummary?.title || config.focusTopic}" and I'm ready to explain it!`}
              </p>

              {curriculumSummary?.keyTopics && curriculumSummary.keyTopics.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center mb-5 max-w-md mx-auto">
                  {curriculumSummary.keyTopics.slice(0, 4).map((t, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{
                        background: "rgba(0,229,255,0.1)",
                        border: "1px solid rgba(0,229,255,0.3)",
                        color: "#00E5FF",
                      }}
                    >
                      📌 {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Dynamic prompts */}
              <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
                {dynamicPrompts.map((prompt, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => sendMessage(prompt)}
                    className="px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                    style={{
                      background: "rgba(124,77,255,0.16)",
                      border: "1px solid rgba(124,77,255,0.4)",
                      color: "#A78BFA",
                      cursor: "pointer",
                    }}
                  >
                    {prompt}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          );
        })()}

        {/* Message list */}
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 text-sm"
                  style={{ background: "rgba(0,229,255,0.15)" }}
                >
                  🤖
                </div>
              )}
              <div
                className="max-w-[80%] rounded-2xl px-4 py-3"
                style={{
                  background:
                    msg.role === "user"
                      ? "linear-gradient(135deg, #7C4DFF, #00E5FF)"
                      : "rgba(30,41,59,0.9)",
                  border:
                    msg.role === "assistant"
                      ? "1px solid rgba(0,229,255,0.15)"
                      : "none",
                  color: msg.role === "user" ? "#0F172A" : "#E2E8F0",
                  fontFamily: "'Comfortaa', sans-serif",
                  fontSize: "0.875rem",
                  lineHeight: "1.6",
                }}
              >
                {msg.content || (
                  <motion.span
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    style={{ color: "#00E5FF" }}
                  >
                    Nova is thinking... 🌟
                  </motion.span>
                )}
                {msg.xpEarned && msg.role === "assistant" && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="mt-2 flex items-center gap-1"
                  >
                    <span
                      className="text-xs font-black px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(174,234,0,0.15)",
                        color: "#AEEA00",
                        border: "1px solid rgba(174,234,0,0.3)",
                      }}
                    >
                      +{msg.xpEarned} XP ⚡
                    </span>
                  </motion.div>
                )}
              </div>
              {msg.role === "user" && (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 text-sm"
                  style={{ background: "rgba(124,77,255,0.2)" }}
                >
                  👤
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Area ── */}
      <div
        className="px-4 py-3 border-t space-y-3"
        style={{ borderColor: "rgba(0,229,255,0.1)", background: "rgba(15,23,42,0.95)" }}
      >
        {/* Brain Break Button */}
        <motion.button
          animate={showBrainBreakPulse ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
          onClick={onBrainBreak}
          className="w-full py-2 rounded-xl text-sm font-black transition-all"
          style={{
            background: showBrainBreakPulse
              ? "linear-gradient(135deg, rgba(174,234,0,0.2), rgba(0,229,255,0.2))"
              : "rgba(30,41,59,0.6)",
            border: `1px solid ${showBrainBreakPulse ? "#AEEA00" : "rgba(71,85,105,0.3)"}`,
            color: showBrainBreakPulse ? "#AEEA00" : "#475569",
            cursor: "pointer",
          }}
        >
          🧠 Brain Break {showBrainBreakPulse ? "— Time for a break!" : "/ I'm Bored"}
        </motion.button>

        {/* Text input */}
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Nova anything... 🚀"
            rows={1}
            disabled={isStreaming}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm resize-none outline-none transition-all"
            style={{
              background: "rgba(30,41,59,0.8)",
              border: "1px solid rgba(0,229,255,0.2)",
              color: "#E2E8F0",
              fontFamily: "'Comfortaa', sans-serif",
              maxHeight: "96px",
            }}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isStreaming}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
            style={{
              background:
                input.trim() && !isStreaming
                  ? "linear-gradient(135deg, #00E5FF, #7C4DFF)"
                  : "rgba(30,41,59,0.6)",
              border: "none",
              cursor: input.trim() && !isStreaming ? "pointer" : "not-allowed",
            }}
          >
            {isStreaming ? (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                🛸
              </motion.span>
            ) : (
              <span style={{ color: input.trim() ? "#0F172A" : "#475569" }}>➤</span>
            )}
          </motion.button>
        </div>

        {/* Proceed to Quiz CTA */}
        {interactionCount >= 2 && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onProceedToQuiz}
            className="w-full py-3 rounded-xl font-black text-sm transition-all"
            style={{
              background: "linear-gradient(135deg, #AEEA00 0%, #00E5FF 100%)",
              color: "#0F172A",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 0 20px rgba(174,234,0,0.3)",
            }}
          >
            Ready for the Quiz? 🏆 Take the Assessment Arena →
          </motion.button>
        )}
      </div>
    </div>
  );
}
