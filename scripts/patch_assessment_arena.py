with open('client/src/components/AssessmentArena.tsx', 'r', encoding='utf-8') as f:
    c = f.read().replace('\r\n', '\n')

old_err = """        onError: () => {
          // Fallback: use hardcoded Solar System questions
          setQuestions(FALLBACK_QUESTIONS);
          setPhase("quiz");
        },"""

new_err = """        onError: () => {
          const isAr = curriculumSummary?.language === "ar" || /[\\u0600-\\u06FF]/.test(config.focusTopic);
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
        },"""

if old_err in c:
    c = c.replace(old_err, new_err)
    with open('client/src/components/AssessmentArena.tsx', 'w', encoding='utf-8') as f:
        f.write(c)
    print('AssessmentArena.tsx updated successfully!')
else:
    print('old_err not found')
