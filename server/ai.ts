/**
 * ai.ts — NeuroPlay AI: Content Processing & Quiz Generation
 *
 * Implements:
 *  1. extractTextFromPdfBuffer — Extract raw text from uploaded PDF
 *  2. processContent           — Summarises raw curriculum text/PDF into structured JSON
 *  3. generateQuiz             — Produces Zod-validated quiz questions from curriculum
 *  4. buildTutorSystemPrompt   — System prompt for Nova AI Tutor
 */

import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { audit, auditTimer } from "./audit";

// ─── PDF Parser Helper ───────────────────────────────────────────────────────

export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const textResult = await parser.getText();
    if (typeof textResult === "string") return textResult;
    if (textResult && typeof (textResult as any).text === "string") return (textResult as any).text;
    return "";
  } catch (err) {
    console.warn("[PDF Parse] Failed to extract text from PDF:", err);
    return "";
  }
}

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

export const CurriculumSummarySchema = z.object({
  title: z.string().describe("Module title"),
  gradeLevel: z.string().describe("Target grade level"),
  keyTopics: z.array(z.string()).describe("Main topics covered (max 8)"),
  learningObjectives: z.array(z.string()).describe("What students will learn"),
  funFacts: z.array(z.string()).describe("Engaging fun facts for ADHD engagement (max 5)"),
  vocabularyWords: z.array(
    z.object({
      word: z.string(),
      definition: z.string(),
      emoji: z.string(),
    })
  ).describe("Key vocabulary with kid-friendly definitions"),
  fullExtractedText: z.string().optional(),
  language: z.enum(["ar", "en"]).optional(),
});

export type CurriculumSummary = z.infer<typeof CurriculumSummarySchema>;

