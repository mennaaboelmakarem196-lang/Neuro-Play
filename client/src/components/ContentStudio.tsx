/**
 * ContentStudio.tsx â€” Phase A: The Ingestion Hub
 *
 * Drag-and-drop curriculum upload + configuration panel for NeuroPlay AI.
 * Adheres strictly to the NeuroPlay design system:
 *   Background  : #0F172A  (Space Navy)
 *   Accent Cyan : #00E5FF  (Electric Cyan)
 *   Accent Purple: #7C4DFF (Playful Purple)
 *   Reward Lime : #AEEA00  (Energetic Lime)
 *   Fonts       : Comfortaa (body), Poppins (headings)
 */

import { useState, useCallback } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";

// â”€â”€â”€ Zod schema for the configuration form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const ContentStudioConfigSchema = z.object({
  learningStyle: z.enum([
    "ADHD Socratic",
    "Storytelling",
    "Bullet Points Only",
    "Gamified",
  ]),
  focusTopic: z.string().min(1, "Please enter a topic or chapter name."),
  difficulty: z.enum(["Easy", "Medium", "Boss Level"]),
  files: z
    .array(
      z.object({
        name: z.string(),
        size: z.number(),
        type: z.string(),
        /** base64-encoded data URI â€” populated client-side before submission */
        dataUri: z.string().optional(),
      })
    )
    .min(0),
});

export type ContentStudioConfig = z.infer<typeof ContentStudioConfigSchema>;

// â”€â”€â”€ Props â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface ContentStudioProps {
  /** Called when the user submits the form; transitions app to Tutor phase. */
  onLaunch: (config: ContentStudioConfig) => void;
}

// â”€â”€â”€ Accepted MIME types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ACCEPTED_TYPES: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/x-pdf": [".pdf"],
  "application/acrobat": [".pdf"],
  "applications/vnd.pdf": [".pdf"],
  "text/pdf": [".pdf"],
  "text/plain": [".txt"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/msword": [".doc"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
};

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

// â”€â”€â”€ Difficulty options â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const DIFFICULTY_OPTIONS: Array<{
  value: ContentStudioConfig["difficulty"];
  label: string;
  emoji: string;
  color: string;
  glow: string;
}> = [
  {
    value: "Easy",
    label: "Easy",
    emoji: "ðŸŒ±",
    color: "#AEEA00",
    glow: "rgba(174,234,0,0.35)",
  },
  {
    value: "Medium",
    label: "Medium",
    emoji: "âš¡",
    color: "#00E5FF",
    glow: "rgba(0,229,255,0.35)",
  },
  {
    value: "Boss Level",
    label: "Boss Level",
    emoji: "ðŸ”¥",
    color: "#7C4DFF",
    glow: "rgba(124,77,255,0.35)",
  },
];

// â”€â”€â”€ Learning style options â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const LEARNING_STYLES: ContentStudioConfig["learningStyle"][] = [
  "ADHD Socratic",
  "Storytelling",
  "Bullet Points Only",
  "Gamified",
];

const LEARNING_STYLE_META: Record<
  ContentStudioConfig["learningStyle"],
  { emoji: string; hint: string }
> = {
  "ADHD Socratic": {
    emoji: "ðŸ§ ",
    hint: "Short questions, one at a time â€” keeps focus sharp.",
  },
  Storytelling: {
    emoji: "ðŸ“–",
    hint: "Concepts wrapped in a fun space adventure story.",
  },
  "Bullet Points Only": {
    emoji: "ðŸ“‹",
    hint: "Ultra-clean facts, no fluff, easy to scan.",
  },
  Gamified: {
    emoji: "ðŸŽ®",
    hint: "XP, badges, and boss battles for every concept.",
  },
};

