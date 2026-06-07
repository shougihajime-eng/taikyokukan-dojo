"use client";
// 判定の開示パネル: あなたの予測とAIの判定をメーターで見せ、テンプレ解説を出す。
import { winratePercent } from "@/lib/eval";
import type { Explanation } from "@/lib/explain";
import MasterTips from "./MasterTips";

interface Props {
  guessWinrate: number;
  actualWinrate: number;
  absError: number; // 勝率pt 0..1
  explanation: Explanation;
  phaseTag?: string; // まめちしきの「見るコツ」切り替え用（opening/middle/endgame）
}

/** 誤差の大きさ → ひとことの評価 */
function errorRank(absError: number): { word: string; color: string; emoji: string } {
  const pt = absError * 100;
  if (pt <= 3) return { word: "ピタリ！", color: "#b3271a", emoji: "🎯" };
  if (pt <= 10) return { word: "するどい", color: "#9a6a1a", emoji: "✨" };
  if (pt <= 20) return { word: "おしい", color: "#5d7a44", emoji: "🌱" };
  return { word: "ズレ大", color: "#2e3458", emoji: "🤔" };
}

export default function ResultReveal({ guessWinrate, actualWinrate, absError, explanation, phaseTag }: Props) {
  const g = winratePercent(guessWinrate);
  const a = winratePercent(actualWinrate);
  const rank = errorRank(absError);

  return (
    <div className="rise-in card card-pad flex flex-col gap-4">
      {/* ひとこと評価と誤差 */}
      <div className="flex items-center justify-center gap-3">
        <span className="font-fude text-4xl pop-num" style={{ color: rank.color }}>
          {rank.emoji} {rank.word}
        </span>
        <span className="chip">ズレ {Math.round(absError * 100)}pt</span>
      </div>

      {/* メーター（先手勝率 0..100%） */}
      <div className="relative pt-5 pb-5">
        <div className="relative h-3.5 rounded-full keisei-track">
          <span className="keisei-mid" aria-hidden />
        </div>
        {/* あなたの予測（上から） */}
        <div className="absolute top-0 -translate-x-1/2 flex flex-col items-center meter-needle" style={{ left: `${g}%` }}>
          <span className="text-[11px] font-bold leading-none whitespace-nowrap">あなた {g}%</span>
          <span className="needle-you mt-0.5" />
        </div>
        {/* AIの判定（下から） */}
        <div className="absolute bottom-0 -translate-x-1/2 flex flex-col items-center meter-needle" style={{ left: `${a}%` }}>
          <span className="needle-ai mb-0.5" />
          <span className="text-[11px] font-bold leading-none text-[var(--shu)] whitespace-nowrap">AI {a}%</span>
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-[var(--sumi-soft)] -mt-2">
        <span>△後手よし</span>
        <span>互角</span>
        <span>▲先手よし</span>
      </div>

      {/* テンプレ解説（エンジンデータ＋駒の損得の機械数えのみ） */}
      <div className="rounded-xl bg-[var(--paper)] border border-[var(--line)] p-3.5 text-sm leading-relaxed flex flex-col gap-1.5">
        <p className="font-bold text-[var(--shu-deep)]">{explanation.judgeText}</p>
        {explanation.materialText && <p>{explanation.materialText}</p>}
        <p>{explanation.gapText}</p>
        {explanation.bestText && <p>{explanation.bestText}</p>}
        {explanation.pvText && <p className="text-xs text-[var(--sumi-soft)]">{explanation.pvText}</p>}
      </div>

      {/* 解説の名人のまめちしき（固定の一般知識） */}
      <MasterTips phaseTag={phaseTag} />
    </div>
  );
}
