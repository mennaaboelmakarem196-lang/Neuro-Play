with open('client/src/components/InteractiveTutor.tsx', 'r', encoding='utf-8') as f:
    c = f.read().replace('\r\n', '\n')

old_props = """interface InteractiveTutorProps {
  config: ContentStudioConfig;
  curriculumSummary?: CurriculumSummary;
  onXPEarned?: (xp: number) => void;
  onBrainBreak?: () => void;
  onProceedToQuiz?: () => void;
}"""

new_props = """interface InteractiveTutorProps {
  config: ContentStudioConfig;
  curriculumSummary?: CurriculumSummary;
  onXPEarned?: (xp: number) => void;
  onBrainBreak?: () => void;
  onProceedToQuiz?: () => void;
  onBack?: () => void;
}"""

c = c.replace(old_props, new_props)

old_comp = """export function InteractiveTutor({
  config,
  curriculumSummary,
  onXPEarned,
  onBrainBreak,
  onProceedToQuiz,
}: InteractiveTutorProps) {"""

new_comp = """export function InteractiveTutor({
  config,
  curriculumSummary,
  onXPEarned,
  onBrainBreak,
  onProceedToQuiz,
  onBack,
}: InteractiveTutorProps) {"""

c = c.replace(old_comp, new_comp)

old_header = """        <div className="flex items-center gap-3">
          <motion.div"""

new_header = """        <div className="flex items-center gap-3">
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
          <motion.div"""

c = c.replace(old_header, new_header)

with open('client/src/components/InteractiveTutor.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print("InteractiveTutor.tsx updated with back button!")
