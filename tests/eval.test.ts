import { describe, it, expect } from "vitest";
import { cpToWinrate, winrateToCp, clampCp, CP_RANGE } from "../lib/eval";

describe("cpToWinrate（評価値→勝率）", () => {
  it("評価値0（互角）なら勝率50%", () => {
    expect(cpToWinrate(0)).toBeCloseTo(0.5, 10);
  });
  it("先手有利(+)なら50%より上、後手有利(-)なら下", () => {
    expect(cpToWinrate(300)).toBeGreaterThan(0.5);
    expect(cpToWinrate(-300)).toBeLessThan(0.5);
  });
  it("対称性: cpToWinrate(x) + cpToWinrate(-x) = 1", () => {
    for (const x of [100, 500, 1500, 2000]) {
      expect(cpToWinrate(x) + cpToWinrate(-x)).toBeCloseTo(1, 10);
    }
  });
  it("単調増加（評価が良いほど勝率が高い）", () => {
    let prev = 0;
    for (let cp = -2000; cp <= 2000; cp += 100) {
      const p = cpToWinrate(cp);
      expect(p).toBeGreaterThan(prev);
      prev = p;
    }
  });
  it("巨大な値（詰みスコア）は±2000にクランプされ、0や1にはならない", () => {
    expect(cpToWinrate(99999)).toBe(cpToWinrate(CP_RANGE));
    expect(cpToWinrate(-99999)).toBe(cpToWinrate(-CP_RANGE));
    expect(cpToWinrate(99999)).toBeLessThan(1);
    expect(cpToWinrate(-99999)).toBeGreaterThan(0);
  });
});

describe("winrateToCp（勝率→評価値・逆変換）", () => {
  it("往復変換 cp → 勝率 → cp が元に戻る", () => {
    for (const cp of [-2000, -700, -50, 0, 50, 700, 2000]) {
      expect(winrateToCp(cpToWinrate(cp))).toBeCloseTo(cp, 6);
    }
  });
  it("勝率50%は評価値0", () => {
    expect(winrateToCp(0.5)).toBeCloseTo(0, 10);
  });
  it("0や1など端の勝率でも±2000の範囲で返る（無限大にならない）", () => {
    expect(winrateToCp(0)).toBeGreaterThanOrEqual(-CP_RANGE);
    expect(winrateToCp(1)).toBeLessThanOrEqual(CP_RANGE);
    expect(Number.isFinite(winrateToCp(0))).toBe(true);
    expect(Number.isFinite(winrateToCp(1))).toBe(true);
  });
});

describe("clampCp", () => {
  it("範囲内はそのまま、範囲外は±2000に収める", () => {
    expect(clampCp(123)).toBe(123);
    expect(clampCp(5000)).toBe(2000);
    expect(clampCp(-31111)).toBe(-2000);
  });
});
