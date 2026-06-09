// テンプレート解説: エンジンデータ（評価値・最善手・読み筋）と機械計算（駒の損得）だけから文章を組み立てる。
// ⚠ AIに将棋の内容を語らせない（事実誤り＝ハルシネーションをゼロにするための設計）。
import ShogiCore from "./shogi/core";
import { usiToJapanese, pvToJapanese } from "./notation";
import { winratePercent } from "./eval";
import { materialText, materialSummary } from "./material";
import type { GameState } from "./shogi/core";

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
  whyText: string; // 「なぜこっちが良いか」を機械的な事実（駒の損得・形勢の大きさ）から1行で
  materialText: string | null; // 「駒の損得: 先手の駒得（銀1枚の得）」（枚数の機械数え・SFENが読めた時だけ）
  gapText: string; // 「あなたの予測より先手を低く見ていました（ズレ 12pt）」
  bestText: string | null; // 「AIの最善手は ▲３七銀」（データがある時だけ）
  pvText: string | null; // 「読み筋: ▲３七銀 △８五歩 …」（データがある時だけ）
}

/** 「なぜこっちが良いか」を組み立てる。
 *  ⚠ 使ってよい材料は「評価値の大きさ」と「駒の損得の機械数え」だけ。
 *    盤面の具体（どの駒がどう働く等）はAIに創作させない＝ハルシネーション禁止（AGENTS.md）。
 *    『玉の堅さ・駒の働き・手番』は一般的なものさし（MasterTips/将棋辞典）として固定文で添えるのみ。 */
function buildWhyText(state: GameState | null, cp: number, phase?: string): string {
  const abs = Math.abs(cp);
  const favored = cp > 0 ? "先手" : "後手";
  if (abs < 100) {
    return "どちらが はっきり良い、とは言いきれない局面です。駒の損得も働きもほぼ五分で、ここからの指し方しだいです。";
  }
  const level = abs >= 1500 ? "大きく" : abs >= 800 ? "はっきり" : "やや";
  if (!state) return `形勢は${favored}に${level}かたむいています。`;

  const mat = materialSummary(state);
  const matSide = mat.side === "sente" ? "先手" : mat.side === "gote" ? "後手" : "even";
  if (mat.side !== "even" && matSide === favored) {
    const piece = mat.topPiece ? `${mat.topPiece}など` : "駒";
    return `${favored}が駒得（${piece}）。その駒の差がそのまま形勢に出て、${favored}${level}有利です。`;
  }
  if (mat.side === "even") {
    return `駒の損得は五分。ちがいは「玉の堅さ」「駒の働き」「手番（攻めの速さ）」など盤面の質です。下の最善手と読み筋が、その急所の手がかりになります。`;
  }
  // 駒は損だが形勢は良い＝駒を捨てて速さ・働きで上回っているケース
  if (phase === "endgame") {
    return `${favored}は駒の損得では損をしていますが、攻めの速さで上回っています。「終盤は駒の損得より速度」という考え方です。`;
  }
  return `${favored}は駒の損得では損ですが、駒の働きや攻めの速さで形勢は${favored}が上です。`;
}

export function buildExplanation(args: {
  sfen: string;
  actualCp: number;
  actualWinrate: number;
  guessWinrate: number;
  signedError: number;
  bestMoveUsi: string | null;
  pv: string[];
  phase?: string;
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
  const whyText = buildWhyText(state, args.actualCp, args.phase);
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

  return { judgeText, whyText, materialText: matText, gapText, bestText, pvText };
}
