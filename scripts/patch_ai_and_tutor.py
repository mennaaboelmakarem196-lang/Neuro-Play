import re

print("Patching server/ai.ts, server/tutorStream.ts, and client/src/components/InteractiveTutor.tsx...")

# ─── 1. Patch server/ai.ts ──────────────────────────────────────────────────
with open('server/ai.ts', 'r', encoding='utf-8') as f:
    ai_content = f.read().replace('\r\n', '\n')

# Add fullExtractedText & language to CurriculumSummarySchema
old_schema = """export const CurriculumSummarySchema = z.object({
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
});"""

new_schema = """export const CurriculumSummarySchema = z.object({
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
});"""

if old_schema in ai_content:
    ai_content = ai_content.replace(old_schema, new_schema)
    print("1a. CurriculumSummarySchema updated with fullExtractedText and language!")
else:
    print("1a. CurriculumSummarySchema old_schema not matched")

# Improve extractCurriculumFromText to support Arabic and extract real PDF content
old_extract = """export function extractCurriculumFromText(
  topic: string,
  rawText?: string,
  difficulty = "Easy"
): CurriculumSummary {
  const cleanText = (rawText || "").replace(/\\[File:[^\\]]+\\]/g, "").trim();
  const lines = cleanText.split(/\\r?\\n/).map(l => l.trim()).filter(l => l.length > 3);
  const sentences = cleanText.split(/[.!?\\u06D4]+/).map(s => s.trim()).filter(s => s.length > 8 && s.length < 160);

  // Derive title
  const firstHeader = lines.find(l => l.length < 60 && !l.endsWith("."));
  const moduleTitle = firstHeader || topic || "Interactive Space Lesson";

  // Key topics
  let keyTopics: string[] = [];
  if (lines.length > 1) {
    keyTopics = lines
      .filter(l => l.length < 45 && !l.includes("...") && l !== moduleTitle)
      .slice(0, 5);
  }
  if (keyTopics.length < 3) {
    keyTopics = [
      `${topic} Essentials`,
      "Key Discovery Points",
      "Observations & Science",
      "Fun Explorations",
    ];
  }

  // Fun facts from text sentences
  let funFacts: string[] = [];
  if (sentences.length >= 3) {
    funFacts = sentences.slice(0, 5).map(s => s.endsWith("!") ? s : s + " 🌟");
  } else {
    funFacts = [
      `${topic} has amazing secrets waiting for young explorers! 🚀`,
      `Scientists study ${topic} to understand our universe better! 🔭`,
      `Every step in this mission unlocks awesome bonus XP! ⭐`,
    ];
  }

  // Key vocabulary words
  const extractedWords = cleanText.match(/\\b[A-Za-z\\u0600-\\u06FF]{4,14}\\b/g) || [];
  const uniqueWords = Array.from(new Set(extractedWords.map(w => w.charAt(0).toUpperCase() + w.slice(1))))
    .filter(w => !["With", "From", "That", "This", "Have", "About", "More", "Some", "Also"].includes(w))
    .slice(0, 5);

  const vocabularyWords = uniqueWords.length >= 2
    ? uniqueWords.map((w, idx) => ({
        word: w,
        definition: `A core concept discovered in the ${topic} curriculum.`,
        emoji: ["🪐", "⚡", "🔬", "🌟", "🚀"][idx % 5],
      }))
    : [
        { word: "Mission", definition: "An exciting learning journey to achieve high scores.", emoji: "🚀" },
        { word: "Discovery", definition: "Finding and learning something brand new.", emoji: "🔍" },
        { word: "Focus", definition: "Directing your full superhero brain power toward one target.", emoji: "🎯" },
      ];

  return {
    title: moduleTitle,
    gradeLevel: "Ages 7-10 (ADHD-Friendly)",
    keyTopics,
    learningObjectives: [
      `Understand key ideas about ${topic}`,
      `Identify important facts from the uploaded lesson`,
      `Answer quiz challenges with maximum focus and speed!`,
    ],
    funFacts,
    vocabularyWords,
  };
}"""