// â”€â”€â”€ File icon helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function fileIcon(mime: string): string {
  if (mime === "application/pdf") return "ðŸ“„";
  if (mime.startsWith("image/")) return "ðŸ–¼ï¸";
  if (mime.includes("word")) return "ðŸ“";
  if (mime === "text/plain") return "ðŸ“ƒ";
  return "ðŸ“Ž";
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// â”€â”€â”€ Starfield background particles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const STAR_SEEDS = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  x: ((i * 37 + 11) % 97) + 1.5,
  y: ((i * 53 + 7) % 93) + 2,
  size: ((i * 13) % 3) + 1,
  delay: ((i * 0.17) % 3).toFixed(2),
  dur: (((i * 0.23) % 2) + 1.5).toFixed(2),
  color: ["#00E5FF", "#7C4DFF", "#AEEA00", "#ffffff"][i % 4],
}));

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function ContentStudio({ onLaunch }: ContentStudioProps) {
  // Form state
  const [learningStyle, setLearningStyle] =
    useState<ContentStudioConfig["learningStyle"]>("ADHD Socratic");
  const [focusTopic, setFocusTopic] = useState("");
  const [difficulty, setDifficulty] =
    useState<ContentStudioConfig["difficulty"]>("Easy");
  const [files, setFiles] = useState<File[]>([]);
  const [rejections, setRejections] = useState<FileRejection[]>([]);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [isLaunching, setIsLaunching] = useState(false);
  const [topicFocused, setTopicFocused] = useState(false);

  // â”€â”€ Dropzone â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      const salvaged: File[] = [];
      const stillRejected: FileRejection[] = [];

      for (const rej of rejected) {
        const name = rej.file.name.toLowerCase();
        if (name.endsWith(".pdf") || name.endsWith(".txt") || name.endsWith(".docx")) {
          salvaged.push(rej.file);
        } else {
          stillRejected.push(rej);
        }
      }

      const allAccepted = [...accepted, ...salvaged];

      setFiles((prev) => {
        const existingNames = new Set(prev.map((f) => f.name));
        const fresh = allAccepted.filter((f) => !existingNames.has(f.name));
        return [...prev, ...fresh];
      });

      if (allAccepted.length > 0) {
        const cleanName = allAccepted[0].name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ");
        setFocusTopic((curr) => (curr.trim() && !curr.toLowerCase().includes("solar") ? curr : cleanName));
        setErrors({});
      }

      setRejections(stillRejected);
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept: ACCEPTED_TYPES,
      maxSize: MAX_FILE_SIZE,
      multiple: true,
    });

  const removeFile = (name: string) =>
    setFiles((prev) => prev.filter((f) => f.name !== name));

  // â”€â”€ Validation & submit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const validate = (): boolean => {
    const errs: Partial<Record<string, string>> = {};
    const effectiveTopic = focusTopic.trim() || (files[0] ? files[0].name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ") : "");
    if (!effectiveTopic) {
      errs.focusTopic = "يرجى كتابة اسم الموضوع أو اختيار ملف PDF.";
    } else if (!focusTopic.trim()) {
      setFocusTopic(effectiveTopic);
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLaunch = async () => {
    if (!validate()) return;
    setIsLaunching(true);

    // Convert files to lightweight metadata (dataUri for small files only)
    const fileMeta = await Promise.all(
      files.map(
        (f) =>
          new Promise<ContentStudioConfig["files"][number]>((resolve) => {
            if (f.size <= MAX_FILE_SIZE) {
              const reader = new FileReader();
              reader.onload = () =>
                resolve({
                  name: f.name,
                  size: f.size,
                  type: f.type,
                  dataUri: reader.result as string,
                });
              reader.onerror = () =>
                resolve({ name: f.name, size: f.size, type: f.type });
              reader.readAsDataURL(f);
            } else {
              resolve({ name: f.name, size: f.size, type: f.type });
            }
          })
      )
    );

    const config: ContentStudioConfig = {
      learningStyle,
      focusTopic: focusTopic.trim(),
      difficulty,
      files: fileMeta,
    };

    // Brief pulse before transitioning
    setTimeout(() => {
      setIsLaunching(false);
      onLaunch(config);
    }, 900);
  };

  // â”€â”€ Derived UI state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const dropBorderColor = isDragReject
    ? "#ff4444"
    : isDragActive
    ? "#AEEA00"
    : files.length > 0
    ? "#00E5FF"
    : "rgba(0,229,255,0.25)";

  const dropGlow = isDragReject
    ? "0 0 30px rgba(255,68,68,0.5)"
    : isDragActive
    ? "0 0 40px rgba(174,234,0,0.5), 0 0 80px rgba(174,234,0,0.2)"
    : files.length > 0
    ? "0 0 20px rgba(0,229,255,0.25)"
    : "none";

  const dropBg = isDragActive
    ? "rgba(174,234,0,0.06)"
    : isDragReject
    ? "rgba(255,68,68,0.06)"
    : "rgba(30,41,59,0.6)";

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <div
      className="min-h-screen star-field flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden"
      style={{ background: "#0F172A" }}
    >
      {/* â”€â”€ Starfield particles â”€â”€ */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {STAR_SEEDS.map((s) => (
          <div
            key={s.id}
            className="absolute rounded-full animate-twinkle"
            style={{
              width: s.size + "px",
              height: s.size + "px",
              backgroundColor: s.color,
              left: s.x + "%",
              top: s.y + "%",
              animationDelay: s.delay + "s",
              animationDuration: s.dur + "s",
              opacity: 0.6,
            }}
          />
        ))}
      </div>

      {/* â”€â”€ Ambient glow orbs â”€â”€ */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 500,
          height: 500,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(124,77,255,0.08) 0%, transparent 70%)",
          top: "-10%",
          right: "-10%",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: 400,
          height: 400,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(0,229,255,0.07) 0%, transparent 70%)",
          bottom: "-8%",
          left: "-8%",
        }}
      />

      {/* â”€â”€ Main card â”€â”€ */}
      <motion.div
        initial={{ opacity: 0, y: 36 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-10 w-full max-w-2xl flex flex-col gap-6"
      >
        {/* Header */}
        <div className="text-center flex flex-col items-center gap-2">
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            className="text-5xl mb-1"
          >
            ðŸ›¸
          </motion.div>
          <h1
            className="text-3xl sm:text-4xl font-black text-glow-cyan"
            style={{
              fontFamily: "'Poppins', sans-serif",
              color: "#00E5FF",
              letterSpacing: "-0.02em",
            }}
          >
            Content Studio
          </h1>
          <p
            className="text-base sm:text-lg font-semibold"
            style={{
              fontFamily: "'Comfortaa', sans-serif",
              color: "#7C4DFF",
            }}
          >
            Upload your curriculum &amp; configure your Space Tutor ðŸš€
          </p>
        </div>

        {/* â”€â”€ Upload Zone â”€â”€ */}
        <motion.section
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          aria-label="File upload zone"
        >
          <div
            {...getRootProps()}
            className="rounded-3xl p-6 sm:p-8 flex flex-col items-center gap-4 cursor-pointer transition-all duration-300 outline-none"
            style={{
              background: dropBg,
              border: `2px dashed ${dropBorderColor}`,
              boxShadow: dropGlow,
              minHeight: 180,
              justifyContent: "center",
            }}
          >
            <input {...getInputProps()} />

            <AnimatePresence mode="wait">
              {isDragActive && !isDragReject ? (
                <motion.div
                  key="drag-active"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex flex-col items-center gap-3 text-center"
                >
                  <span className="text-5xl animate-bounce-in">ðŸŒŒ</span>
                  <p
                    className="text-xl font-black"
                    style={{
                      fontFamily: "'Poppins', sans-serif",
                      color: "#AEEA00",
                    }}
                  >
                    Drop it into orbit!
                  </p>
                </motion.div>
              ) : isDragReject ? (
                <motion.div
                  key="drag-reject"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex flex-col items-center gap-3 text-center"
                >
                  <span className="text-5xl">ðŸš«</span>
                  <p
                    className="text-lg font-bold"
                    style={{
                      fontFamily: "'Comfortaa', sans-serif",
                      color: "#ff4444",
                    }}
                  >
                    Unsupported file type!
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-3 text-center"
                >
                  <motion.span
                    className="text-5xl"
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    ðŸ“¡
                  </motion.span>
                  <div>
                    <p
                      className="text-lg font-bold mb-1"
                      style={{
                        fontFamily: "'Poppins', sans-serif",
                        color: "#E2E8F0",
                      }}
                    >
                      Drag &amp; drop your curriculum here
                    </p>
                    <p
                      className="text-sm"
                      style={{
                        fontFamily: "'Comfortaa', sans-serif",
                        color: "#64748B",
                      }}
                    >
                      or{" "}
                      <span
                        className="font-bold underline underline-offset-2"
                        style={{ color: "#00E5FF" }}
                      >
                        click to browse
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center mt-1">
                    {["PDF", "TXT", "DOCX", "PNG", "JPG"].map((ext) => (
                      <span
                        key={ext}
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: "rgba(0,229,255,0.1)",
                          border: "1px solid rgba(0,229,255,0.3)",
                          color: "#00E5FF",
                          fontFamily: "'Comfortaa', sans-serif",
                        }}
                      >
                        .{ext.toLowerCase()}
                      </span>
                    ))}
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(124,77,255,0.1)",
                        border: "1px solid rgba(124,77,255,0.3)",
                        color: "#7C4DFF",
                        fontFamily: "'Comfortaa', sans-serif",
                      }}
                    >
                      max 20 MB
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Rejection errors */}
          <AnimatePresence>
            {rejections.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mt-2 px-4 py-2 rounded-2xl text-sm font-bold"
                style={{
                  background: "rgba(255,68,68,0.1)",
                  border: "1px solid rgba(255,68,68,0.4)",
                  color: "#ff6b6b",
                  fontFamily: "'Comfortaa', sans-serif",
                }}
              >
                {rejections.map((r) => (
                  <p key={r.file.name}>
                    âš ï¸ {r.file.name}:{" "}
                    {r.errors.map((e) => e.message).join(", ")}
                  </p>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Instant Launch Action when File is Uploaded */}
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-3 p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3"
              style={{
                background: "linear-gradient(135deg, rgba(0,229,255,0.15), rgba(124,77,255,0.15))",
                border: "2px solid #00E5FF",
                boxShadow: "0 0 25px rgba(0,229,255,0.25)",
              }}
            >
              <div className="flex items-center gap-2 text-center sm:text-right">
                <span className="text-2xl">📄</span>
                <div>
                  <p className="text-sm font-black text-white">
                    تم استلام الملف: {files[0].name}
                  </p>
                  <p className="text-xs text-cyan-300">
                    جاهز للتحليل والشرح فوراً مع نوفا!
                  </p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLaunch}
                disabled={isLaunching}
                className="px-5 py-2.5 rounded-xl font-black text-sm transition-all"
                style={{
                  background: "linear-gradient(135deg, #00E5FF, #7C4DFF)",
                  color: "#0F172A",
                  cursor: isLaunching ? "not-allowed" : "pointer",
                  border: "none",
                }}
              >
                {isLaunching ? "جاري التحليل... ⏳" : "🚀 ابدأ الشرح الآن مع نوفا!"}
              </motion.button>
            </motion.div>
          )}

          {/* Accepted file list */}
          <AnimatePresence>
            {files.length > 0 && (
              <motion.ul
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 flex flex-col gap-2 overflow-hidden"
              >
                {files.map((f) => (
                  <motion.li
                    key={f.name}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    className="flex items-center justify-between gap-3 px-4 py-2 rounded-2xl"
                    style={{
                      background: "rgba(30,41,59,0.8)",
                      border: "1px solid rgba(0,229,255,0.2)",
                    }}
                  >
                    <span className="text-xl flex-shrink-0">
                      {fileIcon(f.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-bold truncate"
                        style={{
                          fontFamily: "'Comfortaa', sans-serif",
                          color: "#E2E8F0",
                        }}
                      >
                        {f.name}
                      </p>
                      <p
                        className="text-xs"
                        style={{
                          fontFamily: "'Comfortaa', sans-serif",
                          color: "#64748B",
                        }}
                      >
                        {humanSize(f.size)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(f.name);
                      }}
                      aria-label={`Remove ${f.name}`}
                      className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-black transition-all duration-150"
                      style={{
                        background: "rgba(255,68,68,0.15)",
                        border: "1px solid rgba(255,68,68,0.35)",
                        color: "#ff6b6b",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background =
                          "rgba(255,68,68,0.35)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background =
                          "rgba(255,68,68,0.15)";
                      }}
                    >
                      âœ•
                    </button>
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </motion.section>

        {/* â”€â”€ Configuration Panel â”€â”€ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.55 }}
          className="rounded-3xl p-5 sm:p-6 flex flex-col gap-5"
          style={{
            background: "rgba(30,41,59,0.85)",
            border: "1px solid rgba(124,77,255,0.25)",
            boxShadow: "0 0 40px rgba(124,77,255,0.07)",
          }}
          aria-label="Configuration panel"
        >
          <h2
            className="text-base font-black flex items-center gap-2"
            style={{
              fontFamily: "'Poppins', sans-serif",
              color: "#7C4DFF",
            }}
          >
            <span>âš™ï¸</span> Mission Configuration
          </h2>

          {/* â”€â”€ Learning Style â”€â”€ */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="learning-style"
              className="text-sm font-bold"
              style={{
                fontFamily: "'Comfortaa', sans-serif",
                color: "#94A3B8",
              }}
            >
              ðŸ§© Learning Style
            </label>
            <div className="relative">
              <select
                id="learning-style"
                value={learningStyle}
                onChange={(e) =>
                  setLearningStyle(
                    e.target.value as ContentStudioConfig["learningStyle"]
                  )
                }
                className="w-full px-4 py-3 rounded-2xl text-sm font-bold appearance-none outline-none transition-all duration-200 cursor-pointer"
                style={{
                  fontFamily: "'Comfortaa', sans-serif",
                  background: "rgba(15,23,42,0.9)",
                  border: "2px solid rgba(124,77,255,0.45)",
                  color: "#E2E8F0",
                  paddingRight: "2.5rem",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.border =
                    "2px solid #7C4DFF";
                  e.currentTarget.style.boxShadow =
                    "0 0 20px rgba(124,77,255,0.4)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.border =
                    "2px solid rgba(124,77,255,0.45)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {LEARNING_STYLES.map((s) => (
                  <option
                    key={s}
                    value={s}
                    style={{ background: "#1E293B", color: "#E2E8F0" }}
                  >
                    {LEARNING_STYLE_META[s].emoji} {s}
                  </option>
                ))}
              </select>
              {/* Custom chevron */}
              <span
                className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-xs"
                style={{ color: "#7C4DFF" }}
              >
                â–¼
              </span>
            </div>
            {/* Hint */}
            <AnimatePresence mode="wait">
              <motion.p
                key={learningStyle}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="text-xs px-3 py-1.5 rounded-xl"
                style={{
                  fontFamily: "'Comfortaa', sans-serif",
                  color: "#64748B",
                  background: "rgba(124,77,255,0.07)",
                  border: "1px solid rgba(124,77,255,0.15)",
                }}
              >
                {LEARNING_STYLE_META[learningStyle].hint}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* â”€â”€ Focus Topic â”€â”€ */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="focus-topic"
              className="text-sm font-bold"
              style={{
                fontFamily: "'Comfortaa', sans-serif",
                color: "#94A3B8",
              }}
            >
              ðŸ”­ Focus Topic / Chapter
            </label>
            <input
              id="focus-topic"
              type="text"
              value={focusTopic}
              onChange={(e) => {
                setFocusTopic(e.target.value);
                if (e.target.value.trim()) {
                  setErrors((prev) => ({ ...prev, focusTopic: undefined }));
                }
              }}
              onFocus={() => setTopicFocused(true)}
              onBlur={() => setTopicFocused(false)}
              placeholder="e.g. The Solar System, Chapter 3 â€” Planets"
              maxLength={120}
              className="w-full px-4 py-3 rounded-2xl text-sm font-bold outline-none transition-all duration-200"
              style={{
                fontFamily: "'Comfortaa', sans-serif",
                background: "rgba(15,23,42,0.9)",
                border: `2px solid ${
                  errors.focusTopic
                    ? "#ff4444"
                    : topicFocused
                    ? "#00E5FF"
                    : "rgba(0,229,255,0.35)"
                }`,
                color: "#E2E8F0",
                boxShadow: topicFocused
                  ? "0 0 20px rgba(0,229,255,0.35)"
                  : "none",
              }}
            />
            <AnimatePresence>
              {errors.focusTopic && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs font-bold"
                  style={{
                    fontFamily: "'Comfortaa', sans-serif",
                    color: "#ff6b6b",
                  }}
                >
                  âš ï¸ {errors.focusTopic}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* â”€â”€ Difficulty Level â”€â”€ */}
          <div className="flex flex-col gap-2">
            <p
              className="text-sm font-bold"
              style={{
                fontFamily: "'Comfortaa', sans-serif",
                color: "#94A3B8",
              }}
            >
              ðŸŽ¯ Difficulty Level
            </p>
            <div
              className="grid grid-cols-3 gap-3"
              role="radiogroup"
              aria-label="Difficulty level"
            >
              {DIFFICULTY_OPTIONS.map((opt) => {
                const isSelected = difficulty === opt.value;
                return (
                  <motion.button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setDifficulty(opt.value)}
                    className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl transition-all duration-200 outline-none"
                    style={{
                      background: isSelected
                        ? `rgba(${
                            opt.value === "Easy"
                              ? "174,234,0"
                              : opt.value === "Medium"
                              ? "0,229,255"
                              : "124,77,255"
                          },0.12)`
                        : "rgba(15,23,42,0.7)",
                      border: `2px solid ${
                        isSelected ? opt.color : "rgba(71,85,105,0.4)"
                      }`,
                      boxShadow: isSelected
                        ? `0 0 18px ${opt.glow}`
                        : "none",
                      cursor: "pointer",
                    }}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <span
                      className="text-xs font-black"
                      style={{
                        fontFamily: "'Comfortaa', sans-serif",
                        color: isSelected ? opt.color : "#64748B",
                      }}
                    >
                      {opt.label}
                    </span>
                    {isSelected && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-xs font-bold"
                        style={{ color: opt.color }}
                      >
                        âœ“
                      </motion.span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.section>

        {/* â”€â”€ Launch CTA â”€â”€ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.5 }}
        >
          <motion.button
            type="button"
            onClick={handleLaunch}
            disabled={isLaunching}
            whileHover={!isLaunching ? { scale: 1.03 } : {}}
            whileTap={!isLaunching ? { scale: 0.97 } : {}}
            className="w-full py-5 rounded-2xl text-xl font-black relative overflow-hidden transition-all duration-200 outline-none"
            style={{
              fontFamily: "'Poppins', sans-serif",
              background: isLaunching
                ? "linear-gradient(135deg, #1E293B, #334155)"
                : "linear-gradient(135deg, #00E5FF 0%, #7C4DFF 60%, #AEEA00 100%)",
              color: isLaunching ? "#64748B" : "#0F172A",
              boxShadow: isLaunching
                ? "none"
                : "0 0 35px rgba(0,229,255,0.45), 0 0 70px rgba(124,77,255,0.2), 0 4px 20px rgba(0,0,0,0.4)",
              border: "none",
              cursor: isLaunching ? "not-allowed" : "pointer",
              letterSpacing: "-0.01em",
            }}
            aria-label="Launch Space Tutor"
          >
            {/* Shimmer overlay */}
            {!isLaunching && (
              <motion.span
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)",
                  backgroundSize: "200% 100%",
                }}
                animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "linear",
                  repeatDelay: 1.2,
                }}
              />
            )}

            {isLaunching ? (
              <span className="flex items-center justify-center gap-3">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                  className="inline-block"
                >
                  ðŸ›¸
                </motion.span>
                Launchingâ€¦
              </span>
            ) : (
              <span className="relative z-10">Launch Space Tutor ðŸš€</span>
            )}
          </motion.button>

          {/* Sub-hint */}
          <p
            className="text-center text-xs mt-3"
            style={{
              fontFamily: "'Comfortaa', sans-serif",
              color: "#334155",
            }}
          >
            Files are optional â€” the tutor can work from your topic alone âœ¨
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}

