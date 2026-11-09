import re

print("Patching ContentStudio.tsx for instant frictionless PDF handling...")

with open('client/src/components/ContentStudio.tsx', 'r', encoding='utf-8') as f:
    cs = f.read().replace('\r\n', '\n')

# 1. Update ACCEPTED_TYPES to be very permissive with PDFs
old_types = """const ACCEPTED_TYPES: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "text/plain": [".txt"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "application/msword": [".doc"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
};"""

new_types = """const ACCEPTED_TYPES: Record<string, string[]> = {
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
};"""

cs = cs.replace(old_types, new_types)

# 2. Update onDrop to salvage any file with .pdf extension and auto-fill topic
old_on_drop = """  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      setFiles((prev) => {
        const existingNames = new Set(prev.map((f) => f.name));
        const fresh = accepted.filter((f) => !existingNames.has(f.name));
        return [...prev, ...fresh];
      });
      if (accepted.length > 0) {
        setFocusTopic((curr) => {
          if (!curr.trim() || curr.toLowerCase().includes("solar")) {
            const cleanName = accepted[0].name.replace(/\\.[^/.]+$/, "").replace(/[-_]+/g, " ");
            return cleanName;
          }
          return curr;
        });
      }
      setRejections(rejected);
      if (rejected.length === 0) {
        setErrors((prev) => ({ ...prev, files: undefined }));
      }
    },
    []
  );"""

new_on_drop = """  const onDrop = useCallback(
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
        const cleanName = allAccepted[0].name.replace(/\\.[^/.]+$/, "").replace(/[-_]+/g, " ");
        setFocusTopic((curr) => (curr.trim() && !curr.toLowerCase().includes("solar") ? curr : cleanName));
        setErrors({});
      }

      setRejections(stillRejected);
    },
    []
  );"""

cs = cs.replace(old_on_drop, new_on_drop)

# 3. Update validate so that having a file is ALWAYS valid even if topic input is empty
old_val = """  const validate = (): boolean => {
    const errs: Partial<Record<string, string>> = {};
    if (!focusTopic.trim()) {
      errs.focusTopic = "Please enter a topic or chapter name.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };"""

new_val = """  const validate = (): boolean => {
    const errs: Partial<Record<string, string>> = {};
    const effectiveTopic = focusTopic.trim() || (files[0] ? files[0].name.replace(/\\.[^/.]+$/, "").replace(/[-_]+/g, " ") : "");
    if (!effectiveTopic) {
      errs.focusTopic = "يرجى كتابة اسم الموضوع أو اختيار ملف PDF.";
    } else if (!focusTopic.trim()) {
      setFocusTopic(effectiveTopic);
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };"""

cs = cs.replace(old_val, new_val)

# 4. Add an instant "🚀 ابدأ الشرح الآن" button right under the dropzone when a file is dropped!
old_file_list = """          {/* Accepted file list */}
          <AnimatePresence>
            {files.length > 0 && (
              <motion.ul"""

new_file_list = """          {/* Instant Launch Action when File is Uploaded */}
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
              <motion.ul"""

cs = cs.replace(old_file_list, new_file_list)

with open('client/src/components/ContentStudio.tsx', 'w', encoding='utf-8') as f:
    f.write(cs)

print("ContentStudio.tsx patched successfully!")