new_extract = """export function extractCurriculumFromText(
  topic: string,
  rawText?: string,
  difficulty = "Easy"
): CurriculumSummary {
  const cleanText = (rawText || "").replace(/\\[File:[^\\]]+\\]/g, "").trim();
  const isArabic = /[\\u0600-\\u06FF]/.test(cleanText) || /[\\u0600-\\u06FF]/.test(topic);
  const lines = cleanText.split(/\\r?\\n/).map(l => l.trim()).filter(l => l.length > 2);
  const sentences = cleanText.split(/[.!?\\u06D4\\n]+/).map(s => s.trim()).filter(s => s.length > 6 && s.length < 180);

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
      const cleanS = s.replace(/^[-*•\\d.]+\\s*/, \"\");
      return cleanS.endsWith(\"!\") ? cleanS : cleanS + (isArabic ? \" 🌟\" : \" ✨\");
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
    ? (cleanText.match(/[\\u0621-\\u064A]{4,15}/g) || [])
    : (cleanText.match(/\\b[A-Za-z]{4,14}\\b/g) || []);

  const stopWords = new Set([
    "with", "from", "that", "this", "have", "about", "more", "some", "also", "there", "which",
    "التي", "الذي", "التي", "هذا", "هذه", "ذلك", "تلك", "يكون", "كانت", "على", "إلى", "منها", "فيها", "عنها", "حيث", "وكان"
  ]);

  const uniqueWords = Array.from(new Set(extractedWords))
    .filter(w => !stopWords.has(w.toLowerCase()))
    .slice(0, 6);

  const emojis = [\"💡\", \"🔍\", \"⭐\", \"🎯\", \"⚡\", \"🧠\"];

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
        { word: \"الفكرة الأساسية\", definition: \"المحور الرئيسي الذي يدور حوله هذا الدرس.\", emoji: \"💡\" },
        { word: \"الاستكشاف\", definition: \"البحث واكتشاف معلومات وحقائق جديدة ومفيدة.\", emoji: \"🔍\" },
        { word: \"التركيز الخارق\", definition: \"توجيه كامل قوة عقلك نحو هدف التعلم.\", emoji: \"🎯\" },
      ]
    : [
        { word: \"Core Mission\", definition: \"The main learning objective of this module.\", emoji: \"🚀\" },
        { word: \"Discovery\", definition: \"Finding and understanding new valuable insights.\", emoji: \"🔍\" },
        { word: \"Hyper Focus\", definition: \"Directing full brainpower to master this topic.\", emoji: \"🎯\" },
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
    gradeLevel: isArabic ? \"الأعمار 7-10 (مُهيأ لفرط الحركة والتركيز)\" : \"Ages 7-10 (ADHD-Friendly)\",
    keyTopics,
    learningObjectives,
    funFacts,
    vocabularyWords,
    fullExtractedText: cleanText,
    language: isArabic ? \"ar\" : \"en\",
  };
}"""

if old_extract in ai_content:
    ai_content = ai_content.replace(old_extract, new_extract)
    print("1b. extractCurriculumFromText updated with rich Arabic/English support!")
else:
    print("1b. extractCurriculumFromText old_extract not matched")

# Also ensure processContent sets fullExtractedText on the returned summary
old_return = """    const ms = timer.stop();
    audit.success("content_process", "Curriculum processed successfully via LLM", {
      title: validated.title,
      topicsCount: validated.keyTopics.length,
      vocabCount: validated.vocabularyWords.length,
    }, ms);

    return validated;"""

new_return = """    const ms = timer.stop();
    audit.success("content_process", "Curriculum processed successfully via LLM", {
      title: validated.title,
      topicsCount: validated.keyTopics.length,
      vocabCount: validated.vocabularyWords.length,
    }, ms);

    return {
      ...validated,
      fullExtractedText: params.rawText,
      language: /[\\u0600-\\u06FF]/.test(params.rawText || params.topic) ? \"ar\" : \"en\",
    };"""

if old_return in ai_content:
    ai_content = ai_content.replace(old_return, new_return)
    print("1c. processContent updated with fullExtractedText preserved!")

