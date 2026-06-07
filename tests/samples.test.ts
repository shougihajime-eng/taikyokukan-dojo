// かり局面の機械検証。「将棋の正確さ」は絶対条件なので、1件でも不正があれば失敗させる。
import { describe, it, expect } from "vitest";
import ShogiCore from "../lib/shogi/core";
import { buildSamples } from "../lib/samples";
import { CP_RANGE } from "../lib/eval";

const samples = buildSamples();

describe("かり局面の品質", () => {
  it("12局面そろっている", () => {
    expect(samples.length).toBe(12);
  });

  it("全SFENが合法な局面として読み込める（parseSfen ≠ null）", () => {
    for (const s of samples) {
      const st = ShogiCore.parseSfen(s.sfen);
      expect(st, `SFEN不正: ${s.comment} → ${s.sfen}`).not.toBeNull();
    }
  });

  it("全局面に玉が両方そろっている", () => {
    for (const s of samples) {
      const st = ShogiCore.parseSfen(s.sfen)!;
      expect(ShogiCore.findKing(st, "sente"), `先手玉なし: ${s.comment}`).not.toBeNull();
      expect(ShogiCore.findKing(st, "gote"), `後手玉なし: ${s.comment}`).not.toBeNull();
    }
  });

  it("手番でない側が王手されたまま放置されていない（直前の手が合法だった証拠）", () => {
    for (const s of samples) {
      const st = ShogiCore.parseSfen(s.sfen)!;
      const opponent = ShogiCore.opp(st.turn);
      expect(ShogiCore.inCheck(st, opponent), `非手番側が王手放置: ${s.comment}`).toBe(false);
    }
  });

  it("SFENに重複がない", () => {
    const set = new Set(samples.map((s) => s.sfen));
    expect(set.size).toBe(samples.length);
  });

  it("評価値は±2000以内のかり数字", () => {
    for (const s of samples) {
      expect(Math.abs(s.evalCp)).toBeLessThanOrEqual(CP_RANGE);
    }
  });

  it("戦法・局面帯のラベルが全種類そろっている（ダッシュボード確認用）", () => {
    const styles = new Set(samples.map((s) => s.styleTag));
    const phases = new Set(samples.map((s) => s.phaseTag));
    expect(styles).toEqual(new Set(["ibisha", "furibisha", "other"]));
    expect(phases).toEqual(new Set(["opening", "middle", "endgame"]));
  });

  it("全件に「かり局面」の注意書きがある", () => {
    for (const s of samples) {
      expect(s.comment).toContain("かり");
    }
  });

  it("毎回同じ結果になる（決定的）", () => {
    const again = buildSamples();
    expect(again.map((s) => s.sfen)).toEqual(samples.map((s) => s.sfen));
  });
});
