# 🚀 NeuroPlay AI — FocusArcade & Solar System Lab

<p align="center">
  <b>منصة تعليمية ذكية وتفاعلية لتعزيز التركيز والتعلم التكيفي للأطفال والطلاب</b><br>
  <i>An adaptive, AI-powered interactive learning & cognitive training platform featuring gamified education, real-time AI tutoring, and comprehensive performance analytics.</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-7-purple?style=for-the-badge&logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Express-Node.js-green?style=for-the-badge&logo=express" alt="Express" />
  <img src="https://img.shields.io/badge/Drizzle-ORM-orange?style=for-the-badge&logo=drizzle" alt="Drizzle" />
  <img src="https://img.shields.io/badge/Database-MySQL%20%2F%20TiDB-blue?style=for-the-badge&logo=mysql" alt="MySQL" />
  <img src="https://img.shields.io/badge/Deploy-Render.com-black?style=for-the-badge&logo=render" alt="Render" />
</p>

---

## 🌟 Key Features | أهم مميزات المشروع

- **Interactive AI Tutor (Nova)**: مساعد ذكي تفاعلي بالصوت والنص يدعم اللغتين العربية والإنجليزية لمرافقة الطالب خطوة بخطوة.
- **FocusArcade & Solar System Lab**: بيئة تدريب معرفي وتلعيب تعليمي (Gamification) لتعزيز التركيز وتطوير المهارات الذهنية.
- **Assessment Arena**: نظام تقييم واختبارات ديناميكية تقيس مستوى الفهم والاستيعاب وتقدم ملاحظات فورية.
- **Content Studio & Frictionless Upload**: استوديو رفع المناهج والملفات التعليمية (PDFs والمستندات) مع التلخيص الذكي وتوليد الأنشطة.
- **Role-Based Portals (RBAC)**: بوابات مخصصة لكل من الطلاب، المعلمين (Teacher Portal)، وأولياء الأمور (Parent Portal) لمتابعة التطور ومؤشرات الأداء.
- **Enterprise-Ready Integrations**: دعم المزامنة مع Google Sheets وGoogle Calendar، وتخزين سحابي للوسائط.

---

## 🛠️ Tech Stack | التقنيات المستخدمة

### Frontend
- **Framework:** React 19, Vite 7, TypeScript
- **Styling & UI:** Tailwind CSS, Radix UI Primitives, Lucide Icons, Framer Motion
- **State & Data Fetching:** TanStack React Query v5, tRPC Client, Wouter (Routing)
- **Visuals & Charts:** Recharts, Canvas Confetti, Streamdown (Markdown)

### Backend & Database
- **Runtime:** Node.js (v18+ or v20+)
- **Server:** Express 4 with tRPC API Layer
- **ORM & Database:** Drizzle ORM with MySQL2 (Fully compatible with TiDB Cloud Serverless)
- **Security & Session:** Jose (JWT Cookies), secure HTTP-only sessions, zero hardcoded secrets

---

## 📁 Project Architecture | هيكل المشروع

```text
Neuro-Play/
├── client/                     # Frontend Application (React 19 + Vite)
│   ├── src/
│   │   ├── components/         # AssessmentArena, InteractiveTutor, ContentStudio, etc.
│   │   ├── pages/              # NeuroPlayHub, Portals, Dashboard
│   │   ├── contexts/           # Authentication & Theme Providers
│   │   └── lib/                # tRPC client, game logic, test suites
├── server/                     # Backend Application (Express + tRPC)
│   ├── _core/                  # Core runtime, auth cookies, context, LLM helpers
│   ├── routers/                # API routers (admin, files, parent, teacher, rbac)
│   ├── ai.ts                   # Gemini & AI Prompt engineering engine
│   ├── db.ts                   # Drizzle database connection & queries
│   └── tutorStream.ts          # Real-time streaming tutor endpoint
├── drizzle/                    # Database schema definitions and migrations
├── scripts/                    # Automation and maintenance scripts
├── requirements.txt            # Dependency manifest & environment specs
├── .env.example                # Environment variables template
└── package.json                # Project dependencies and run scripts
```

---

## 🚀 Quick Start | التشغيل السريع محلياً

### 1. المتطلبات الأولية (Prerequisites)
- [Node.js](https://nodejs.org/) الإصدار 18 أو 20+
- مدير الحزم `pnpm` أو `npm`

### 2. تثبيت الحزم (Installation)
```bash
# استخدام pnpm (الموصى به)
pnpm install

# أو استخدام npm
npm install
```

### 3. إعداد المتغيرات البيئية (Environment Setup)
انسخ ملف `.env.example` إلى `.env` وقم بملء البيانات الخاصة بك:
```bash
cp .env.example .env
```
محتوى ملف `.env` الأساسي:
```env
NODE_ENV=development
PORT=3000
JWT_SECRET=your_secure_random_jwt_secret
DATABASE_URL=mysql://username:password@gateway.tidbcloud.com:4000/neuroplay?ssl={"rejectUnauthorized":true}
```

### 4. بدء تشغيل الخادم (Run Server)
```bash
# تشغيل خادم التطوير مع المراقبة الحية
pnpm run dev

# أو عبر سكربت التشغيل السريع في ويندوز
run.bat
```
افتح المتصفح على: `http://localhost:3000`

---

## ☁️ Free Cloud Deployment | النشر المجاني على Render.com

يمكنك نشر المشروع كاملاً مجاناً بنقرة واحدة عبر [Render.com](https://render.com):

1. **قاعدة البيانات**: أنشئ حساباً مجانياً على [TiDB Cloud](https://tidbcloud.com/) للحصول على قاعدة بيانات MySQL Serverless مجانية وانسخ رابط الـ `DATABASE_URL`.
2. **إنشاء خدمة ويب (Web Service)** في Render:
   - اربط مستودع GitHub هذا.
   - **Environment:** `Node`
   - **Build Command:** `pnpm install && pnpm run build` *(أو `npm install && npm run build`)*
   - **Start Command:** `pnpm run start` *(أو `node dist/index.js`)*
3. **المتغيرات البيئية (Environment Variables)** في Render:
   - `DATABASE_URL`: رابط الاتصال بقاعدة البيانات.
   - `JWT_SECRET`: قيمة سرية مشفرة من اختيارك.
   - `NODE_ENV`: `production`

---

## 🔒 Security & Privacy | الأمان والخصوصية

- تم فحص الكود بالكامل والتأكد من خلوه تماماً من أي مفاتيح API أو أسرار برمجية مكتوبة مباشرة داخل الكود (Hardcoded Secrets).
- تعتمد جميع الاتصالات والمصادقات على المتغيرات البيئية (`process.env`).
- تم تضمين ملفات `.env` ومجلدات الـ build و `node_modules` داخل `.gitignore` لمنع تسريب أي بيانات اعتماد.

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
