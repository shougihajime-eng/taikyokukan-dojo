// 評価値(cp) ↔ 勝率 の変換を1箇所に集約するファイル。
// ⚠ スライダー表示・採点・集計のすべてが必ずここの関数を使うこと（仕様の最重要要件）。
// 変換式は将棋AIで広く使われるシグモイド: 勝率 = 1 / (1 + exp(-cp / 600))
// cp は常に「先手から見た」値（プラス=先手有利）。

export const EVAL_K = 600; // シグモイドの定数（ポナンザ定数）
export const CP_RANGE = 2000; // スライダー・保存値の上下限（詰み級はここにクランプ）

/** 評価値を ±CP_RANGE に収める */
export function clampCp(cp: number): number {
  return Math.max(-CP_RANGE, Math.min(CP_RANGE, cp));
}

/** 評価値(先手視点cp) → 先手勝率(0..1) */
export function cpToWinrate(cp: number): number {
  return 1 / (1 + Math.exp(-clampCp(cp) / EVAL_K));
}

/** 先手勝率(0..1) → 評価値(先手視点cp)。端は ±CP_RANGE にクランプ */
export function winrateToCp(p: number): number {
  const lo = cpToWinrate(-CP_RANGE);
  const hi = cpToWinrate(CP_RANGE);
  const q = Math.max(lo, Math.min(hi, p));
  return clampCp(-EVAL_K * Math.log(1 / q - 1));
}

/** 勝率(0..1) → 画面表示用のパーセント整数 (0..100) */
export function winratePercent(p: number): number {
  return Math.round(p * 100);
}
