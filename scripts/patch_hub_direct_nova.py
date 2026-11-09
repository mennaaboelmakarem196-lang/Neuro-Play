import re

with open('client/src/pages/NeuroPlayHub.tsx', 'r', encoding='utf-8') as f:
    c = f.read().replace('\r\n', '\n')

pattern = r'<div className="w-full max-w-sm space-y-3">.*?<\/motion\.button>\s*<\/div>'

replacement = """<div className="w-full max-w-sm space-y-3">
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

new_c = re.sub(pattern, replacement, c, flags=re.DOTALL)
if new_c != c:
    with open('client/src/pages/NeuroPlayHub.tsx', 'w', encoding='utf-8') as f:
        f.write(new_c)
    print("Regex replacement successful!")
else:
    print("Pattern not matched")
