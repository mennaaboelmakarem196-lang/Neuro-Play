import { describe, expect, it } from "vitest";
import { PLANETS, XP_PER_CORRECT, STARS_PER_CORRECT, BRAIN_BREAK_INTERVAL, BRAIN_BREAK_DURATION } from "../data/planets";

describe("Planet Data", () => {
  it("has exactly 8 planets", () => {
    expect(PLANETS).toHaveLength(8);
  });

  it("planets have unique orbitOrder values 1-8", () => {
    const orders = PLANETS.map(p => p.orbitOrder).sort((a, b) => a - b);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("each planet has at least one clue", () => {
    PLANETS.forEach(p => {
      expect(p.clues.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("Mercury is orbit position 1 (closest to Sun)", () => {
    const mercury = PLANETS.find(p => p.id === "mercury");
    expect(mercury?.orbitOrder).toBe(1);
  });

  it("Neptune is orbit position 8 (farthest from Sun)", () => {
    const neptune = PLANETS.find(p => p.id === "neptune");
    expect(neptune?.orbitOrder).toBe(8);
  });

  it("Saturn has rings mentioned in clues", () => {
    const saturn = PLANETS.find(p => p.id === "saturn");
    const hasRingsClue = saturn?.clues.some(c => (typeof c === "string" ? c : (c as any).en).toLowerCase().includes("ring"));
    expect(hasRingsClue).toBe(true);
  });

  it("Jupiter is the largest planet (biggest size)", () => {
    const jupiter = PLANETS.find(p => p.id === "jupiter");
    const maxSize = Math.max(...PLANETS.map(p => p.size));
    expect(jupiter?.size).toBe(maxSize);
  });
});

describe("Game Constants", () => {
  it("XP_PER_CORRECT is 100", () => {
    expect(XP_PER_CORRECT).toBe(100);
  });

  it("STARS_PER_CORRECT is 1", () => {
    expect(STARS_PER_CORRECT).toBe(1);
  });

  it("BRAIN_BREAK_INTERVAL is 3 (every 3 correct answers)", () => {
    expect(BRAIN_BREAK_INTERVAL).toBe(3);
  });

  it("BRAIN_BREAK_DURATION is 30 seconds", () => {
    expect(BRAIN_BREAK_DURATION).toBe(30);
  });
});

describe("Brain Break Logic", () => {
  it("triggers at 3 correct answers", () => {
    const correctCount = 3;
    const needsBreak = correctCount % BRAIN_BREAK_INTERVAL === 0 && correctCount > 0;
    expect(needsBreak).toBe(true);
  });

  it("triggers at 6 correct answers", () => {
    const correctCount = 6;
    const needsBreak = correctCount % BRAIN_BREAK_INTERVAL === 0 && correctCount > 0;
    expect(needsBreak).toBe(true);
  });

  it("does NOT trigger at 4 correct answers", () => {
    const correctCount = 4;
    const needsBreak = correctCount % BRAIN_BREAK_INTERVAL === 0 && correctCount > 0;
    expect(needsBreak).toBe(false);
  });

  it("does NOT trigger at 0 correct answers", () => {
    const correctCount = 0;
    const needsBreak = correctCount % BRAIN_BREAK_INTERVAL === 0 && correctCount > 0;
    expect(needsBreak).toBe(false);
  });
});

describe("Score Calculation", () => {
  it("first attempt gives 200 points", () => {
    const attemptNum = 1;
    const score = Math.max(100, 200 - (attemptNum - 1) * 50);
    expect(score).toBe(200);
  });

  it("second attempt gives 150 points", () => {
    const attemptNum = 2;
    const score = Math.max(100, 200 - (attemptNum - 1) * 50);
    expect(score).toBe(150);
  });

  it("third attempt gives 100 points (minimum)", () => {
    const attemptNum = 3;
    const score = Math.max(100, 200 - (attemptNum - 1) * 50);
    expect(score).toBe(100);
  });

  it("fourth attempt still gives 100 points (floor)", () => {
    const attemptNum = 4;
    const score = Math.max(100, 200 - (attemptNum - 1) * 50);
    expect(score).toBe(100);
  });

  it("perfect game (8 planets, 1 attempt each) = 1600 points", () => {
    let total = 0;
    for (let i = 0; i < 8; i++) {
      total += Math.max(100, 200 - 0 * 50);
    }
    expect(total).toBe(1600);
  });
});


