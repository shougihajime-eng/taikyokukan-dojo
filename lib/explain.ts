// テンプレート解説: エンジンデータ（評価値・最善手・読み筋）と機械計算（駒の損得）だけから文章を組み立てる。
// ⚠ AIに将棋の内容を語らせない（事実誤り＝ハルシネーションをゼロにするための設計）。
import ShogiCore from "./shogi/core";
import { usiToJapanese, pvToJapanese } from "./notation";
import { winratePercent } from "./eval";
import { materialText } from "./material";

/** 評価値 → 形勢のことば（将棋で広く使われる目安） */
export function evalToText(cp: number): string {
  const abs = Math.abs(cp);
  const side = cp > 0 ? "先手" : "後手";
  if (abs < 100) return "ほぼ互角";
  if (abs < 300) return `${side}がやや指しやすい`;
  if (abs < 800) return `${side}が有利`;
  if (abs < 1500) return `${side}が優勢`;
  return `${side}が勝勢`;
}

export interface Explanation {
  judgeText: string; // 「AIの判定: 先手がやや指しやすい（先手勝率58%）」
  materialText: string | null; // 「駒の損得: 先手の駒得（銀1枚の得）」（枚数の機械数え・SFENが読めた時だけ）
  gapText: string; // 「あなたの予測より先手を低く見ていました（ズレ 12pt）」
  bestText: string | null; // 「AIの最善手は ▲３七銀」（データがある時だけ）
  pvText: string | null; // 「読み筋: ▲３七銀 △８五歩 …」（データがある時だけ）
}

export function buildExplanation(args: {
  sfen: string;
  actualCp: number;
  actualWinrate: number;
  guessWinrate: number;
  signedError: number;
  bestMoveUsi: string | null;
  pv: string[];
}): Explanation {
  const judgeText = `AIの判定: ${evalToText(args.actualCp)}（先手勝率 ${winratePercent(args.actualWinrate)}%）`;

  const gapPt = Math.round(Math.abs(args.signedError) * 100);
  let gapText: string;
  if (gapPt <= 3) {
    gapText = `ピタリ！ ズレはわずか ${gapPt}pt でした`;
  } else if (args.signedError > 0) {
    gapText = `あなたはAIより先手を ${gapPt}pt 高く見ていました`;
  } else {
    gapText = `あなたはAIより先手を ${gapPt}pt 低く見ていました`;
  }

  const state = ShogiCore.parseSfen(args.sfen);
  const matText = state ? materialText(state) : null;

  let bestText: string | null = null;
  let pvText: string | null = null;
  if (state && args.bestMoveUsi) {
    const best = usiToJapanese(state, args.bestMoveUsi);
    if (best) {
      bestText = `AIの最善手は ${best.label}`;
      const pvLabels = pvToJapanese(state, args.pv, 5);
      if (pvLabels.length >= 2) {
        pvText = `読み筋: ${pvLabels.join(" ")}`;
      }
    }
  }

  return { judgeText, materialText: matText, gapText, bestText, pvText };
}