export const QuizQuestionSchema = z.object({
  id: z.string(),
  question: z.string().describe("Short, clear question (max 15 words)"),
  options: z.array(z.string()).length(4).describe("Exactly 4 answer options"),
  correctIndex: z.number().min(0).max(3).describe("Index of the correct answer (0-3)"),
  explanation: z.string().describe("Brief, encouraging explanation for the correct answer"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  emoji: z.string().describe("Relevant emoji for visual engagement"),
  xpReward: z.number().describe("XP points for correct answer"),
});

export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

export const QuizBatchSchema = z.object({
  moduleTitle: z.string(),
  totalXP: z.number(),
  questions: z.array(QuizQuestionSchema).min(3).max(10),
});

export type QuizBatch = z.infer<typeof QuizBatchSchema>;

// ─── Smart Heuristic Extractor (when LLM API is unavailable) ─────────────────

export function extractCurriculumFromText(
  topic: string,
  rawText?: string,
  difficulty = "Easy"
): CurriculumSummary {
  const cleanText = (rawText || "").replace(/\[File:[^\]]+\]/g, "").trim();
  const isArabic = /[\u0600-\u06FF]/.test(cleanText) || /[\u0600-\u06FF]/.test(topic);
  const lines = cleanText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 2);
  const sentences = cleanText.split(/[.!?\u06D4\n]+/).map(s => s.trim()).filter(s => s.length > 6 && s.length < 180);

  // Derive title
  const firstHeader = lines.find(l => l.length < 70 && !l.endsWith(".") && !l.startsWith("http"));
  const moduleTitle = firstHeader || topic || (isArabic ? "درس تعليمي ممتع" : "Interactive Lesson");

  // Key topics from text lines or headings
  let keyTopics: string[] = [];
  if (lines.length > 1) {
    keyTopics = lines
      .filter(l => l.length >= 4 && l.length < 50 && !l.includes("...") && l !== moduleTitle)
      .slice(0, 6);
  }
  if (keyTopics.length < 2) {
    keyTopics = isArabic
      ? [`أساسيات ${topic}`, "أهم المفاهيم والنقاط الرئيسية", "معلومات وتطبيقات شيقة", "مراجعة وتحديات"]
      : [`${topic} Essentials`, "Core Concepts & Discovery", "Fun Facts & Applications", "Mission Review"];
  }

  // Fun facts from actual sentences
  let funFacts: string[] = [];
  if (sentences.length >= 2) {
    funFacts = sentences.slice(0, 5).map(s => {
      const cleanS = s.replace(/^[-*•\d.]+\s*/, "");
      return cleanS.endsWith("!") ? cleanS : cleanS + (isArabic ? " 🌟" : " ✨");
    });
  } else {
    funFacts = isArabic
      ? [
          `${topic} يحتوي على أفكار مدهشة ومفيدة جداً! 💡`,
          `كل خطوة تفهمها في هذا الدرس تمنحك نقاط خبرة XP إضافية! ⭐`,
          `التعلم خطوة بخطوة يجعلك خارق الذكاء والتركيز! 🚀`,
        ]
      : [
          `${topic} has amazing insights waiting to be explored! 💡`,
          `Every concept you master unlocks bonus XP power! ⭐`,
          `Learning chunk-by-chunk keeps your brain laser focused! 🚀`,
        ];
  }

  // Key vocabulary words extracted from actual text
  const extractedWords = isArabic
    ? (cleanText.match(/[\u0621-\u064A]{4,15}/g) || [])
    : (cleanText.match(/\b[A-Za-z]{4,14}\b/g) || []);

  const stopWords = new Set([
    "with", "from", "that", "this", "have", "about", "more", "some", "also", "there", "which",
    "التي", "الذي", "التي", "هذا", "هذه", "ذلك", "تلك", "يكون", "كانت", "على", "إلى", "منها", "فيها", "عنها", "حيث", "وكان"
  ]);

  const uniqueWords = Array.from(new Set(extractedWords))
    .filter(w => !stopWords.has(w.toLowerCase()))
    .slice(0, 6);

  const emojis = ["💡", "🔍", "⭐", "🎯", "⚡", "🧠"];

  const vocabularyWords = uniqueWords.length >= 2
    ? uniqueWords.map((w, idx) => ({
        word: isArabic ? w : (w.charAt(0).toUpperCase() + w.slice(1)),
        definition: isArabic
          ? `مفهوم أساسي ومهم جداً في فهم درس ${topic}.`
          : `A core concept discovered in the ${topic} curriculum.`,
        emoji: emojis[idx % emojis.length],
      }))
    : isArabic
    ? [
        { word: "الفكرة الأساسية", definition: "المحور الرئيسي الذي يدور حوله هذا الدرس.", emoji: "💡" },
        { word: "الاستكشاف", definition: "البحث واكتشاف معلومات وحقائق جديدة ومفيدة.", emoji: "🔍" },
        { word: "التركيز الخارق", definition: "توجيه كامل قوة عقلك نحو هدف التعلم.", emoji: "🎯" },
      ]
    : [
        { word: "Core Mission", definition: "The main learning objective of this module.", emoji: "🚀" },
        { word: "Discovery", definition: "Finding and understanding new valuable insights.", emoji: "🔍" },
        { word: "Hyper Focus", definition: "Directing full brainpower to master this topic.", emoji: "🎯" },
      ];

  const learningObjectives = isArabic
    ? [
        `فهم الأفكار والمفاهيم الأساسية في درس ${topic}`,
        `استكشاف الحقائق والمعلومات المستخلصة من الملف المرفق`,
        `الإجابة على التحديات التفاعلية بنجاح وسرعة خارقة!`,
      ]
    : [
        `Understand key ideas about ${topic}`,
        `Identify important facts from the uploaded lesson`,
        `Answer quiz challenges with maximum focus and speed!`,
      ];

  return {
    title: moduleTitle,
    gradeLevel: isArabic ? "الأعمار 7-10 (مُهيأ لفرط الحركة والتركيز)" : "Ages 7-10 (ADHD-Friendly)",
    keyTopics,
    learningObjectives,
    funFacts,
    vocabularyWords,
    fullExtractedText: cleanText,
    language: isArabic ? "ar" : "en",
  };
}

// ─── Content Processing ───────────────────────────────────────────────────────

