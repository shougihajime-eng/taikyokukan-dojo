// 駒の損得（material.ts）の機械検証。
// SFENの手書きはしない約束なので、平手初形から合法手を1手ずつ進めて検証局面を作る。
import { describe, it, expect } from "vitest";
import ShogiCore from "../lib/shogi/core";
import type { GameState } from "../lib/shogi/core";
import { countOwned, materialGains, materialText } from "../lib/material";
import { buildExplanation } from "../lib/explain";
import { buildSamples } from "../lib/samples";

/** 平手初形から指し手を厳密に適用（非合法なら例外） */
function play(movesUsi: string[]): GameState {
  let st = ShogiCore.initialState();
  for (const u of movesUsi) {
    const next = ShogiCore.applyUsiStrict(st, u);
    if (!next) throw new Error(`非合法手: ${u}`);
    st = next;
  }
  return st;
}

describe("駒の損得の数え方", () => {
  it("平手初形は損得なし", () => {
    const st = ShogiCore.initialState();
    expect(materialText(st)).toBe("駒の損得: なし（おたがい同じ）");
    const g = materialGains(st);
    for (const v of Object.values(g)) expect(v).toBe(0);
  });

  it("角交換のとちゅう（▲２二角成の直後）は先手の角得", () => {
    // ▲７六歩 △３四歩 ▲２二角成（先手の角が後手の角を取って成った直後）
    const st = play(["7g7f", "3c3d", "8h2b+"]);
    // 先手: 盤上の馬（=角として数える）+ 持ち駒の角 = 角2枚
    expect(countOwned(st, "sente").B).toBe(2);
    expect(countOwned(st, "gote").B).toBe(0);
    expect(materialGains(st).B).toBe(1);
    expect(materialText(st)).toBe("駒の損得: 先手の駒得（先手から見て 角1枚の得）");
  });

  it("角交換が完了（△同銀）すると損得なしに戻る", () => {
    const st = play(["7g7f", "3c3d", "8h2b+", "3a2b"]);
    expect(countOwned(st, "sente").B).toBe(1); // 持ち駒の角のみ
    expect(countOwned(st, "gote").B).toBe(1); // 持ち駒の角のみ
    expect(materialText(st)).toBe("駒の損得: なし（おたがい同じ）");
  });

  it("飛車先の歩交換（▲同飛まで）は損得なし＝おたがい歩1枚を手にしただけ", () => {
    // ▲２六歩 △３四歩 ▲２五歩 △５二金 ▲２四歩 △同歩 ▲同飛
    const st = play(["2g2f", "3c3d", "2f2e", "6a5b", "2e2d", "2c2d", "2h2d"]);
    expect(countOwned(st, "sente").P).toBe(9); // 盤8枚+持ち駒1枚
    expect(countOwned(st, "gote").P).toBe(9);
    expect(materialText(st)).toBe("駒の損得: なし（おたがい同じ）");
  });

  it("歩のただ取り（▲２四歩×△の歩）は先手の歩得", () => {
    // ▲２六歩 △２四歩 ▲２五歩 △５二金 ▲２四同歩（後手の歩をただで取った）
    const st = play(["2g2f", "2c2d", "2f2e", "6a5b", "2e2d"]);
    expect(materialGains(st).P).toBe(1);
    expect(materialText(st)).toBe("駒の損得: 先手の駒得（先手から見て 歩1枚の得）");
  });

  it("後手が歩得なら「後手の駒得」と言う", () => {
    // ▲７六歩 △８四歩 ▲２六歩 △８五歩 ▲２五歩 △８六歩 ▲５八玉 △８七歩成（先手の８七歩をただ取り）
    const st = play(["7g7f", "8c8d", "2g2f", "8d8e", "2f2e", "8e8f", "5i5h", "8f8g+"]);
    expect(materialGains(st).P).toBe(-1);
    expect(materialText(st)).toBe("駒の損得: 後手の駒得（先手から見て 歩1枚の損）");
  });

  it("成駒は元の駒として数える（龍=飛車1枚・と金=歩）", () => {
    // 飛車先の歩交換のあと ▲２三飛成（龍ができても飛車1枚のまま・損得は変わらない）
    const st = play(["2g2f", "3c3d", "2f2e", "6a5b", "2e2d", "2c2d", "2h2d", "8c8d", "2d2c+"]);
    expect(countOwned(st, "sente").R).toBe(1); // 龍=飛車1枚
    expect(materialGains(st).R).toBe(0);
    expect(materialGains(st).P).toBe(0); // 歩交換は五分のまま
  });

  it("かり局面12個ぜんぶで例外なく文章が作れる", () => {
    for (const s of buildSamples()) {
      const st = ShogiCore.parseSfen(s.sfen);
      expect(st, `SFEN不正: ${s.comment}`).not.toBeNull();
      const text = materialText(st!);
      expect(text.startsWith("駒の損得: ")).toBe(true);
    }
  });

  it("buildExplanation に materialText が入る", () => {
    const ex = buildExplanation({
      sfen: ShogiCore.HIRATE_SFEN,
      actualCp: 40,
      actualWinrate: 0.52,
      guessWinrate: 0.5,
      signedError: -0.02,
      bestMoveUsi: null,
      pv: [],
    });
    expect(ex.materialText).toBe("駒の損得: なし（おたがい同じ）");
  });
});
