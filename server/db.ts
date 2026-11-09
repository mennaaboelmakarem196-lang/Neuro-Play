import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  gameSessions,
  planetAttempts,
  uploads,
  InsertGameSession,
  InsertPlanetAttempt,
  InsertUpload,
  GameSession,
  PlanetAttempt
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available (in-memory mode)");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── In-Memory Fallback Storage ─────────────────────────────────────────────
const inMemoryGameSessions: GameSession[] = [];
let nextSessionId = 1;
const inMemoryAttempts: PlanetAttempt[] = [];
let nextAttemptId = 1;

// ─── Game Session Helpers ─────────────────────────────────────────────────────

export async function createGameSession(data: InsertGameSession) {
  const db = await getDb();
  if (!db) {
    const id = nextSessionId++;
    const session: any = {
      id,
      studentId: data.studentId,
      studentName: data.studentName ?? "Space Explorer",
      score: data.score ?? 0,
      xp: data.xp ?? 0,
      starsEarned: data.starsEarned ?? 0,
      correctCount: data.correctCount ?? 0,
      totalPlanets: data.totalPlanets ?? 8,
      timeSpentSec: data.timeSpentSec ?? 0,
      attentionDriftCount: data.attentionDriftCount ?? 0,
      completed: data.completed ?? 0,
      completedAt: data.completedAt ?? null,
      createdAt: new Date(),
    };
    inMemoryGameSessions.push(session);
    return id;
  }
  const result = await db.insert(gameSessions).values(data);
  return result[0].insertId as number;
}

export async function updateGameSession(id: number, data: Partial<InsertGameSession>) {
  const db = await getDb();
  if (!db) {
    const session = inMemoryGameSessions.find(s => s.id === id);
    if (session) {
      Object.assign(session, data);
    }
    return;
  }
  await db.update(gameSessions).set(data).where(eq(gameSessions.id, id));
}

export async function getGameSession(id: number) {
  const db = await getDb();
  if (!db) {
    return inMemoryGameSessions.find(s => s.id === id);
  }
  const result = await db.select().from(gameSessions).where(eq(gameSessions.id, id)).limit(1);
  return result[0];
}

export async function getTopSessions(limit = 10) {
  const db = await getDb();
  if (!db) {
    return inMemoryGameSessions.filter(s => s.completed === 1).slice(0, limit);
  }
  return db.select().from(gameSessions)
    .where(eq(gameSessions.completed, 1))
    .limit(limit);
}

export async function recordPlanetAttempt(data: InsertPlanetAttempt) {
  const db = await getDb();
  if (!db) {
    const id = nextAttemptId++;
    const attempt: any = {
      id,
      sessionId: data.sessionId,
      planetName: data.planetName,
      correct: data.correct ?? 0,
      attemptNumber: data.attemptNumber ?? 1,
      xpAwarded: data.xpAwarded ?? 0,
      createdAt: new Date(),
    };
    inMemoryAttempts.push(attempt);
    return id;
  }
  const result = await db.insert(planetAttempts).values(data);
  return result[0].insertId as number;
}

export async function getSessionAttempts(sessionId: number) {
  const db = await getDb();
  if (!db) {
    return inMemoryAttempts.filter(a => a.sessionId === sessionId);
  }
  return db.select().from(planetAttempts).where(eq(planetAttempts.sessionId, sessionId));
}
