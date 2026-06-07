// テスト用の「かり局面」たち。
// ⚠ 将棋の正確さを守るため、SFEN文字列は一切手書きしない。
//   平手初形から USI の指し手を core.js (applyUsiStrict) で1手ずつ進めて作る。
//   1手でも非合法なら例外で止まる＋ tests/samples.test.ts が全件を機械検証する。
// ⚠ 評価値 (evalCp) はすべて「かりの数字」。エンジン生成データが入るまでの動作確認用。
//   画面には is_sample=true の局面で必ず「かり局面」バナーを出すこと。
import ShogiCore from "./shogi/core";
import type { GameState } from "./shogi/core";
import type { Phase, Style } from "./scoring";

export interface SamplePosition {
  sfen: string;
  evalCp: number; // かりの数字（先手視点）
  styleTag: Style;
  phaseTag: Phase;
  moveCount: number; // 初形から何手すすんだ局面か
  comment: string;
}

interface SampleDef {
  movesUsi: string[]; // 平手初形からの指し手（USI）
  walkPlies?: number; // さらに「合法手だけの機械すすめ」で何手のばすか（終盤かり局面用）
  evalCp: number;
  styleTag: Style;
  phaseTag: Phase;
  label: string;
}

/** 指し手を厳密に適用。非合法ならどの手かを示して例外 */
function applyAll(movesUsi: string[]): { state: GameState; count: number } {
  let st = ShogiCore.initialState();
  for (let i = 0; i < movesUsi.length; i++) {
    const next = ShogiCore.applyUsiStrict(st, movesUsi[i]);
    if (!next) {
      throw new Error(`非合法手を検出: ${i + 1}手目 "${movesUsi[i]}"`);
    }
    st = next;
  }
  return { state: st, count: movesUsi.length };
}

/** 合法手だけを機械的に選んで進める（駒を取る手を優先・同点はUSI文字列順＝毎回同じ結果）。
 *  人間らしい棋譜ではないが、ルール上は完全に合法な局面ができる。終盤かり局面用 */
function walk(start: GameState, plies: number): { state: GameState; advanced: number } {
  let st = start;
  let advanced = 0;
  for (let i = 0; i < plies; i++) {
    const moves = ShogiCore.allLegalMoves(st);
    if (moves.length === 0) break; // 詰みなら手前で止める
    const scored = moves
      .map((m) => ({
        m,
        usi: ShogiCore.moveToUsi(m),
        cap: m.to && st.board[m.to.r][m.to.c] ? 1 : 0,
      }))
      .sort((a, b) => b.cap - a.cap || (a.usi < b.usi ? -1 : 1));
    const next = ShogiCore.applyMove(st, scored[0].m);
    if (!next) break;
    st = next;
    advanced += 1;
  }
  return { state: st, advanced };
}

// --- 定番の出だし（すべて実在の定跡手順） ---
const AIGAKARI_8 = ["2g2f", "8c8d", "7g7f", "3c3d", "2f2e", "8d8e", "6i7h", "4a3b"];
const SHIKEN_8 = ["7g7f", "3c3d", "6g6f", "8c8d", "2h6h", "8d8e", "7i7h", "7a6b"];
const NAKABISHA_7 = ["7g7f", "3c3d", "5g5f", "8c8d", "2h5h", "8d8e", "8h7g"];
// 矢倉の駒組み（27手）
const YAGURA_27 = [
  "7g7f", "8c8d", "7i6h", "3c3d", "6g6f", "7a6b", "5g5f", "5c5d", "3i4h",
  "3a4b", "4i5h", "4a3b", "6i7h", "5a4a", "5i6i", "6a5b", "6h7g", "4b3c",
  "8h7i", "2b3a", "3g3f", "4c4d", "5h6g", "7c7d", "7i4f", "5b4c", "4h3g",
];
// 四間飛車 対 居飛車の対抗形（26手）
const SHIKEN_VS_26 = [
  "7g7f", "3c3d", "6g6f", "8c8d", "2h6h", "8d8e", "8h7g", "7a6b", "7i7h",
  "5a4b", "5i4h", "4b3b", "4h3h", "6a5b", "3h2h", "1c1d", "1g1f", "9c9d",
  "3i3h", "7c7d", "4i5h", "3a4b", "4g4f", "5c5d", "3g3f", "6c6d",
];
// 横歩取り（27手）
const YOKOFU_27 = [
  "7g7f", "3c3d", "2g2f", "8c8d", "2f2e", "8d8e", "6i7h", "4a3b", "2e2d",
  "2c2d", "2h2d", "8e8f", "8g8f", "8b8f", "2d3d", "2b3c", "3d3f", "8f8d",
  "3f2f", "3a2b", "P*8g", "1c1d", "1g1f", "9c9d", "9g9f", "5a4b", "5i5h",
];

const DEFS: SampleDef[] = [
  // --- 序盤 ---
  { movesUsi: [], evalCp: 40, styleTag: "other", phaseTag: "opening", label: "平手の初形" },
  { movesUsi: ["7g7f", "3c3d", "2g2f"], evalCp: 60, styleTag: "ibisha", phaseTag: "opening", label: "角道を開けて飛車先" },
  { movesUsi: AIGAKARI_8, evalCp: -20, styleTag: "ibisha", phaseTag: "opening", label: "相掛かりの出だし" },
  { movesUsi: SHIKEN_8, evalCp: 10, styleTag: "furibisha", phaseTag: "opening", label: "四間飛車の出だし" },
  { movesUsi: NAKABISHA_7, evalCp: -40, styleTag: "furibisha", phaseTag: "opening", label: "中飛車の出だし" },
  // --- 中盤 ---
  { movesUsi: YAGURA_27, evalCp: 180, styleTag: "ibisha", phaseTag: "middle", label: "矢倉の駒組み" },
  { movesUsi: SHIKEN_VS_26, evalCp: -150, styleTag: "furibisha", phaseTag: "middle", label: "四間飛車の対抗形" },
  { movesUsi: YOKOFU_27, evalCp: 90, styleTag: "ibisha", phaseTag: "middle", label: "横歩取りの戦い" },
  { movesUsi: [], walkPlies: 30, evalCp: -250, styleTag: "other", phaseTag: "middle", label: "乱戦もよう" },
  // --- 終盤（機械すすめで駒のぶつかり合いを作る） ---
  { movesUsi: YAGURA_27, walkPlies: 36, evalCp: 900, styleTag: "ibisha", phaseTag: "endgame", label: "矢倉からの寄せ合い" },
  { movesUsi: SHIKEN_VS_26, walkPlies: 38, evalCp: -700, styleTag: "furibisha", phaseTag: "endgame", label: "対抗形の終盤戦" },
  { movesUsi: YOKOFU_27, walkPlies: 40, evalCp: 1500, styleTag: "other", phaseTag: "endgame", label: "激しい攻め合いの最終盤" },
];

/** かり局面の一覧を生成（毎回同じ結果になる決定的な処理） */
export function buildSamples(): SamplePosition[] {
  return DEFS.map((d) => {
    const base = applyAll(d.movesUsi);
    let state = base.state;
    let count = base.count;
    if (d.walkPlies) {
      const w = walk(state, d.walkPlies);
      state = w.state;
      count += w.advanced;
    }
    return {
      sfen: ShogiCore.toSfen(state),
      evalCp: d.evalCp,
      styleTag: d.styleTag,
      phaseTag: d.phaseTag,
      moveCount: count,
      comment: `${d.label}（※テスト用のかり局面・評価値はかりの数字）`,
    };
  });
}
