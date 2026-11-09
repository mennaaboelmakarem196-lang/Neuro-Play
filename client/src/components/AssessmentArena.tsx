/**
 * AssessmentArena.tsx — Phase C: The Quiz Engine
 *
 * ADHD-optimized multiple-choice quiz with:
 *  - Zod-validated questions from trpc.ai.generateQuiz
 *  - One question at a time (micro-chunking)
 *  - Instant confetti + XP on correct answers
 *  - Shake animation on wrong answers
 *  - Progress bar filling per correct answer
 *  - Encouraging explanations after each answer
 *  - Final score screen with Dopamine Report trigger
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { fireConfetti, fireMegaConfetti } from "@/lib/confetti";
import type { ContentStudioConfig } from "./ContentStudio";
import type { CurriculumSummary, QuizQuestion } from "../../../server/ai";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AssessmentArenaProps {
  config: ContentStudioConfig;
  curriculumSummary?: CurriculumSummary;
  sessionId?: number;
  studentName?: string;
  onComplete?: (result: QuizResult) => void;
  onBrainBreak?: () => void;
}

export interface QuizResult {
  score: number;
  totalQuestions: number;
  correctCount: number;
  xpEarned: number;
  timeSec: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AssessmentArena({
  config,
  curriculumSummary,
  studentName = "Space Explorer",
  onComplete,
  onBrainBreak,
}: AssessmentArenaProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [wrongShake, setWrongShake] = useState(false);
  const [startTime] = useState(Date.now());
  const [phase, setPhase] = useState<"loading" | "quiz" | "complete">("loading");

  const generateQuiz = trpc.ai.generateQuiz.useMutation();

  // Load quiz on mount
  useEffect(() => {
    generateQuiz.mutate(
      {
        topic: config.focusTopic,
        curriculumSummary,
        difficulty: config.difficulty,
        questionCount: 5,
      },
      {
        onSuccess: data => {
          setQuestions(data.questions);
          setPhase("quiz");
        },
        onError: () => {
          const isAr = curriculumSummary?.language === "ar" || /[\u0600-\u06FF]/.test(config.focusTopic);
          const t = curriculumSummary?.title || config.focusTopic;
          const fallbackQs = isAr
            ? [
                {
                  id: "q_fb_1",
                  question: `ما هو المحور الأساسي الذي يركز عليه درس "${t}"؟ 🎯`,
                  options: [
                    `فهم الأفكار والمفاهيم الأساسية لـ ${t}`,
                    `دراسة حركة النجوم في مجرة بعيدة`,
                    `تاريخ الحضارات القديمة`,
                    `طرق زراعة النباتات الصحراوية`,
                  ],
                  correctIndex: 0,
                  explanation: `إجابة رائعة! الدرس يركز بشكل أساسي على: ${t} 🌟`,
                  difficulty: "easy" as const,
                  emoji: "🎯",
                  xpReward: 50,
                },
                {
                  id: "q_fb_2",
                  question: `كيف يساعدنا تطبيق ما تعلمناه في "${t}"؟ 💡`,
                  options: [
                    `يطور تفكيرنا ومهاراتنا اليومية`,
                    `ليس له فائدة تُذكر`,
                    `يُستخدم فقط في الألعاب الإلكترونية`,
                    `يجعلنا ننسى ما تعلمناه سابقاً`,
                  ],
                  correctIndex: 0,
                  explanation: `ممتاز جداً! العلم والمعرفة في هذا الدرس يطوران تفكيرنا! 🌟`,
                  difficulty: "easy" as const,
                  emoji: "💡",
                  xpReward: 50,
                },
              ]
            : [
                {
                  id: "q_fb_1",
                  question: `What is the main topic of "${t}"? 🎯`,
                  options: [
                    `Core concepts and insights of ${t}`,
                    `The movement of distant stars`,
                    `History of ancient civilizations`,
                    `Desert plant farming methods`,
                  ],
                  correctIndex: 0,
                  explanation: `Great job! This module centers on: ${t}! 🌟`,
                  difficulty: "easy" as const,
                  emoji: "🎯",
                  xpReward: 50,
                },
              ];
          setQuestions(fallbackQs);
          setPhase("quiz");
        },
      }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentQuestion = questions[currentIdx];
  const progress = questions.length > 0 ? (currentIdx / questions.length) * 100 : 0;

  const handleAnswer = (optionIndex: number) => {
    if (isAnswered) return;
    setSelectedAnswer(optionIndex);
    setIsAnswered(true);

    const isCorrect = optionIndex === currentQuestion.correctIndex;

    if (isCorrect) {
      const xp = currentQuestion.xpReward;
      setCorrectCount(prev => prev + 1);
      setTotalXP(prev => prev + xp);
      fireConfetti();
    } else {
      setWrongShake(true);
      setTimeout(() => setWrongShake(false), 600);
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 >= questions.length) {
      // Quiz complete
      fireMegaConfetti();
      setPhase("complete");
      const timeSec = Math.floor((Date.now() - startTime) / 1000);
      onComplete?.({
        score: Math.round((correctCount / questions.length) * 100),
        totalQuestions: questions.length,
        correctCount,
        xpEarned: totalXP,
        timeSec,
      });
    } else {
      setCurrentIdx(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    }
  };

  // ── Loading State ──────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-6"
        style={{ background: "#0F172A" }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="text-6xl"
        >
          🛸
        </motion.div>
        <div className="text-center">
          <p className="font-black text-lg mb-2" style={{ color: "#00E5FF", fontFamily: "'Comfortaa', sans-serif" }}>
            Building your quiz...
          </p>
          <p className="text-sm" style={{ color: "#475569", fontFamily: "'Comfortaa', sans-serif" }}>
            Nova is crafting {config.difficulty} questions! ✨
          </p>
        </div>
        {/* Progress shimmer */}
        <div className="w-48 h-2 rounded-full overflow-hidden" style={{ background: "rgba(30,41,59,0.8)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #00E5FF, #7C4DFF)" }}
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>
    );
  }

  // ── Complete State ─────────────────────────────────────────────────────────
  if (phase === "complete") {
    const scorePct = Math.round((correctCount / questions.length) * 100);
    const scoreEmoji = scorePct >= 90 ? "🏆" : scorePct >= 70 ? "⭐" : "🌱";

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center h-full gap-6 p-6"
        style={{ background: "#0F172A", fontFamily: "'Comfortaa', sans-serif" }}
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-7xl"
        >
          {scoreEmoji}
        </motion.div>

        <div className="text-center">
          <p className="font-black text-2xl mb-1" style={{ color: "#AEEA00" }}>
            {scorePct >= 90 ? "PERFECT!" : scorePct >= 70 ? "GREAT JOB!" : "KEEP GOING!"}
          </p>
          <p className="text-sm" style={{ color: "#64748B" }}>
            {studentName} — Assessment Arena Complete
          </p>
        </div>

        {/* Score card */}
        <div
          className="w-full max-w-sm rounded-2xl p-5 space-y-3"
          style={{
            background: "rgba(30,41,59,0.8)",
            border: "1px solid rgba(0,229,255,0.2)",
          }}
        >
          {[
            { label: "Score", value: `${scorePct}%`, color: "#00E5FF" },
            { label: "Correct", value: `${correctCount}/${questions.length}`, color: "#AEEA00" },
            { label: "XP Earned", value: `+${totalXP} XP`, color: "#7C4DFF" },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-sm" style={{ color: "#64748B" }}>{label}</span>
              <span className="font-black text-sm" style={{ color }}>{value}</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-center" style={{ color: "#334155" }}>
          🎉 Your Dopamine Report has been sent to your teacher!
        </p>
      </motion.div>
    );
  }

  // ── Quiz State ─────────────────────────────────────────────────────────────
  if (!currentQuestion) return null;

  const isCorrect = selectedAnswer === currentQuestion.correctIndex;

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "#0F172A", fontFamily: "'Comfortaa', sans-serif" }}
    >
      {/* ── Header ── */}
      <div
        className="px-4 py-3 border-b"
        style={{ borderColor: "rgba(124,77,255,0.15)" }}
      >
        <div className="flex items-center justify-between mb-2">
          <p className="font-black text-sm" style={{ color: "#7C4DFF" }}>
            🏟️ Assessment Arena
          </p>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: "#475569" }}>
              {currentIdx + 1}/{questions.length}
            </span>
            <motion.div
              key={totalXP}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="px-2 py-1 rounded-full text-xs font-black"
              style={{
                background: "rgba(174,234,0,0.12)",
                border: "1px solid rgba(174,234,0,0.3)",
                color: "#AEEA00",
              }}
            >
              ⚡ {totalXP} XP
            </motion.div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(30,41,59,0.8)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #7C4DFF, #00E5FF)" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* ── Question ── */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="space-y-4"
          >
            {/* Question card */}
            <motion.div
              animate={wrongShake ? { x: [-8, 8, -8, 8, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="rounded-2xl p-5"
              style={{
                background: "rgba(30,41,59,0.8)",
                border: "1px solid rgba(124,77,255,0.2)",
              }}
            >
              <div className="text-3xl mb-3 text-center">{currentQuestion.emoji}</div>
              <p
                className="font-black text-base text-center leading-relaxed"
                style={{ color: "#E2E8F0" }}
              >
                {currentQuestion.question}
              </p>
            </motion.div>

            {/* Answer options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, i) => {
                const isSelected = selectedAnswer === i;
                const isThisCorrect = i === currentQuestion.correctIndex;
                let bgColor = "rgba(30,41,59,0.8)";
                let borderColor = "rgba(71,85,105,0.3)";
                let textColor = "#94A3B8";

                if (isAnswered) {
                  if (isThisCorrect) {
                    bgColor = "rgba(174,234,0,0.12)";
                    borderColor = "#AEEA00";
                    textColor = "#AEEA00";
                  } else if (isSelected && !isThisCorrect) {
                    bgColor = "rgba(239,68,68,0.12)";
                    borderColor = "#EF4444";
                    textColor = "#EF4444";
                  }
                } else if (isSelected) {
                  bgColor = "rgba(124,77,255,0.15)";
                  borderColor = "#7C4DFF";
                  textColor = "#7C4DFF";
                }

                return (
                  <motion.button
                    key={i}
                    whileHover={!isAnswered ? { scale: 1.02 } : {}}
                    whileTap={!isAnswered ? { scale: 0.98 } : {}}
                    onClick={() => handleAnswer(i)}
                    disabled={isAnswered}
                    className="w-full rounded-2xl px-4 py-3 text-left font-bold text-sm transition-all outline-none"
                    style={{
                      background: bgColor,
                      border: `2px solid ${borderColor}`,
                      color: textColor,
                      cursor: isAnswered ? "default" : "pointer",
                      fontFamily: "'Comfortaa', sans-serif",
                    }}
                  >
                    <span className="mr-2 opacity-60">
                      {["A", "B", "C", "D"][i]}.
                    </span>
                    {option}
                    {isAnswered && isThisCorrect && " ✓"}
                    {isAnswered && isSelected && !isThisCorrect && " ✗"}
                  </motion.button>
                );
              })}
            </div>

            {/* Explanation */}
            <AnimatePresence>
              {isAnswered && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl p-4"
                  style={{
                    background: isCorrect
                      ? "rgba(174,234,0,0.08)"
                      : "rgba(0,229,255,0.08)",
                    border: `1px solid ${isCorrect ? "rgba(174,234,0,0.3)" : "rgba(0,229,255,0.3)"}`,
                  }}
                >
                  <p className="text-sm font-bold mb-1" style={{ color: isCorrect ? "#AEEA00" : "#00E5FF" }}>
                    {isCorrect ? "🌟 Brilliant!" : "💡 Here's the answer:"}
                  </p>
                  <p className="text-xs" style={{ color: "#94A3B8" }}>
                    {currentQuestion.explanation}
                  </p>
                  {isCorrect && (
                    <motion.p
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-xs font-black mt-2"
                      style={{ color: "#AEEA00" }}
                    >
                      +{currentQuestion.xpReward} XP earned! ⚡
                    </motion.p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Footer ── */}
      <div
        className="px-4 py-3 border-t space-y-2"
        style={{ borderColor: "rgba(124,77,255,0.1)" }}
      >
        {/* Brain Break */}
        <button
          onClick={onBrainBreak}
          className="w-full py-2 rounded-xl text-xs font-bold transition-all"
          style={{
            background: "rgba(30,41,59,0.6)",
            border: "1px solid rgba(71,85,105,0.3)",
            color: "#475569",
            cursor: "pointer",
          }}
        >
          🧠 Brain Break / I'm Bored
        </button>

        {/* Next button */}
        {isAnswered && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNext}
            className="w-full py-3 rounded-xl font-black text-sm transition-all"
            style={{
              background: "linear-gradient(135deg, #00E5FF 0%, #7C4DFF 100%)",
              color: "#0F172A",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 0 20px rgba(0,229,255,0.3)",
            }}
          >
            {currentIdx + 1 >= questions.length ? "See Results 🏆" : "Next Question →"}
          </motion.button>
        )}
      </div>
    </div>
  );
}

// ─── Fallback questions (Solar System) ───────────────────────────────────────

const FALLBACK_QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    question: "Which planet is closest to the Sun?",
    options: ["Venus", "Mercury", "Earth", "Mars"],
    correctIndex: 1,
    explanation: "Mercury is the closest planet to the Sun! It's very hot during the day and very cold at night.",
    difficulty: "easy",
    emoji: "☀️",
    xpReward: 50,
  },
  {
    id: "q2",
    question: "What is the biggest planet in our Solar System?",
    options: ["Saturn", "Neptune", "Jupiter", "Uranus"],
    correctIndex: 2,
    explanation: "Jupiter is the biggest planet! It's so big that all other planets could fit inside it!",
    difficulty: "easy",
    emoji: "🪐",
    xpReward: 50,
  },
  {
    id: "q3",
    question: "How many planets are in our Solar System?",
    options: ["7", "8", "9", "10"],
    correctIndex: 1,
    explanation: "There are 8 planets! Pluto was reclassified as a dwarf planet in 2006.",
    difficulty: "easy",
    emoji: "🌍",
    xpReward: 50,
  },
  {
    id: "q4",
    question: "Which planet has beautiful rings around it?",
    options: ["Jupiter", "Mars", "Saturn", "Venus"],
    correctIndex: 2,
    explanation: "Saturn has the most famous rings! They're made of ice and rock.",
    difficulty: "easy",
    emoji: "💍",
    xpReward: 50,
  },
  {
    id: "q5",
    question: "What is at the center of our Solar System?",
    options: ["Earth", "The Moon", "Jupiter", "The Sun"],
    correctIndex: 3,
    explanation: "The Sun is at the center! All planets orbit around the Sun.",
    difficulty: "easy",
    emoji: "🌟",
    xpReward: 50,
  },
];
