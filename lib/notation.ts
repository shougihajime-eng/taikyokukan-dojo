// USIの指し手 → 日本語表記（▲７六歩 など）への機械変換。
// エンジンデータをそのまま読みやすくするだけで、将棋の内容を「創作」しない。
import ShogiCore from "./shogi/core";
import type { GameState } from "./shogi/core";

const ZEN = "０１２３４５６７８９";
const KAN = "〇一二三四五六七八九";
const PROMO_NAME: Record<string, string> = { P: "と", L: "成香", N: "成桂", S: "成銀", B: "馬", R: "龍" };

/** 1手をUSI→日本語に変換し、進めた後の局面も返す。非合法なら null */
export function usiToJapanese(
  state: GameState,
  usi: string
): { label: string; next: GameState } | null {
  const mv = ShogiCore.usiToMove(state, usi);
  if (!mv) return null;
  const mark = state.turn === "sente" ? "▲" : "△";
  const file = 9 - mv.to.c; // 筋（1..9）
  const rank = mv.to.r + 1; // 段（1..9）
  let pieceName: string;
  let suffix = "";
  if (mv.drop) {
    pieceName = ShogiCore.KANJI[mv.drop];
    suffix = "打";
  } else if (mv.from) {
    const p = state.board[mv.from.r][mv.from.c];
    if (!p) return null;
    pieceName = p.promoted ? PROMO_NAME[p.type] ?? ShogiCore.KANJI[p.type] : ShogiCore.KANJI[p.type];
    if (mv.promote) suffix = "成";
  } else {
    return null;
  }
  const next = ShogiCore.applyUsiStrict(state, usi);
  if (!next) return null;
  return { label: `${mark}${ZEN[file]}${KAN[rank]}${pieceName}${suffix}`, next };
}

/** 読み筋（USI配列）をまとめて日本語にする。途中で非合法になったらそこまでを返す */
export function pvToJapanese(state: GameState, pv: string[], maxMoves = 5): string[] {
  const out: string[] = [];
  let st = state;
  for (const u of pv.slice(0, maxMoves)) {
    const r = usiToJapanese(st, u);
    if (!r) break;
    out.push(r.label);
    st = r.next;
  }
  return out;
}