export async function processContent(params: {
  topic: string;
  rawText?: string;
  pdfBase64?: string;
  learningStyle: string;
  difficulty: string;
}): Promise<CurriculumSummary> {
  const timer = auditTimer();

  // If a PDF is attached, parse text from buffer
  if (params.pdfBase64) {
    try {
      const base64Data = params.pdfBase64.replace(/^data:.*?;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const extractedText = await extractTextFromPdfBuffer(buffer);
      if (extractedText && extractedText.trim()) {
        params.rawText = (params.rawText ? params.rawText + "\n\n" : "") + extractedText.trim();
        audit.info("content_process", "Extracted text from uploaded PDF successfully", {
          textLength: extractedText.length,
        });
      }
    } catch (e) {
      audit.warn("content_process", "PDF extraction encountered a non-fatal warning", { error: String(e) });
    }
  }

  audit.info("content_process", "Starting curriculum content processing", {
    topic: params.topic,
    learningStyle: params.learningStyle,
    difficulty: params.difficulty,
    hasRawText: !!params.rawText,
  });

  const systemPrompt = `You are NeuroPlay AI, an expert educational content processor specializing in ADHD-friendly learning for children aged 7-10.
Your task is to analyze curriculum content and extract structured learning data.
Keep all language simple, engaging, and age-appropriate.
Use short sentences. Avoid jargon. Make it fun and exciting!`;

  const userPrompt = `Process this curriculum content for a ${params.difficulty} difficulty ${params.learningStyle} learning module about: "${params.topic}"

${params.rawText ? `Raw curriculum content:\n${params.rawText.slice(0, 8000)}` : `Generate content based on the topic: ${params.topic}`}

Return a structured JSON with:
- title: engaging module title
- gradeLevel: appropriate grade level
- keyTopics: up to 8 main topics (short phrases)
- learningObjectives: 3-5 clear learning goals
- funFacts: 5 amazing, surprising facts kids will love
- vocabularyWords: 5-8 key words with kid-friendly definitions and relevant emojis`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "curriculum_summary",
          strict: true,
          schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              gradeLevel: { type: "string" },
              keyTopics: { type: "array", items: { type: "string" } },
              learningObjectives: { type: "array", items: { type: "string" } },
              funFacts: { type: "array", items: { type: "string" } },
              vocabularyWords: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    word: { type: "string" },
                    definition: { type: "string" },
                    emoji: { type: "string" },
                  },
                  required: ["word", "definition", "emoji"],
                  additionalProperties: false,
                },
              },
            },
            required: ["title", "gradeLevel", "keyTopics", "learningObjectives", "funFacts", "vocabularyWords"],
            additionalProperties: false,
          },
        },
      },
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) throw new Error("Empty response from LLM");

    const parsed = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
    const validated = CurriculumSummarySchema.parse(parsed);

    const ms = timer.stop();
    audit.success("content_process", "Curriculum processed successfully via LLM", {
      title: validated.title,
      topicCount: validated.keyTopics.length,
    }, ms);

    return validated;
  } catch (err) {
    // Graceful smart fallback using extracted text
    const ms = timer.stop();
    audit.warn("content_process", "LLM unavailable — using smart heuristic text extractor", {
      reason: String(err),
      topic: params.topic,
    }, ms);

    const fallbackSummary = extractCurriculumFromText(params.topic, params.rawText, params.difficulty);
    return fallbackSummary;
  }
}

// ─── Quiz Generation ──────────────────────────────────────────────────────────

