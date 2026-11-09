import re
import os

print("Applying PDF tutor improvements...")

# 1. Update NeuroPlayHub.tsx
with open('client/src/pages/NeuroPlayHub.tsx', 'r', encoding='utf-8') as f:
    hub_content = f.read().replace('\r\n', '\n')

old_part = """      // Extract text from files if any
      let rawText: string | undefined;
      if (config.files.length > 0) {
        rawText = config.files
          .filter(f => f.dataUri)
          .map(f => `[File: ${f.name}]`)
          .join("\\n");
      }

      const summary = await processContent.mutateAsync({
        topic: config.focusTopic,
        rawText,
        learningStyle: config.learningStyle,
        difficulty: config.difficulty,
      });"""

new_part = """      // Find PDF file if any
      const pdfFile = config.files.find(
        f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
      );
      const pdfBase64 = pdfFile?.dataUri;

      // Extract text from other files if any
      let rawText: string | undefined;
      const otherFiles = config.files.filter(
        f => !f.name.toLowerCase().endsWith(".pdf") && f.dataUri
      );
      if (otherFiles.length > 0) {
        rawText = otherFiles.map(f => `[File: ${f.name}]`).join("\\n");
      }

      const summary = await processContent.mutateAsync({
        topic: config.focusTopic,
        rawText,
        pdfBase64,
        learningStyle: config.learningStyle,
        difficulty: config.difficulty,
      });"""

if old_part in hub_content:
    hub_content = hub_content.replace(old_part, new_part)
    with open('client/src/pages/NeuroPlayHub.tsx', 'w', encoding='utf-8') as f:
        f.write(hub_content)
    print("1. NeuroPlayHub.tsx updated!")
else:
    print("1. old_part not found in NeuroPlayHub.tsx")

# 2. Update ContentStudio.tsx (file read limit & auto topic from file)
with open('client/src/components/ContentStudio.tsx', 'r', encoding='utf-8') as f:
    cs_content = f.read().replace('\r\n', '\n')

# Replace file size limit for reading dataUri
cs_old_limit = "if (f.size <= 2 * 1024 * 1024) {"
cs_new_limit = "if (f.size <= MAX_FILE_SIZE) {"
if cs_old_limit in cs_content:
    cs_content = cs_content.replace(cs_old_limit, cs_new_limit)
    print("2a. ContentStudio.tsx file size limit expanded!")

# Update onDrop to auto-fill topic from file name
cs_old_drop = """      setFiles((prev) => {
        const existingNames = new Set(prev.map((f) => f.name));
        const fresh = accepted.filter((f) => !existingNames.has(f.name));
        return [...prev, ...fresh];
      });"""

cs_new_drop = """      setFiles((prev) => {
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
      }"""

if cs_old_drop in cs_content:
    cs_content = cs_content.replace(cs_old_drop, cs_new_drop)
    print("2b. ContentStudio.tsx auto-topic enabled!")

with open('client/src/components/ContentStudio.tsx', 'w', encoding='utf-8') as f:
    f.write(cs_content)

print("Patch 1 & 2 done.")
