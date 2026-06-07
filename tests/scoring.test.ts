import { describe, it, expect } from "vitest";
import { cpToWinrate } from "../lib/eval";
import {
  evenWeight,
  scoreGuess,
  weightedScore,
  meanAbsError,
  bestStreak,
  signedBias,
  biasLabel,
  EVEN_W_MIN,
} from "../lib/scoring";

describe("evenWeight（互角加重）", () => {
  it("互角(cp=0)で重み1.0", () => {
    expect(evenWeight(0)).toBeCloseTo(1.0, 10);
  });
  it("大差になるほど重みが下がり、最小値0.3に近づく", () => {
    expect(evenWeight(2000)).toBeGreaterThanOrEqual(EVEN_W_MIN);
    expect(evenWeight(2000)).toBeLessThan(0.31);
  });
  it("|cp|について単調減少・左右対称", () => {
    let prev = evenWeight(0);
    for (let cp = 100; cp <= 2000; cp += 100) {
      const w = evenWeight(cp);
      expect(w).toBeLessThan(prev);
      expect(evenWeight(-cp)).toBeCloseTo(w, 10);
      prev = w;
    }
  });
  it("互角帯(300)は大差(1200)よりはっきり重い", () => {
    expect(evenWeight(300)).toBeGreaterThan(evenWeight(1200) * 1.5);
  });
});

describe("scoreGuess（1問の採点）", () => {
  it("ピタリ当てたら誤差0", () => {
    const s = scoreGuess(cpToWinrate(250), 250);
    expect(s.absError).toBeCloseTo(0, 10);
    expect(s.signedError).toBeCloseTo(0, 10);
  });
  it("先手を高く見すぎたら signedError が＋", () => {
    const s = scoreGuess(0.8, 0); // 実際は互角(50%)なのに80%と予測
    expect(s.signedError).toBeCloseTo(0.3, 10);
    expect(s.absError).toBeCloseTo(0.3, 10);
  });
  it("先手を低く見すぎたら signedError が−", () => {
    const s = scoreGuess(0.2, 0);
    expect(s.signedError).toBeCloseTo(-0.3, 10);
  });
});

describe("weightedScore（加重スコア0-100）", () => {
  it("全問ピタリなら100点", () => {
    expect(weightedScore([{ absError: 0, weight: 1 }, { absError: 0, weight: 0.5 }])).toBe(100);
  });
  it("誤差50pt（50%ぶん外し）なら0点", () => {
    expect(weightedScore([{ absError: 0.5, weight: 1 }])).toBe(0);
  });
  it("互角局面の誤差は大差局面の同じ誤差よりスコアを強く下げる", () => {
    // 互角(重み1.0)で誤差0.2 + 大差(重み0.3)でピタリ
    const evenMiss = weightedScore([
      { absError: 0.2, weight: evenWeight(0) },
      { absError: 0, weight: evenWeight(1800) },
    ]);
    // 大差(重み0.3)で誤差0.2 + 互角(重み1.0)でピタリ
    const bigMiss = weightedScore([
      { absError: 0, weight: evenWeight(0) },
      { absError: 0.2, weight: evenWeight(1800) },
    ]);
    expect(evenMiss).toBeLessThan(bigMiss);
  });
  it("0問なら0点（エラーにならない）", () => {
    expect(weightedScore([])).toBe(0);
  });
});

describe("meanAbsError / bestStreak / signedBias", () => {
  it("平均誤差の単純平均", () => {
    expect(meanAbsError([0.1, 0.2, 0.3])).toBeCloseTo(0.2, 10);
    expect(meanAbsError([])).toBe(0);
  });
  it("ストリーク: 10pt以内の連続をかぞえ、外したらリセット", () => {
    expect(bestStreak([0.05, 0.08, 0.2, 0.01, 0.02, 0.03])).toBe(3);
    expect(bestStreak([0.5, 0.5])).toBe(0);
    expect(bestStreak([])).toBe(0);
    expect(bestStreak([0.1])).toBe(1); // ちょうど10ptはセーフ
  });
  it("符号付きバイアス: ＋なら先手を高く見るクセ", () => {
    expect(signedBias([0.1, 0.2, -0.06])).toBeCloseTo(0.08, 10);
    expect(signedBias([])).toBe(0);
  });
  it("バイアスの言葉", () => {
    expect(biasLabel(0.1)).toBe("先手を高く見がち");
    expect(biasLabel(-0.1)).toBe("先手を低く見がち");
    expect(biasLabel(0.01)).toBe("ほぼ正確");
  });
});