export function generateSmartFallbackQuiz(params: {
  topic: string;
  curriculumSummary?: CurriculumSummary;
  difficulty: string;
  questionCount?: number;
}): QuizBatch {
  const count = params.questionCount ?? 5;
  const xpReward = params.difficulty === "Boss Level" ? 200 : params.difficulty === "Medium" ? 100 : 50;
  const questions: QuizQuestion[] = [];
  const summary = params.curriculumSummary;

  if (summary && summary.vocabularyWords && summary.vocabularyWords.length > 0) {
    summary.vocabularyWords.slice(0, count).forEach((vocab, i) => {
      questions.push({
        id: `q_vocab_${i + 1}`,
        question: `What does "${vocab.word}" mean in our lesson?`,
        options: [
          vocab.definition,
          `A mysterious space creature that lives in comets.`,
          `An old robot forgotten on the dark side of the Moon.`,
          `A special type of astronaut space food.`,
        ],
        correctIndex: 0,
        explanation: `Great job! "${vocab.word}" means: ${vocab.definition}`,
        difficulty: params.difficulty === "Boss Level" ? "hard" : params.difficulty === "Easy" ? "easy" : "medium",
        emoji: vocab.emoji || "🚀",
        xpReward,
      });
    });
  }

  if (summary && summary.funFacts && summary.funFacts.length > 0 && questions.length < count) {
    summary.funFacts.slice(0, count - questions.length).forEach((fact, i) => {
      questions.push({
        id: `q_fact_${questions.length + 1}`,
        question: `True or False: ${fact.replace(/!/g, "")}?`,
        options: [
          "True! That's a super cool fact! 🌟",
          "False! It never happened in space.",
          "False! Only alien spaceships can do that.",
          "False! It only happens during an eclipse.",
        ],
        correctIndex: 0,
        explanation: `Exactly! ${fact}`,
        difficulty: "easy",
        emoji: "⭐",
        xpReward,
      });
    });
  }

  const isAr = summary?.language === "ar" || /[\u0600-\u06FF]/.test(params.topic);
  const curTitle = summary?.title || params.topic;

  const standardQuestions: QuizQuestion[] = isAr
    ? [
        {
          id: "q_std_1",
          question: `ما هو المحور الأساسي الذي يركز عليه درس "${curTitle}"؟ 🎯`,
          options: [
            `فهم الأفكار والمفاهيم الواردة في ${curTitle}`,
            `دراسة سرعة الضوء في الفضاء الخارجي`,
            `تاريخ بناء الأهرامات القديمة`,
            `قواعد لعب كرة السلة للمحترفين`,
          ],
          correctIndex: 0,
          explanation: `إجابة رائعة يا بطل! الدرس يركز بشكل أساسي على: ${curTitle}`,
          difficulty: "easy",
          emoji: "🎯",
          xpReward,
        },
        {
          id: "q_std_2",
          question: `كيف يساعدنا فهم "${curTitle}" في حياتنا اليومية؟ 💡`,
          options: [
            `يمنحنا معرفة جديدة ويطور تفكيرنا وذكاءنا`,
            `ليس له أي فائدة أو تأثير`,
            `يُستخدم فقط في ألعاب الفيديو`,
            `يجعلنا ننسى ما تعلمناه سابقاً`,
          ],
          correctIndex: 0,
          explanation: `ممتاز جداً! العلم والمعرفة في هذا الدرس يطوران تفكيرنا! 🌟`,
          difficulty: "easy",
          emoji: "💡",
          xpReward,
        },
      ]
    : [
        {
          id: "q_std_1",
          question: `What is the main focus of the module "${curTitle}"? 🎯`,
          options: [
            `Mastering the key concepts of ${curTitle}`,
            `Calculating the speed of light in deep space`,
            `The history of ancient pyramid construction`,
            `Professional basketball tournament rules`,
          ],
          correctIndex: 0,
          explanation: `Awesome job! This lesson is all about ${curTitle}!`,
          difficulty: "easy",
          emoji: "🎯",
          xpReward,
        },
        {
          id: "q_std_2",
          question: `Why is learning about "${curTitle}" important? 💡`,
          options: [
            `It expands our understanding and sharpens our brainpower`,
            `It has zero real-world usefulness`,
            `It only applies inside video games`,
            `It makes us forget previous skills`,
          ],
          correctIndex: 0,
          explanation: `Spot on! Exploring this topic powers up your knowledge! 🌟`,
          difficulty: "easy",
          emoji: "💡",
          xpReward,
        },
      ];

  while (questions.length < count) {
    const nextQ = standardQuestions[questions.length % standardQuestions.length];
    questions.push({ ...nextQ, id: `q_pad_${questions.length + 1}` });
  }

  return {
    moduleTitle: summary?.title || params.topic || "Space Explorer Quiz",
    totalXP: questions.reduce((sum, q) => sum + q.xpReward, 0),
    questions: questions.slice(0, count),
  };
}

