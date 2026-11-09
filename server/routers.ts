/**
 * routers.ts — NeuroPlay AI tRPC Router
 *
 * Procedures:
 *  system.*          — Core system procedures (from _core)
 *  auth.*            — Authentication
 *  game.*            — SpaceLab game session management
 *  ai.*              — Content processing, quiz generation, audit log retrieval
 *  integrations.*    — Google Sheets, Calendar, Dopamine Report
 *  admin.*           — Mock data seeding, audit dashboard
 */

import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { rbacRouter } from "./routers/rbacRouter";
import { teacherRouter } from "./routers/teacherRouter";
import { parentRouter } from "./routers/parentRouter";
import { adminRouter as rbacAdminRouter } from "./routers/adminRouter";
import { filesRouter } from "./routers/filesRouter";
import { mergeRouters } from "./_core/trpc";
import {
  createGameSession,
  updateGameSession,
  getGameSession,
  getTopSessions,
  recordPlanetAttempt,
} from "./db";
import { processContent, generateQuiz, CurriculumSummarySchema } from "./ai";
import {
  logToGoogleSheets,
  schedulePomodoro,
  fireDopamineReport,
} from "./integrations";
import { getRecentAuditLogs, audit } from "./audit";
import { seedMockStudentData } from "./mockDataSeed";

