// @ts-nocheck
/**
 * NeuroPlay AI FocusArcade — Student Portal
 * ==========================================
 * ADHD-optimized gamified landing page for students.
 * Features: XP display, daily missions, streak counter, direct SpaceLab entry.
 *           Bilingual EN/AR toggle, hackathon MVP badge, animated mission CTA.
 * Design: Minimal text, large visual elements, instant dopamine triggers.
 */

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useRbac } from "@/contexts/RbacContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { SpaceLabGame } from "@/components/game/SpaceLabGame";
import { StudentUploadZone } from "@/components/uploads";

type Lang = "en" | "ar";

export default function StudentPortal() {
  const { user, logout } = useRbac();
  const [, navigate] = useLocation();
  const [launchGame, setLaunchGame] = useState(false);
  const { t, isRTL, lang } = useLanguage();

  useEffect(() => {
    const saved = localStorage.getItem("neuroplay-lang") as Lang | null;
    if (saved === "en" || saved === "ar") setLang(saved);
  }, []);

  const toggleLang = () => {
    const next: Lang = lang === "en" ? "ar" : "en";
    setLang(next);
    localStorage.setItem("neuroplay-lang", next);
  };

  if (!user || user.role !== "student") {
    navigate("/login");
    return null;
  }

  if (launchGame) {
    return <SpaceLabGame />;
  }

  const xpPercent = Math.min(100, Math.round(((user.totalXP ?? 0) % 500) / 500 * 100));
  const isRtl = lang === "ar";
  const fontFamily = lang === "ar" ? "'Cairo', 'Almarai', sans-serif" : "'Comfortaa', 'Poppins', sans-serif";

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      style={{
        minHeight: "100vh",
        background: "#0F172A",
        fontFamily,
        padding: "0 0 40px",
        overflowX: "hidden",
      }}
    >
      {/* Top HUD */}
      <div
        style={{
          background: "rgba(30,41,59,0.9)",
          borderBottom: "1px solid rgba(0,229,255,0.15)",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexDirection: isRTL ? "row-reverse" : "row",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexDirection: isRTL ? "row-reverse" : "row" }}>
          <span style={{ fontSize: 28 }}>{user.avatarEmoji}</span>
          <div>
            <div style={{ color: "#00E5FF", fontWeight: 700, fontSize: 14, fontFamily }}>{user.name}</div>
            <div style={{ color: "#64748B", fontSize: 11, fontFamily }}>{user.classroomName}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#AEEA00", fontWeight: 700, fontSize: 16 }}>⚡ <span className="numeric-ltr">{user.totalXP}</span></div>
            <div style={{ color: "#64748B", fontSize: 10, fontFamily }}>{t("student_xp")}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#FFD700", fontWeight: 700, fontSize: 16 }}>⭐ <span className="numeric-ltr">{user.totalStars}</span></div>
            <div style={{ color: "#64748B", fontSize: 10, fontFamily }}>{t("student_badge")}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#FF6B6B", fontWeight: 700, fontSize: 16 }}>🔥 <span className="numeric-ltr">{user.streakDays}</span></div>
            <div style={{ color: "#64748B", fontSize: 10, fontFamily }}>{t("student_streak")}</div>
          </div>
          {/* Language toggle */}
          <button
            onClick={toggleLang}
            aria-label={isRtl ? "Switch to English" : "التبديل إلى العربية"}
            style={{
              background: "rgba(124,77,255,0.1)",
              border: "1px solid rgba(124,77,255,0.3)",
              borderRadius: 100,
              color: "#7C4DFF",
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 10px",
              cursor: "pointer",
              fontFamily: "'Comfortaa', sans-serif",
            }}
          >
            {isRtl ? "🌐 EN" : "🌐 عربي"}
          </button>
          <button
            onClick={logout}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              color: "#64748B",
              fontSize: 11,
              padding: "4px 8px",
              cursor: "pointer",
              fontFamily,
            }}
          >
            {isRtl ? "خروج" : "Exit"}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px" }}>
        {/* XP Level Bar */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: "#94A3B8", fontSize: 12 }}>
              {isRtl ? `المستوى ${Math.floor((user.totalXP ?? 0) / 500) + 1}` : `Level ${Math.floor((user.totalXP ?? 0) / 500) + 1}`}
            </span>
            <span style={{ color: "#AEEA00", fontSize: 12 }}>
              {isRtl ? `${xpPercent}% للمستوى التالي` : `${xpPercent}% to next level`}
            </span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 100, height: 10, overflow: "hidden" }}>
            <div
              style={{
                width: `${xpPercent}%`,
                height: "100%",
                background: isRTL
                  ? "linear-gradient(270deg, #AEEA00, #00E5FF)"
                  : "linear-gradient(90deg, #AEEA00, #00E5FF)",
                borderRadius: 100,
                transition: "width 1s ease",
                boxShadow: "0 0 12px rgba(174,234,0,0.6)",
                marginLeft: isRTL ? "auto" : undefined,
              }}
            />
          </div>
        </div>

        {/* ── Hackathon MVP Badge ──────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(0,229,255,0.08)",
              border: "1.5px solid rgba(0,229,255,0.45)",
              borderRadius: 100,
              padding: "6px 16px",
              animation: "spBadgePulse 2.5s ease-in-out infinite",
            }}
          >
            <span style={{ fontSize: 13 }}>🚀</span>
            <span
              style={{
                color: "#00E5FF",
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                textShadow: "0 0 10px rgba(0,229,255,0.7)",
              }}
            >
              {isRtl ? "MVP نشط للهاكاثون: معمل علوم STEM" : "Active Hackathon MVP: STEM Science Lab"}
            </span>
          </div>
        </div>

        {/* ── Main Mission CTA ─────────────────────────────────────────────────── */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(0,229,255,0.12), rgba(124,77,255,0.12))",
            border: "2px solid rgba(0,229,255,0.3)",
            borderRadius: 24,
            padding: "28px 24px",
            textAlign: "center",
            marginBottom: 20,
            boxShadow: "0 0 40px rgba(0,229,255,0.1)",
            animation: "spCardPulse 3s ease-in-out infinite",
          }}
        >
          <div
            style={{
              fontSize: 56,
              marginBottom: 12,
              display: "inline-block",
              animation: "float 3s ease-in-out infinite",
              filter: "drop-shadow(0 0 12px #00E5FF)",
            }}
          >
            🪐
          </div>

          <h2
            style={{
              color: "#00E5FF",
              fontSize: 22,
              fontWeight: 700,
              margin: "0 0 10px",
              fontFamily: "'Comfortaa', sans-serif",
            }}
          >
            {isRtl ? "معمل المجموعة الشمسية" : "Solar System Lab"}
          </h2>

          {/* Bilingual sub-headline */}
          <p
            style={{
              color: "#94A3B8",
              fontSize: 13,
              margin: "0 0 4px",
              lineHeight: 1.6,
              direction: "ltr",
              opacity: isRtl ? 0.6 : 1,
              transition: "opacity 0.3s ease",
            }}
          >
            <em>
              Transforming complex science curriculums into tactile, drag-and-drop
              micro-quests. Currently exploring:{" "}
              <strong style={{ color: "#00E5FF" }}>The Solar System.</strong>
            </em>
          </p>

          <div
            style={{
              width: 32,
              height: 1.5,
              background: "linear-gradient(90deg, transparent, rgba(124,77,255,0.5), transparent)",
              margin: "8px auto",
              borderRadius: 2,
            }}
          />

          <p
            style={{
              color: "#94A3B8",
              fontSize: 12,
              margin: "0 0 20px",
              lineHeight: 1.7,
              direction: "rtl",
              fontFamily: "'Cairo', 'Comfortaa', sans-serif",
              opacity: isRtl ? 1 : 0.6,
              transition: "opacity 0.3s ease",
            }}
          >
            <em>
              تحويل مناهج العلوم المعقدة إلى تجارب فضاء تفاعلية مخصصة لأدمغة الـ ADHD.{" "}
              الوحدة النشطة:{" "}
              <strong style={{ color: "#00E5FF" }}>معمل المجموعة الشمسية.</strong>
            </em>
          </p>

          <button
            onClick={() => setLaunchGame(true)}
            style={{
              background: "linear-gradient(135deg, #00E5FF, #7C4DFF)",
              border: "none",
              borderRadius: 100,
              color: "#0F172A",
              fontSize: 18,
              fontWeight: 800,
              padding: "16px 40px",
              cursor: "pointer",
              boxShadow: "0 0 30px rgba(0,229,255,0.4)",
              fontFamily,
              transition: "transform 0.15s ease",
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            {isRtl ? "🚀 انطلق للمهمة!" : "🚀 Launch Mission!"}
          </button>
        </div>

        {/* Space Scanner Station — Homework Upload */}
        <StudentUploadZone />

        {/* Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          {[
            { icon: "🎮", labelEn: "Missions Done", labelAr: "المهام المنجزة", value: user.sessionsCompleted ?? 0, color: "#7C4DFF" },
            { icon: "🏆", labelEn: "High Score", labelAr: "أعلى نتيجة", value: user.highScore ?? 0, color: "#FFD700" },
            { icon: "🔥", labelEn: "Day Streak", labelAr: "أيام متتالية", value: isRtl ? `${user.streakDays ?? 0} أيام` : `${user.streakDays ?? 0} days`, color: "#FF6B6B" },
            { icon: "👩‍🏫", labelEn: "Teacher", labelAr: "المعلم", value: user.teacherName ?? "—", color: "#AEEA00" },
          ].map(stat => (
            <div
              key={stat.labelEn}
              style={{
                background: "#1E293B",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 16,
                padding: "16px 14px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 4 }}>{stat.icon}</div>
              <div style={{ color: stat.color, fontWeight: 700, fontSize: 16 }}>{stat.value}</div>
              <div style={{ color: "#64748B", fontSize: 11, marginTop: 2 }}>
                {isRtl ? stat.labelAr : stat.labelEn}
              </div>
            </div>
          ))}
        </div>

        {/* Brain Tip */}
        <div
          style={{
            background: "rgba(174,234,0,0.06)",
            border: "1px solid rgba(174,234,0,0.2)",
            borderRadius: 16,
            padding: "14px 16px",
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            direction: isRtl ? "rtl" : "ltr",
          }}
        >
          <span style={{ fontSize: 20 }}>💡</span>
          <p style={{ color: "#94A3B8", fontSize: 12, margin: 0, lineHeight: 1.6 }}>
            <strong style={{ color: "#AEEA00" }}>
              {isRtl ? "نصيحة الدماغ:" : "Brain Tip:"}
            </strong>{" "}
            {isRtl
              ? "إذا شعرت بالتشتت، انقر على زر استراحة الدماغ أثناء المهمة! يساعدك على التركيز بشكل أفضل. 🧠"
              : "If you feel wiggly, click the Brain Break button during the mission! It helps you focus better. 🧠"}
          </p>
        </div>
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes spBadgePulse {
          0%, 100% { box-shadow: 0 0 16px rgba(0,229,255,0.2); border-color: rgba(0,229,255,0.45); }
          50% { box-shadow: 0 0 28px rgba(0,229,255,0.5); border-color: rgba(0,229,255,0.9); }
        }
        @keyframes spCardPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(0,229,255,0.1); }
          50% { box-shadow: 0 0 40px rgba(0,229,255,0.28); }
        }
      `}</style>
    </div>
  );
}
