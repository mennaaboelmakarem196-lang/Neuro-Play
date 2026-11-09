import re

print("Applying bilingual language toggle to NeuroPlayHub and InteractiveTutor...")

# ─── 1. Update NeuroPlayHub.tsx ───────────────────────────────────────────────
with open('client/src/pages/NeuroPlayHub.tsx', 'r', encoding='utf-8') as f:
    hub = f.read().replace('\r\n', '\n')

# Add imports
if 'import { LanguageToggle }' not in hub:
    hub = hub.replace(
        'import { ContentStudio, type ContentStudioConfig } from "@/components/ContentStudio";',
        'import { ContentStudio, type ContentStudioConfig } from "@/components/ContentStudio";\nimport { LanguageToggle } from "@/components/LanguageToggle";\nimport { useLanguage } from "@/contexts/LanguageContext";'
    )

# Use useLanguage hook inside component
if 'const { lang, isRTL } = useLanguage();' not in hub:
    hub = hub.replace(
        'export default function NeuroPlayHub() {',
        'export default function NeuroPlayHub() {\n  const { lang, isRTL } = useLanguage();'
    )

# Add Top Bar with LanguageToggle on main layout
old_root = """  return (
    <div
      className="min-h-screen"
      style={{ background: "#0F172A", fontFamily: "'Comfortaa', sans-serif" }}
    >"""

new_root = """  return (
    <div
      className="min-h-screen relative"
      style={{ background: "#0F172A", fontFamily: lang === "ar" ? "'Cairo', sans-serif" : "'Comfortaa', sans-serif" }}
    >
      {/* Floating Language Switcher */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <LanguageToggle />
      </div>"""

if old_root in hub:
    hub = hub.replace(old_root, new_root)
    print("1a. LanguageToggle placed in top right corner of NeuroPlayHub!")

# Update button labels and text to dynamically switch based on lang === "ar"
old_buttons_block = """            <div className="w-full max-w-sm space-y-3">
              {/* Direct Nova AI Chat */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() =>
                  setState(prev => ({
                    ...prev,
                    phase: "tutor",
                    config: {
                      focusTopic: "المعلم الذكي نوفا",
                      learningStyle: "ADHD Socratic",
                      difficulty: "Easy",
                      files: [],
                    },
                    curriculumSummary: {
                      title: "المعلم الذكي نوفا (Nova AI)",
                      gradeLevel: "الأعمار 7-10 (مُهيأ لفرط الحركة والتركيز)",
                      keyTopics: ["شرح أي مادة أو درس", "تلخيص المفاهيم والمذكرات", "أسئلة وتحديات ممتعة"],
                      learningObjectives: ["التعلم بأسلوب مرح وتفاعلي سريع"],
                      funFacts: ["نوفا جاهز لمساعدتك وشرح أي موضوع تريده بأسلوب مبسط جداً! 🌟"],
                      vocabularyWords: [
                        { word: "نوفا", definition: "معلمك ومساعدك الذكي في رحلتك التعليمية", emoji: "🤖" },
                        { word: "التعلم السريع", definition: "تقسيم المعلومات لقطع صغيرة ممتعة وسهلة الحفظ", emoji: "⚡" },
                      ],
                      language: "ar",
                    },
                  }))
                }
                className="w-full py-4 rounded-2xl font-black text-base transition-all"
                style={{
                  background: "linear-gradient(135deg, #00E5FF 0%, #7C4DFF 100%)",
                  color: "#0F172A",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 0 30px rgba(0,229,255,0.35)",
                }}
              >
                🤖 ابدأ التحدث مع نوفا الآن (Nova AI)
                <p className="text-xs font-normal mt-1 opacity-80">
                  محادثة تعليمية ذكية وشرح فوري ومباشر
                </p>
              </motion.button>

              {/* Upload PDF */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setState(prev => ({ ...prev, phase: "ingestion" }))}
                className="w-full py-4 rounded-2xl font-black text-base transition-all"
                style={{
                  background: "rgba(30,41,59,0.9)",
                  border: "1px solid rgba(0,229,255,0.4)",
                  color: "#00E5FF",
                  cursor: "pointer",
                }}
              >
                📄 رفع وشرح ملف PDF
                <p className="text-xs font-normal mt-1 opacity-70">
                  رفع درس أو مذكرة ليقرأها نوفا ويشرحها لك
                </p>
              </motion.button>

              {/* SpaceLab Game Mode */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setState(prev => ({ ...prev, phase: "spacelab" }))}
                className="w-full py-4 rounded-2xl font-black text-base transition-all"
                style={{
                  background: "rgba(30,41,59,0.7)",
                  border: "1px solid rgba(174,234,0,0.3)",
                  color: "#AEEA00",
                  cursor: "pointer",
                }}
              >
                🪐 لعبة SpaceLab
                <p className="text-xs font-normal mt-1 opacity-70">
                  مغامرة كواكب المجموعة الشمسية
                </p>
              </motion.button>
            </div>"""

