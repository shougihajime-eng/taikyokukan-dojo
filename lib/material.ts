// 駒の損得を「数えるだけ」で文章にする解説部品。
// ⚠ ここは枚数の計算のみ（盤上＋持ち駒を平手の定数と比べる）＝事実誤りが構造的に起きない。
//   形勢の理由づけ・読み筋など「将棋の内容の創作」はしない（AGENTS.md のハルシネーション禁止の約束）。
// 数え方: 成駒は元の駒として数える（と金=歩、馬=角、龍=飛車。駒の損得の標準的な数え方）。玉は除く。
import type { GameState, PieceType } from "./shogi/core";

type HandType = Exclude<PieceType, "K">;

/** 平手で片方が持つ枚数（玉を除く） */
const FULL_SET: Record<HandType, number> = { R: 1, B: 1, G: 2, S: 2, N: 2, L: 2, P: 9 };
/** 表示名（飛は「飛車」と読みやすく） */
const NAME: Record<HandType, string> = { R: "飛車", B: "角", G: "金", S: "銀", N: "桂", L: "香", P: "歩" };
/** 駒の価値の目安（歩=1 とする広く使われる換算）。「どちらの駒得か」の言葉選びにだけ使う */
const VALUE: Record<HandType, number> = { R: 10, B: 8, G: 6, S: 5, N: 4, L: 3, P: 1 };
/** 表示順（価値の高い順） */
const ORDER: HandType[] = ["R", "B", "G", "S", "N", "L", "P"];

/** その色が「所有」する駒の枚数（盤上＝成りは元の駒として数える ＋ 持ち駒。玉は除く） */
export function countOwned(st: GameState, color: "sente" | "gote"): Record<HandType, number> {
  const totals: Record<HandType, number> = { R: 0, B: 0, G: 0, S: 0, N: 0, L: 0, P: 0 };
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const p = st.board[r][c];
      if (p && p.color === color && p.type !== "K") {
        totals[p.type as HandType] += 1;
      }
    }
  }
  const hand = st.hands[color] ?? {};
  for (const t of ORDER) {
    totals[t] += hand[t] ?? 0;
  }
  return totals;
}

/** 先手から見た駒の増減（+1 = 先手がその駒を1枚多く持っている） */
export function materialGains(st: GameState): Record<HandType, number> {
  const sente = countOwned(st, "sente");
  const gains: Record<HandType, number> = { R: 0, B: 0, G: 0, S: 0, N: 0, L: 0, P: 0 };
  for (const t of ORDER) {
    gains[t] = sente[t] - FULL_SET[t];
  }
  return gains;
}

/** 駒の損得を1行の日本語にする（例: 「先手の駒得（銀1枚の得・歩2枚の損）」） */
export function materialText(st: GameState): string {
  const gains = materialGains(st);
  const plus: string[] = [];
  const minus: string[] = [];
  let valueSum = 0;
  for (const t of ORDER) {
    const n = gains[t];
    if (n > 0) plus.push(`${NAME[t]}${n}枚の得`);
    if (n < 0) minus.push(`${NAME[t]}${-n}枚の損`);
    valueSum += n * VALUE[t];
  }
  if (plus.length === 0 && minus.length === 0) {
    return "駒の損得: なし（おたがい同じ）";
  }
  const detail = [...plus, ...minus].join("・");
  let verdict: string;
  if (valueSum > 0) verdict = "先手の駒得";
  else if (valueSum < 0) verdict = "後手の駒得";
  else verdict = "ほぼ五分の交換";
  return `駒の損得: ${verdict}（先手から見て ${detail}）`;
}
