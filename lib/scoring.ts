// 採点ロジック（純関数のみ・vitest でテストする）。
// すべて「勝率pt(0..1)」の単位で計算する。cpモードの入力も eval.ts で勝率化してから渡すこと。
import { cpToWinrate } from "./eval";

export type Phase = "opening" | "middle" | "endgame"; // 序盤・中盤・終盤
export type Style = "ibisha" | "furibisha" | "other"; // 居飛車・振り飛車・その他

// --- 互角加重のパラメータ ---
export const EVEN_BAND_CP = 300; // 互角とみなす帯（±300cp）
export const EVEN_SCALE = 600; // 重みの減衰スケール
export const EVEN_W_MIN = 0.3; // 大差局面の最小重み
// --- スコアのパラメータ ---
export const MAX_ERR_FOR_ZERO = 0.5; // 誤差50pt(勝率50%ぶん)で0点
export const STREAK_THRESH = 0.1; // 誤差10pt以内なら「正確」としてストリーク継続

/** 互角加重: 実際の評価が互角(±300cp)に近いほど重く、大差ほど軽い（誰でも当たるので）。
 *  w(cp) = 0.3 + 0.7 * exp(-(cp/600)^2)  →  cp=0で1.0、|cp|=2000で≈0.3 */
export function evenWeight(actualCp: number): number {
  const x = actualCp / EVEN_SCALE;
  return EVEN_W_MIN + (1 - EVEN_W_MIN) * Math.exp(-x * x);
}

export interface GuessScore {
  absError: number; // |予測 - 実際|（勝率pt 0..1）
  signedError: number; // 予測 - 実際（＋=先手を高く見た）
  weight: number; // 互角加重
}

/** 1問ぶんの採点。guessWinrate は 0..1、actualCp は先手視点の評価値 */
export function scoreGuess(guessWinrate: number, actualCp: number): GuessScore {
  const actual = cpToWinrate(actualCp);
  const signedError = guessWinrate - actual;
  return {
    absError: Math.abs(signedError),
    signedError,
    weight: evenWeight(actualCp),
  };
}

/** 加重スコア(0..100)。互角局面の誤差が大差局面より強く効く。高いほど正確 */
export function weightedScore(items: { absError: number; weight: number }[]): number {
  if (items.length === 0) return 0;
  let num = 0;
  let den = 0;
  for (const it of items) {
    num += it.weight * it.absError;
    den += it.weight;
  }
  const meanErr = den > 0 ? num / den : 0;
  const score = 100 * (1 - meanErr / MAX_ERR_FOR_ZERO);
  return Math.round(Math.max(0, Math.min(100, score)));
}

/** ただの平均誤差（勝率pt 0..1） */
export function meanAbsError(absErrors: number[]): number {
  if (absErrors.length === 0) return 0;
  return absErrors.reduce((a, b) => a + b, 0) / absErrors.length;
}

/** 出題順の誤差列から「誤差10pt以内が連続した最大回数」を返す */
export function bestStreak(absErrorsInOrder: number[]): number {
  let best = 0;
  let cur = 0;
  for (const e of absErrorsInOrder) {
    if (e <= STREAK_THRESH) {
      cur += 1;
      if (cur > best) best = cur;
    } else {
      cur = 0;
    }
  }
  return best;
}

/** 符号付き誤差の平均（＋=先手を高く見るクセ、−=低く見るクセ） */
export function signedBias(signedErrors: number[]): number {
  if (signedErrors.length === 0) return 0;
  return signedErrors.reduce((a, b) => a + b, 0) / signedErrors.length;
}

/** バイアス値(勝率pt) → 人に見せる短い言葉 */
export function biasLabel(bias: number): string {
  if (bias > 0.05) return "先手を高く見がち";
  if (bias < -0.05) return "先手を低く見がち";
  return "ほぼ正確";
}
