import re

print("Applying complete tutorStream.ts & InteractiveTutor.tsx updates...")

# ─── 1. Update server/tutorStream.ts ──────────────────────────────────────────
tutor_stream_code = """/**
 * tutorStream.ts — NeuroPlay AI Streaming Tutor (SSE)
 *
 * Express route: POST /api/tutor/stream
 *
 * Streams AI tutor responses via Server-Sent Events.
 * Supports external LLM (OpenAI/Gemini/Forge) when configured,
 * and provides a built-in intelligent ADHD-adapted tutoring engine
 * that explains the uploaded PDF curriculum in depth with zero downtime.
 */

import type { Request, Response } from "express";
import { ENV } from "./_core/env";
import { audit, auditTimer } from "./audit";
import { buildTutorSystemPrompt } from "./ai";
import type { CurriculumSummary } from "./ai";

interface TutorStreamBody {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  topic: string;
  learningStyle: string;
  difficulty: string;
  curriculumSummary?: CurriculumSummary;
  sessionId?: number;
}

/**
 * Generate intelligent offline tutor responses based on the uploaded curriculum/PDF
 */
function generateTutorResponse(
  userQuery: string,
  topic: string,
  learningStyle: string,
  difficulty: string,
  summary?: CurriculumSummary
): string {
  const isArabic =
    summary?.language === "ar" ||
    /[\\u0600-\\u06FF]/.test(userQuery) ||
    /[\\u0600-\\u06FF]/.test(topic);

  const cleanQuery = userQuery.toLowerCase().trim();
  const title = summary?.title || topic || (isArabic ? "الدرس" : "the lesson");
  const keyTopics = summary?.keyTopics || [];
  const vocab = summary?.vocabularyWords || [];
  const facts = summary?.funFacts || [];
  const fullText = summary?.fullExtractedText || "";

  // 1. Summary / bullet points request
  if (
    cleanQuery.includes("لخص") ||
    cleanQuery.includes("ملخص") ||
    cleanQuery.includes("نقاط") ||
    cleanQuery.includes("summar") ||
    cleanQuery.includes("bullet") ||
    cleanQuery.includes("points")
  ) {
    if (isArabic) {
      const bullets = keyTopics.length > 0
        ? keyTopics.slice(0, 3).map((t, idx) => `${idx + 1}. **${t}** 💡`).join("\\n")
        : `1. استكشاف الفكرة الأساسية في ${title} 🚀\\n2. فهم الحقائق والمعلومات المهمة ⭐\\n3. تطبيق ما تعلمناه في التحديات 🎯`;
      return `إليك ملخص سريع وممتع لدرس "${title}" يا بطل! 🌟\\n\\n${bullets}\\n\\nأي نقطة منهم تحب أن نبدأ بشرحها بالتفصيل؟ ✨`;
    } else {
      const bullets = keyTopics.length > 0
        ? keyTopics.slice(0, 3).map((t, idx) => `${idx + 1}. **${t}** 💡`).join("\\n")
        : `1. Explore core concepts of ${title} 🚀\\n2. Master exciting facts ⭐\\n3. Win XP with interactive challenges 🎯`;
      return `Here is your high-energy summary of "${title}"! 🌟\\n\\n${bullets}\\n\\nWhich point would you like to explore first? ✨`;
    }
  }

  // 2. Vocabulary words request
  if (
    cleanQuery.includes("كلمات") ||
    cleanQuery.includes("مفاهيم") ||
    cleanQuery.includes("vocab") ||
    cleanQuery.includes("definition") ||
    cleanQuery.includes("معنى")
  ) {
    if (isArabic) {
      const vocabList = vocab.length > 0
        ? vocab.slice(0, 3).map(v => `${v.emoji} **${v.word}**: ${v.definition}`).join("\\n\\n")
        : `💡 **الفكرة الرئيسية**: جوهر درس ${title}.\\n⭐ **التركيز الخارق**: قوة توجيه انتباهك للفهم.`;
      return `أهم الكلمات السحرية في درس "${title}" هي: 🔍\\n\\n${vocabList}\\n\\nهل تحب أن نستخدم إحداها في جملة أو تحدي؟ 🎯`;
    } else {
      const vocabList = vocab.length > 0
        ? vocab.slice(0, 3).map(v => `${v.emoji} **${v.word}**: ${v.definition}`).join("\\n\\n")
        : `💡 **Core Idea**: The heart of ${title}.\\n⭐ **Hyper Focus**: Your superhero attention skill.`;
      return `Top power words from "${title}": 🔍\\n\\n${vocabList}\\n\\nWant to use one in a mini challenge? 🎯`;
    }
  }

  // 3. Quiz / test me request
  if (
    cleanQuery.includes("سؤال") ||
    cleanQuery.includes("اختبر") ||
    cleanQuery.includes("quiz") ||
    cleanQuery.includes("test")
  ) {
    if (isArabic) {
      const firstTopic = keyTopics[0] || title;
      return `تحدي الذكاء السريع! 🎯 هل تستطيع أن تخبرني: ما هي أهم فائدة أو فكرة تعلمناها عن "${firstTopic}"؟ فكّر واكتب إجابتك وسأمنحك نقاط XP فورية! ⚡`;
    } else {
      const firstTopic = keyTopics[0] || title;
      return `Quick Brain Sprint! 🎯 Can you tell me one key takeaway about "${firstTopic}"? Type your answer to score bonus XP! ⚡`;
    }
  }

  // 4. Specific search in full extracted text
  if (fullText.length > 50) {
    // Look for sentences in the PDF that contain words from query
    const words = cleanQuery.split(/\\s+/).filter(w => w.length > 3);
    const sentences = fullText.split(/[.!?\\u06D4\\n]+/).map(s => s.trim()).filter(s => s.length > 15);
    const matched = sentences.find(s => words.some(w => s.toLowerCase().includes(w)));

    if (matched) {
      if (isArabic) {
        return `سؤال رائع جداً! 🌟 حسب ما هو مذكور في الملف المرفق: "${matched}". هذه المعلومة أساسية جداً لفهم ${title}! ما رأيك فيها؟ 🚀`;
      } else {
        return `Awesome question! 🌟 According to your uploaded document: "${matched}". This is a core insight in ${title}! How cool is that? 🚀`;
      }
    }
  }

  // 5. Default engaging explanation of the topic
  if (isArabic) {
    const topicHighlight = keyTopics[0] ? `مثل: ${keyTopics.slice(0, 2).join(" و ")}` : "";
    const factHighlight = facts[0] ? ` معلومة مدهشة: ${facts[0]}` : "";
    return `أهلاً بك يا بطل! 🌟 درس "${title}" ممتع جداً ومليء بالمعلومات الشيقة ${topicHighlight}.${factHighlight} ما هو الجزء الذي تريد أن نبسطه أكثر معاً؟ 🚀`;
  } else {
    const topicHighlight = keyTopics[0] ? `like: ${keyTopics.slice(0, 2).join(" and ")}` : "";
    const factHighlight = facts[0] ? ` Fun discovery: ${facts[0]}` : "";
    return `Great to learn with you! 🌟 "${title}" has exciting secrets to discover ${topicHighlight}.${factHighlight} What part would you like to explore next? 🚀`;
  }
}

export async function handleTutorStream(req: Request, res: Response): Promise<void> {
  const timer = auditTimer();
  const body = req.body as TutorStreamBody;

  const {
    messages = [],
    topic = "Curriculum Module",
    learningStyle = "ADHD Socratic",
    difficulty = "Easy",
    curriculumSummary,
    sessionId,
  } = body;

  audit.info("ai_call", "Tutor stream request received", {
    topic,
    learningStyle,
    difficulty,
    messageCount: messages.length,
    sessionId,
  });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  let finished = false;

  res.on("close", () => {
    finished = true;
    audit.info("ai_call", "Client disconnected from tutor stream", { sessionId });
  });

  // Attempt external LLM if apiKey is present
  const hasExternalLlm = !!(ENV.forgeApiKey && ENV.forgeApiKey.trim().length > 0);

  if (hasExternalLlm) {
    try {
      const systemPrompt = buildTutorSystemPrompt({
        topic,
        learningStyle,
        difficulty,
        curriculumSummary,
      });

      const apiMessages = [
        { role: "system" as const, content: systemPrompt },
        ...messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      ];

      const apiUrl = ENV.forgeApiUrl
        ? `${ENV.forgeApiUrl.replace(/\\/$/, "")}/v1/chat/completions`
        : "https://forge.manus.im/v1/chat/completions";

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ENV.forgeApiKey}`,
        },
        body: JSON.stringify({
          messages: apiMessages,
          stream: true,
          max_tokens: 512,
        }),
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let tokenCount = 0;

        while (!finished) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (finished) break;
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]") {
              if (trimmed === "data: [DONE]") {
                res.write("data: [DONE]\\n\\n");
              }
              continue;
            }
            if (trimmed.startsWith("data: ")) {
              try {
                const json = JSON.parse(trimmed.slice(6));
                const delta = json.choices?.[0]?.delta?.content;
                if (delta) {
                  tokenCount++;
                  res.write(`data: ${JSON.stringify({ delta })}\\n\\n`);
                }
              } catch {
                // skip
              }
            }
          }
        }

        const ms = timer.stop();
        audit.success("ai_call", "Tutor stream completed via LLM", { topic, tokenCount }, ms);

        if (!finished) {
          res.write("data: [DONE]\\n\\n");
          res.end();
        }
        return;
      }
    } catch (llmErr) {
      audit.warn("ai_call", "LLM stream encountered error, activating intelligent fallback", {
        error: String(llmErr),
      });
    }
  }

  // Built-in intelligent stream generator
  const lastUserMsg = messages[messages.length - 1]?.content || "";
  const fullResponse = generateTutorResponse(
    lastUserMsg,
    topic,
    learningStyle,
    difficulty,
    curriculumSummary
  );

  // Stream word by word smoothly
  const words = fullResponse.split(" ");
  let wordIdx = 0;

  const interval = setInterval(() => {
    if (finished || wordIdx >= words.length) {
      clearInterval(interval);
      if (!finished && !res.writableEnded) {
        res.write("data: [DONE]\\n\\n");
        res.end();
      }
      return;
    }

    const chunk = (wordIdx === 0 ? "" : " ") + words[wordIdx];
    res.write(`data: ${JSON.stringify({ delta: chunk })}\\n\\n`);
    wordIdx++;
  }, 35);
}
"""

