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
function errorRank(absError: number): { word: string; color: string } {
  const pt = absError * 100;
  if (pt <= 3) return { word: "ピタリ！", color: "#b32718" };
  if (pt <= 10) return { word: "するどい", color: "#9a6a1a" };
  if (pt <= 20) return { word: "おしい", color: "#5d7a44" };
  return { word: "ズレ大", color: "#2e3458" };
}

export default function ResultReveal({ guessWinrate, actualWinrate, absError, explanation, phaseTag }: Props) {
  const g = winratePercent(guessWinrate);
  const a = winratePercent(actualWinrate);
  const rank = errorRank(absError);

  return (
    <div className="rise-in rounded-2xl border border-amber-900/20 bg-white/70 backdrop-blur-sm shadow-sm p-4 flex flex-col gap-3">
      {/* ひとこと評価と誤差 */}
      <div className="flex items-center justify-center gap-3">
        <span className="font-fude text-3xl pop-num" style={{ color: rank.color }}>
          {rank.word}
        </span>
        <span className="text-sm opacity-80">ズレ {Math.round(absError * 100)}pt</span>
      </div>

      {/* メーター（先手勝率 0..100%） */}
      <div className="relative h-12 mt-1">
        <div
          className="absolute inset-x-0 top-4 h-3.5 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, #2e3458 0%, #8a86a8 35%, #e9e2cf 50%, #e0a08a 65%, #b32718 100%)",
          }}
        />
        {/* あなたの予測 */}
        <div className="absolute top-0 -translate-x-1/2 flex flex-col items-center meter-needle" style={{ left: `${g}%` }}>
          <span className="text-[10px] font-bold leading-none">あなた</span>
          <span className="w-0 h-0 border-x-[6px] border-x-transparent border-t-[9px] border-t-[#3b2f1e]" />
        </div>
        {/* AIの判定 */}
        <div className="absolute bottom-0 -translate-x-1/2 flex flex-col items-center meter-needle" style={{ left: `${a}%` }}>
          <span className="w-0 h-0 border-x-[6px] border-x-transparent border-b-[9px] border-b-[#b32718]" />
          <span className="text-[10px] font-bold leading-none text-[#b32718]">AI</span>
        </div>
      </div>
      <div className="flex justify-between text-[10px] opacity-60 -mt-2">
        <span>△後手よし</span>
        <span>互角</span>
        <span>▲先手よし</span>
      </div>

      {/* テンプレ解説（エンジンデータ＋駒の損得の機械数えのみ） */}
      <div className="rounded-xl bg-[#fbf4e2] border border-amber-900/15 p-3 text-sm leading-relaxed flex flex-col gap-1">
        <p className="font-bold">{explanation.judgeText}</p>
        {explanation.materialText && <p>{explanation.materialText}</p>}
        <p>{explanation.gapText}</p>
        {explanation.bestText && <p>{explanation.bestText}</p>}
        {explanation.pvText && <p className="text-xs opacity-80">{explanation.pvText}</p>}
      </div>

      {/* 解説の名人のまめちしき（固定の一般知識） */}
      <MasterTips phaseTag={phaseTag} />
    </div>
  );
}