export const appRouter = router({
  system: systemRouter,
  rbac: rbacRouter,
  teacher: teacherRouter,
  parent: parentRouter,
  files: filesRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  game: router({
    createSession: publicProcedure
      .input(z.object({
        studentId: z.string().default("anonymous"),
        studentName: z.string().default("Space Explorer"),
      }))
      .mutation(async ({ input }) => {
        audit.info("session_lifecycle", "New game session created", {
          studentId: input.studentId,
          studentName: input.studentName,
        });
        const id = await createGameSession({
          studentId: input.studentId,
          studentName: input.studentName,
          score: 0,
          xp: 0,
          starsEarned: 0,
          correctCount: 0,
          totalPlanets: 8,
          timeSpentSec: 0,
          attentionDriftCount: 0,
          completed: 0,
        });
        return { sessionId: id };
      }),

    recordAttempt: publicProcedure
      .input(z.object({
        sessionId: z.number(),
        planetName: z.string(),
        correct: z.boolean(),
        attemptNumber: z.number().default(1),
      }))
      .mutation(async ({ input }) => {
        const xpAwarded = input.correct ? 100 : 0;
        await recordPlanetAttempt({
          sessionId: input.sessionId,
          planetName: input.planetName,
          correct: input.correct ? 1 : 0,
          attemptNumber: input.attemptNumber,
          xpAwarded,
        });
        audit.info("session_lifecycle", "Planet attempt recorded: " + input.planetName, {
          sessionId: input.sessionId,
          correct: input.correct,
          xpAwarded,
        });
        return { xpAwarded };
      }),

    completeSession: publicProcedure
      .input(z.object({
        sessionId: z.number(),
        score: z.number(),
        xp: z.number(),
        starsEarned: z.number(),
        correctCount: z.number(),
        timeSpentSec: z.number(),
        attentionDriftCount: z.number().default(0),
        studentId: z.string().default("anonymous"),
        studentName: z.string().default("Space Explorer"),
        moduleName: z.string().default("Solar System Lab"),
        parentEmail: z.string().email().optional(),
      }))
      .mutation(async ({ input }) => {
        await updateGameSession(input.sessionId, {
          score: input.score,
          xp: input.xp,
          starsEarned: input.starsEarned,
          correctCount: input.correctCount,
          timeSpentSec: input.timeSpentSec,
          attentionDriftCount: input.attentionDriftCount,
          completed: 1,
          completedAt: new Date(),
        });

        audit.success("session_lifecycle", "Game session completed", {
          sessionId: input.sessionId,
          studentId: input.studentId,
          score: input.score,
          xp: input.xp,
          timeSpentSec: input.timeSpentSec,
        });

        const scorePct = (input.correctCount / 8) * 100;

        const [sheetsResult, calendarResult, dopamineResult] = await Promise.allSettled([
          logToGoogleSheets({
            studentId: input.studentId,
            studentName: input.studentName,
            scorePct,
            timeSpentSec: input.timeSpentSec,
            attentionDriftCount: input.attentionDriftCount,
            correctCount: input.correctCount,
            totalPlanets: 8,
            xp: input.xp,
            stars: input.starsEarned,
          }),
          schedulePomodoro({
            studentName: input.studentName,
            parentEmail: input.parentEmail,
            moduleName: input.moduleName,
          }),
          fireDopamineReport({
            studentName: input.studentName,
            moduleName: input.moduleName,
            scorePct,
            xp: input.xp,
            stars: input.starsEarned,
            timeSpentSec: input.timeSpentSec,
            correctCount: input.correctCount,
            totalPlanets: 8,
          }),
        ]);

        return {
          success: true,
          integrations: {
            sheets: sheetsResult.status === "fulfilled" ? sheetsResult.value : { success: false, error: String(sheetsResult.reason) },
            calendar: calendarResult.status === "fulfilled" ? calendarResult.value : { success: false, error: String(calendarResult.reason) },
            dopamineReport: dopamineResult.status === "fulfilled" ? dopamineResult.value : { success: false, error: String(dopamineResult.reason) },
          },
        };
      }),

    getSession: publicProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        return getGameSession(input.sessionId);
      }),

    getLeaderboard: publicProcedure.query(async () => {
      return getTopSessions(10);
    }),
  }),

  ai: router({
    processContent: publicProcedure
      .input(z.object({
        topic: z.string().min(1),
        rawText: z.string().optional(),
pdfBase64: z.string().optional(),
        learningStyle: z.enum(["ADHD Socratic", "Storytelling", "Bullet Points Only", "Gamified"]),
        difficulty: z.enum(["Easy", "Medium", "Boss Level"]),
      }))
      .mutation(async ({ input }) => {
        return processContent(input);
      }),

    generateQuiz: publicProcedure
      .input(z.object({
        topic: z.string().min(1),
        curriculumSummary: CurriculumSummarySchema.optional(),
        difficulty: z.enum(["Easy", "Medium", "Boss Level"]),
        questionCount: z.number().min(3).max(10).default(5),
      }))
      .mutation(async ({ input }) => {
        return generateQuiz(input);
      }),

    getAuditLogs: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(200).default(50) }))
      .query(({ input }) => {
        return getRecentAuditLogs(input.limit);
      }),
  }),

  integrations: router({
    logFocusMetrics: publicProcedure
      .input(z.object({
        studentId: z.string(),
        studentName: z.string(),
        scorePct: z.number(),
        timeSpentSec: z.number(),
        attentionDriftCount: z.number(),
        correctCount: z.number(),
        totalPlanets: z.number().default(8),
        xp: z.number(),
        stars: z.number(),
      }))
      .mutation(async ({ input }) => {
        return logToGoogleSheets(input);
      }),

    schedulePomodoro: publicProcedure
      .input(z.object({
        studentName: z.string(),
        parentEmail: z.string().email().optional(),
        moduleName: z.string(),
        startTime: z.string().datetime().optional(),
      }))
      .mutation(async ({ input }) => {
        return schedulePomodoro({
          ...input,
          startTime: input.startTime ? new Date(input.startTime) : undefined,
        });
      }),

    fireDopamineReport: publicProcedure
      .input(z.object({
        studentName: z.string(),
        moduleName: z.string(),
        scorePct: z.number(),
        xp: z.number(),
        stars: z.number(),
        timeSpentSec: z.number(),
        correctCount: z.number(),
        totalPlanets: z.number().default(8),
      }))
      .mutation(async ({ input }) => {
        return fireDopamineReport(input);
      }),
  }),

  admin: mergeRouters(
    rbacAdminRouter,
    router({
      seedMockData: publicProcedure.mutation(async () => {
        audit.info("mock_data", "Admin triggered mock data seed");
        return seedMockStudentData();
      }),

      getAuditSummary: publicProcedure.query(() => {
        const logs = getRecentAuditLogs(200);
        const summary = {
          totalEvents: logs.length,
          byCategory: {} as Record<string, number>,
          byLevel: {} as Record<string, number>,
          recentErrors: logs.filter(l => l.level === "ERROR").slice(-5),
          successRate: 0,
        };

        for (const log of logs) {
          summary.byCategory[log.category] = (summary.byCategory[log.category] ?? 0) + 1;
          summary.byLevel[log.level] = (summary.byLevel[log.level] ?? 0) + 1;
        }

        const successes = summary.byLevel["SUCCESS"] ?? 0;
        const errors = summary.byLevel["ERROR"] ?? 0;
        const total = successes + errors;
        summary.successRate = total > 0 ? Math.round((successes / total) * 100) : 100;

        return summary;
      }),
    }),
  ),
});

export type AppRouter = typeof appRouter;