# Fix standardQuestions fallback in generateSmartFallbackQuiz to NOT force Solar System
old_quiz_fallback = """  // Solar system generic fallbacks if still needed
  const standardQuestions: QuizQuestion[] = [
    {
      id: "q_std_1",
      question: "Which planet is closest to the Sun? ☀️",
      options: ["Mercury", "Venus", "Earth", "Mars"],
      correctIndex: 0,
      explanation: "Mercury is the smallest planet and closest to the Sun!",
      difficulty: "easy",
      emoji: "🪐",
      xpReward,
    },
    {
      id: "q_std_2",
      question: "Which planet is famously known as the Red Planet? 🔴",
      options: ["Mars", "Jupiter", "Saturn", "Neptune"],
      correctIndex: 0,
      explanation: "Mars is reddish because of iron oxide on its surface!",
      difficulty: "easy",
      emoji: "🔴",
      xpReward,
    },
    {
      id: "q_std_3",
      question: "What is the biggest planet in our entire Solar System? 👑",
      options: ["Jupiter", "Saturn", "Uranus", "Earth"],
      correctIndex: 0,
      explanation: "Jupiter is so huge that over 1,300 Earths could fit inside!",
      difficulty: "medium",
      emoji: "👑",
      xpReward,
    },
  ];"""

new_quiz_fallback = """  const isAr = summary?.language === \"ar\" || /[\\u0600-\\u06FF]/.test(params.topic);
  const curTitle = summary?.title || params.topic;

  const standardQuestions: QuizQuestion[] = isAr
    ? [
        {
          id: \"q_std_1\",
          question: `ما هو المحور الأساسي الذي يركز عليه درس \"${curTitle}\"؟ 🎯`,
          options: [
            `فهم الأفكار والمفاهيم الواردة في ${curTitle}`,
            `دراسة سرعة الضوء في الفضاء الخارجي`,
            `تاريخ بناء الأهرامات القديمة`,
            `قواعد لعب كرة السلة للمحترفين`,
          ],
          correctIndex: 0,
          explanation: `إجابة رائعة يا بطل! الدرس يركز بشكل أساسي على: ${curTitle}`,
          difficulty: \"easy\",
          emoji: \"🎯\",
          xpReward,
        },
        {
          id: \"q_std_2\",
          question: `كيف يساعدنا فهم \"${curTitle}\" في حياتنا اليومية؟ 💡`,
          options: [
            `يمنحنا معرفة جديدة ويطور تفكيرنا وذكاءنا`,
            `ليس له أي فائدة أو تأثير`,
            `يُستخدم فقط في ألعاب الفيديو`,
            `يجعلنا ننسى ما تعلمناه سابقاً`,
          ],
          correctIndex: 0,
          explanation: `ممتاز جداً! العلم والمعرفة في هذا الدرس يطوران تفكيرنا! 🌟`,
          difficulty: \"easy\",
          emoji: \"💡\",
          xpReward,
        },
      ]
    : [
        {
          id: \"q_std_1\",
          question: `What is the main focus of the module \"${curTitle}\"? 🎯`,
          options: [
            `Mastering the key concepts of ${curTitle}`,
            `Calculating the speed of light in deep space`,
            `The history of ancient pyramid construction`,
            `Professional basketball tournament rules`,
          ],
          correctIndex: 0,
          explanation: `Awesome job! This lesson is all about ${curTitle}!`,
          difficulty: \"easy\",
          emoji: \"🎯\",
          xpReward,
        },
        {
          id: \"q_std_2\",
          question: `Why is learning about \"${curTitle}\" important? 💡`,
          options: [
            `It expands our understanding and sharpens our brainpower`,
            `It has zero real-world usefulness`,
            `It only applies inside video games`,
            `It makes us forget previous skills`,
          ],
          correctIndex: 0,
          explanation: `Spot on! Exploring this topic powers up your knowledge! 🌟`,
          difficulty: \"easy\",
          emoji: \"💡\",
          xpReward,
        },
      ];"""

if old_quiz_fallback in ai_content:
    ai_content = ai_content.replace(old_quiz_fallback, new_quiz_fallback)
    print("1d. Solar System fallback replaced with dynamic topic-based fallback!")

with open('server/ai.ts', 'w', encoding='utf-8') as f:
    f.write(ai_content)

print("server/ai.ts saved.")