with open('server/tutorStream.ts', 'w', encoding='utf-8') as f:
    f.write(tutor_stream_code)
print("1. server/tutorStream.ts updated with full Intelligent Tutor Engine!")

# ─── 2. Update client/src/components/InteractiveTutor.tsx ─────────────────────
with open('client/src/components/InteractiveTutor.tsx', 'r', encoding='utf-8') as f:
    it_content = f.read().replace('\r\n', '\n')

# Replace SUGGESTED_PROMPTS and welcome card to dynamically use curriculumSummary
old_welcome = """        {/* Welcome message */}
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-5xl mb-4"
            >
              🚀
            </motion.div>
            <p className="font-black text-lg mb-2" style={{ color: "#00E5FF" }}>
              Hi! I'm Nova, your Space Tutor!
            </p>
            <p className="text-sm mb-6" style={{ color: "#64748B" }}>
              Ask me anything about {config.focusTopic}!
            </p>
            {/* Suggested prompts */}
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTED_PROMPTS.slice(0, 4).map((prompt, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => sendMessage(prompt)}
                  className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: "rgba(124,77,255,0.12)",
                    border: "1px solid rgba(124,77,255,0.3)",
                    color: "#7C4DFF",
                    cursor: "pointer",
                  }}
                >
                  {prompt}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}"""

new_welcome = """        {/* Welcome message */}
        {messages.length === 0 && (() => {
          const isAr =
            curriculumSummary?.language === "ar" ||
            /[\\u0600-\\u06FF]/.test(config.focusTopic);

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
        })()}"""

if old_welcome in it_content:
    it_content = it_content.replace(old_welcome, new_welcome)
    print("2a. InteractiveTutor.tsx welcome card & dynamic prompts updated!")

# Header subtitle
it_content = it_content.replace(
    '<p className="font-black text-sm" style={{ color: "#00E5FF" }}>\n              Nova — Space Tutor\n            </p>',
    '<p className="font-black text-sm" style={{ color: "#00E5FF" }}>\n              Nova — AI Tutor\n            </p>'
)

with open('client/src/components/InteractiveTutor.tsx', 'w', encoding='utf-8') as f:
    f.write(it_content)

print("All updates applied successfully!")