new_buttons_block = """            <div className="w-full max-w-sm space-y-3">
              {/* Direct Nova AI Chat */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() =>
                  setState(prev => ({
                    ...prev,
                    phase: "tutor",
                    config: {
                      focusTopic: lang === "ar" ? "المعلم الذكي نوفا" : "Nova AI Tutor",
                      learningStyle: "ADHD Socratic",
                      difficulty: "Easy",
                      files: [],
                    },
                    curriculumSummary: {
                      title: lang === "ar" ? "المعلم الذكي نوفا (Nova AI)" : "Nova AI Tutor",
                      gradeLevel: lang === "ar" ? "الأعمار 7-10 (مُهيأ لفرط الحركة والتركيز)" : "Ages 7-10 (ADHD-Friendly)",
                      keyTopics: lang === "ar"
                        ? ["شرح أي مادة أو درس", "تلخيص المفاهيم والمذكرات", "أسئلة وتحديات ممتعة"]
                        : ["Explaining any lesson", "Summarizing key concepts", "Fun quiz challenges"],
                      learningObjectives: lang === "ar"
                        ? ["التعلم بأسلوب مرح وتفاعلي سريع"]
                        : ["Engaging, bite-sized ADHD-friendly learning"],
                      funFacts: lang === "ar"
                        ? ["نوفا جاهز لمساعدتك وشرح أي موضوع تريده بأسلوب مبسط جداً! 🌟"]
                        : ["Nova is ready to explain any topic in simple, fun micro-steps! 🌟"],
                      vocabularyWords: lang === "ar"
                        ? [
                            { word: "نوفا", definition: "معلمك ومساعدك الذكي في رحلتك التعليمية", emoji: "🤖" },
                            { word: "التعلم السريع", definition: "تقسيم المعلومات لقطع صغيرة ممتعة وسهلة الحفظ", emoji: "⚡" },
                          ]
                        : [
                            { word: "Nova", definition: "Your superhero AI learning companion", emoji: "🤖" },
                            { word: "Micro-learning", definition: "Bite-sized steps designed for hyper-focus", emoji: "⚡" },
                          ],
                      language: lang,
                    },
                  }))
                }
                className="w-full py-4 rounded-2xl font-black text-base transition-all"
                style={{
                  background: "linear-gradient(135deg, #00E5FF 0%, #7C4DFF 100%)",
                  color: "#0F172A",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 0 30px rgba(0,229,255,0.35)",
                }}
              >
                {lang === "ar" ? "🤖 ابدأ التحدث مع نوفا الآن (Nova AI)" : "🤖 Start Chatting with Nova (Nova AI)"}
                <p className="text-xs font-normal mt-1 opacity-80">
                  {lang === "ar" ? "محادثة تعليمية ذكية وشرح فوري ومباشر" : "Smart interactive tutoring & instant explanation"}
                </p>
              </motion.button>

              {/* Upload PDF */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setState(prev => ({ ...prev, phase: "ingestion" }))}
                className="w-full py-4 rounded-2xl font-black text-base transition-all"
                style={{
                  background: "rgba(30,41,59,0.9)",
                  border: "1px solid rgba(0,229,255,0.4)",
                  color: "#00E5FF",
                  cursor: "pointer",
                }}
              >
                {lang === "ar" ? "📄 رفع وشرح ملف PDF" : "📄 Upload & Explain PDF"}
                <p className="text-xs font-normal mt-1 opacity-70">
                  {lang === "ar" ? "رفع درس أو مذكرة ليقرأها نوفا ويشرحها لك" : "Upload notes or textbook for Nova to explain"}
                </p>
              </motion.button>

              {/* SpaceLab Game Mode */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setState(prev => ({ ...prev, phase: "spacelab" }))}
                className="w-full py-4 rounded-2xl font-black text-base transition-all"
                style={{
                  background: "rgba(30,41,59,0.7)",
                  border: "1px solid rgba(174,234,0,0.3)",
                  color: "#AEEA00",
                  cursor: "pointer",
                }}
              >
                {lang === "ar" ? "🪐 لعبة SpaceLab" : "🪐 SpaceLab Game"}
                <p className="text-xs font-normal mt-1 opacity-70">
                  {lang === "ar" ? "مغامرة كواكب المجموعة الشمسية" : "Drag-and-drop Solar System adventure"}
                </p>
              </motion.button>
            </div>"""

if old_buttons_block in hub:
    hub = hub.replace(old_buttons_block, new_buttons_block)
    print("1b. Hub buttons made fully bilingual!")

with open('client/src/pages/NeuroPlayHub.tsx', 'w', encoding='utf-8') as f:
    f.write(hub)

# ─── 2. Update InteractiveTutor.tsx ───────────────────────────────────────────
with open('client/src/components/InteractiveTutor.tsx', 'r', encoding='utf-8') as f:
    it = f.read().replace('\r\n', '\n')

if 'import { LanguageToggle }' not in it:
    it = it.replace(
        'import type { CurriculumSummary } from "../../../server/ai";',
        'import type { CurriculumSummary } from "../../../server/ai";\nimport { LanguageToggle } from "@/components/LanguageToggle";\nimport { useLanguage } from "@/contexts/LanguageContext";'
    )

# Use useLanguage inside component
if 'const { lang: appLang } = useLanguage();' not in it:
    it = it.replace(
        'export function InteractiveTutor({',
        'export function InteractiveTutor({\n'
    )
    it = it.replace(
        'const [messages, setMessages] = useState<Message[]>([]);',
        'const { lang: appLang } = useLanguage();\n  const [messages, setMessages] = useState<Message[]>([]);'
    )

# Add LanguageToggle into the tutor header
old_tutor_header_right = """        {/* XP Counter */}
        <motion.div
          key={totalXP}"""

new_tutor_header_right = """        <div className="flex items-center gap-2">
          <LanguageToggle compact />
          {/* XP Counter */}
          <motion.div
            key={totalXP}"""

if old_tutor_header_right in it:
    it = it.replace(old_tutor_header_right, new_tutor_header_right)
    # Also close the extra div
    it = it.replace(
        """        </motion.div>
      </div>

      {/* ── Messages ── */}""",
        """        </motion.div>
        </div>
      </div>

      {/* ── Messages ── */}"""
    )
    print("2. LanguageToggle added inside InteractiveTutor header!")

with open('client/src/components/InteractiveTutor.tsx', 'w', encoding='utf-8') as f:
    f.write(it)

print("Bilingual patch applied successfully!")
