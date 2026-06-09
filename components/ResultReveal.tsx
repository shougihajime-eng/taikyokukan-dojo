"use client";
// 判定の開示パネル: あなたの予測とAIの判定をメーターで見せ、テンプレ解説を出す。
// ピタリ正解ほど大きく「光る」演出（火花・縁のフラッシュ）でモチベを上げる。
import { useEffect, useState } from "react";
import { winratePercent } from "@/lib/eval";
import type { Explanation } from "@/lib/explain";
import MasterTips from "./MasterTips";
import Sparkles from "./Sparkles";

interface Props {
  guessWinrate: number;
  actualWinrate: number;
  absError: number; // 勝率pt 0..1
  explanation: Explanation;
  phaseTag?: string; // まめちしきの「見るコツ」切り替え用（opening/middle/endgame）
}

/** 誤差の大きさ → ひとことの評価 */
function errorRank(absError: number): {
  word: string;
  color: string;
  emoji: string;
  spark: number; // 火花の数（0でなし）
  flash: boolean; // 画面ふちの金フラッシュ
} {
  const pt = absError * 100;
  if (pt <= 3) return { word: "ピタリ！", color: "#e7c987", emoji: "🎯", spark: 14, flash: true };
  if (pt <= 10) return { word: "するどい", color: "#f7d27a", emoji: "✨", spark: 8, flash: false };
  if (pt <= 20) return { word: "おしい", color: "#74d4a0", emoji: "🌱", spark: 0, flash: false };
  return { word: "ズレ大", color: "#7d92e6", emoji: "🤔", spark: 0, flash: false };
}

export default function ResultReveal({ guessWinrate, actualWinrate, absError, explanation, phaseTag }: Props) {
  const g = winratePercent(guessWinrate);
  const a = winratePercent(actualWinrate);
  const rank = errorRank(absError);
  const [flash, setFlash] = useState(rank.flash);

  // 縁の金フラッシュは1回だけ
  useEffect(() => {
    if (!rank.flash) return;
    const t = setTimeout(() => setFlash(false), 950);
    return () => clearTimeout(t);
  }, [rank.flash]);

  return (
    <div className="rise-in card card-pad flex flex-col gap-4">
      {flash && <span className="edge-flash" aria-hidden />}

      {/* ひとこと評価と誤差 */}
      <div className="relative flex items-center justify-center gap-3 py-1">
        {rank.spark > 0 && <Sparkles count={rank.spark} spread={rank.flash ? 84 : 58} color={rank.color} />}
        <span
          className="font-fude text-[2.6rem] leading-none pop-num"
          style={{ color: rank.color, textShadow: `0 0 22px ${rank.color}66` }}
        >
          {rank.emoji} {rank.word}
        </span>
        <span className="chip shrink-0">ズレ {Math.round(absError * 100)}pt</span>
      </div>

      {/* メーター（先手勝率 0..100%） */}
      <div className="relative pt-6 pb-6">
        <div className="relative h-3.5 rounded-full keisei-track">
          <span className="keisei-mid" aria-hidden />
        </div>
        {/* あなたの予測（上から） */}
        <div className="absolute top-0 -translate-x-1/2 flex flex-col items-center meter-needle" style={{ left: `${g}%` }}>
          <span className="text-[11px] font-bold leading-none whitespace-nowrap text-[var(--kin-light)]">あなた {g}%</span>
          <span className="needle-you mt-0.5" />
        </div>
        {/* AIの判定（下から） */}
        <div className="absolute bottom-0 -translate-x-1/2 flex flex-col items-center meter-needle" style={{ left: `${a}%` }}>
          <span className="needle-ai mb-0.5" />
          <span className="text-[11px] font-bold leading-none text-[var(--shu-bright)] whitespace-nowrap">AI {a}%</span>
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-[var(--sumi-soft)] -mt-2">
        <span>△後手よし</span>
        <span>互角</span>
        <span>▲先手よし</span>
      </div>

      {/* テンプレ解説（エンジンデータ＋駒の損得の機械数えのみ） */}
      <div className="rounded-xl bg-[var(--paper)] border border-[var(--line)] p-3.5 text-sm leading-relaxed flex flex-col gap-1.5">
        <p className="font-bold text-[var(--kin-light)]">{explanation.judgeText}</p>
        {/* なぜこっちが良いか（いちばん見てほしい一言） */}
        <p className="rounded-lg bg-[var(--shu)]/10 border border-[var(--shu)]/30 px-2.5 py-2">
          <span className="font-bold text-[var(--shu-bright)]">なぜ？ </span>
          {explanation.whyText}
        </p>
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