export async function generateQuiz(params: {
  topic: string;
  curriculumSummary?: CurriculumSummary;
  difficulty: string;
  questionCount?: number;
}): Promise<QuizBatch> {
  const timer = auditTimer();
  const count = params.questionCount ?? 5;

  audit.info("quiz_gen", "Generating quiz questions", {
    topic: params.topic,
    difficulty: params.difficulty,
    questionCount: count,
  });

  const difficultyMap: Record<string, { xp: number; desc: string }> = {
    Easy: { xp: 50, desc: "simple, straightforward questions for beginners" },
    Medium: { xp: 100, desc: "moderately challenging questions" },
    "Boss Level": { xp: 200, desc: "challenging, deep-thinking questions" },
  };
  const diffConfig = difficultyMap[params.difficulty] ?? difficultyMap["Medium"];

  const contextBlock = params.curriculumSummary
    ? `Module: ${params.curriculumSummary.title}
Key Topics: ${params.curriculumSummary.keyTopics.join(", ")}
Learning Objectives: ${params.curriculumSummary.learningObjectives.join("; ")}
Vocabulary: ${params.curriculumSummary.vocabularyWords.map(v => `${v.word}: ${v.definition}`).join("; ")}`
    : `Topic: ${params.topic}`;

  const systemPrompt = `You are NeuroPlay AI Quiz Master, creating ADHD-friendly quiz questions for children aged 7-10.
Rules:
- Questions must be SHORT (max 15 words)
- Use simple, fun language
- Include one clearly correct answer
- Make wrong answers plausible but obviously wrong to someone who studied
- Add encouraging explanations
- Each question gets a relevant emoji`;

  const userPrompt = `Create exactly ${count} ${diffConfig.desc} quiz questions about:
${contextBlock}

Each question must have:
- A unique id (q1, q2, q3...)
- Exactly 4 answer options
- The correct answer index (0-3)
- A brief encouraging explanation
- difficulty: "${params.difficulty.toLowerCase() === "boss level" ? "hard" : params.difficulty.toLowerCase()}"
- An emoji
- xpReward: ${diffConfig.xp}

Return as JSON with fields: moduleTitle, totalXP, questions[]`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "quiz_batch",
          strict: true,
          schema: {
            type: "object",
            properties: {
              moduleTitle: { type: "string" },
              totalXP: { type: "number" },
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    question: { type: "string" },
                    options: { type: "array", items: { type: "string" } },
                    correctIndex: { type: "number" },
                    explanation: { type: "string" },
                    difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                    emoji: { type: "string" },
                    xpReward: { type: "number" },
                  },
                  required: ["id", "question", "options", "correctIndex", "explanation", "difficulty", "emoji", "xpReward"],
                  additionalProperties: false,
                },
              },
            },
            required: ["moduleTitle", "totalXP", "questions"],
            additionalProperties: false,
          },
        },
      },
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) throw new Error("Empty response from LLM");

    const parsed = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
    const validated = QuizBatchSchema.parse(parsed);

    const ms = timer.stop();
    audit.success("quiz_gen", "Quiz generated successfully via LLM", {
      moduleTitle: validated.moduleTitle,
      questionCount: validated.questions.length,
      totalXP: validated.totalXP,
    }, ms);

    return validated;
  } catch (err) {
    const ms = timer.stop();
    audit.warn("quiz_gen", "LLM unavailable — using smart fallback quiz from curriculum", {
      error: String(err),
      topic: params.topic,
    }, ms);

    return generateSmartFallbackQuiz(params);
  }
}

// ─── Streaming Tutor System Prompt Builder ────────────────────────────────────

export function buildTutorSystemPrompt(config: {
  topic: string;
  learningStyle: string;
  difficulty: string;
  curriculumSummary?: CurriculumSummary;
}): string {
  const styleGuides: Record<string, string> = {
    "ADHD Socratic": "Ask one short question at a time. Wait for the child to answer. Give instant praise. Never lecture for more than 2 sentences.",
    "Storytelling": "Tell everything as an exciting space adventure story. Use vivid descriptions. Make the child the hero.",
    "Bullet Points Only": "Always use bullet points. Max 3 bullets per response. Use emojis before each bullet.",
    "Gamified": "Frame everything as a game. Award XP points for correct answers. Use game terminology (quest, level up, boss battle).",
  };

  const style = styleGuides[config.learningStyle] ?? styleGuides["ADHD Socratic"];

  const contextBlock = config.curriculumSummary
    ? `You are teaching: ${config.curriculumSummary.title}
Key topics: ${config.curriculumSummary.keyTopics.slice(0, 5).join(", ")}
Fun facts to share: ${config.curriculumSummary.funFacts.slice(0, 3).join(" | ")}
Vocabulary: ${config.curriculumSummary.vocabularyWords.map(v => v.word).join(", ")}`
    : `You are teaching about: ${config.topic}`;

  return `You are Nova, the NeuroPlay AI Space Tutor — a friendly, energetic AI guide for children aged 7-10 with ADHD.

${contextBlock}

Difficulty level: ${config.difficulty}
Teaching style: ${style}

STRICT RULES:
1. NEVER write more than 3 sentences in a single response
2. ALWAYS use simple words (grade 2-3 reading level)
3. ALWAYS add 1-2 relevant emojis in every response
4. ALWAYS give instant positive reinforcement ("Amazing! 🌟", "You're a star! ⭐")
5. If a child seems confused, simplify further and use an analogy
6. Keep responses SHORT and PUNCHY — ADHD brains need quick wins
7. End each response with either a question OR an encouraging call-to-action`;
}
