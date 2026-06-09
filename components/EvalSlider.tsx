"use client";
// 形勢の予測スライダー。常に「先手から見て」で固定（手番で反転させない）。
// 勝率モード(0〜100%)と評価値モード(−2000〜+2000)を切替できるが、
// どちらも内部の値は「先手勝率(0..1)」で統一し、変換は必ず lib/eval.ts を使う。
import { cpToWinrate, winrateToCp, winratePercent, CP_RANGE } from "@/lib/eval";

export type SliderMode = "winrate" | "cp";

interface Props {
  mode: SliderMode;
  value: number; // 先手勝率 0..1
  onChange: (winrate: number) => void;
  disabled?: boolean;
}

export default function EvalSlider({ mode, value, onChange, disabled }: Props) {
  const cp = Math.round(winrateToCp(value));
  const pct = winratePercent(value);

  return (
    <div className="flex flex-col gap-2.5">
      {/* いまの予測値（大きく・ほのかに光る） */}
      <div className="text-center">
        <span
          className="font-mincho text-3xl tnum pop-num"
          key={mode === "winrate" ? pct : cp}
          style={{ textShadow: "0 0 20px rgba(231,201,135,0.35)" }}
        >
          {mode === "winrate" ? (
            <>
              先手 <span className="text-[var(--kin-light)]">{pct}</span>
              <span className="text-lg text-[var(--sumi-soft)]">%</span>
            </>
          ) : (
            <span className="text-[var(--kin-light)]">
              {cp > 0 ? `+${cp}` : cp}
            </span>
          )}
        </span>
      </div>

      <div className="relative px-1">
        <div className="relative">
          <span className="keisei-mid" aria-hidden />
          {mode === "winrate" ? (
            <input
              type="range"
              min={1}
              max={99}
              step={1}
              value={pct}
              disabled={disabled}
              onChange={(e) => onChange(Number(e.target.value) / 100)}
              className="keisei-slider keisei-track relative"
              aria-label="先手の勝率を予測するスライダー"
            />
          ) : (
            <input
              type="range"
              min={-CP_RANGE}
              max={CP_RANGE}
              step={25}
              value={cp}
              disabled={disabled}
              onChange={(e) => onChange(cpToWinrate(Number(e.target.value)))}
              className="keisei-slider keisei-track relative"
              aria-label="先手から見た評価値を予測するスライダー"
            />
          )}
        </div>
        <div className="flex justify-between text-[11px] font-bold text-[var(--sumi-soft)] mt-1.5">
          <span>△後手よし</span>
          <span>互角</span>
          <span>▲先手よし</span>
        </div>
      </div>
    </div>
  );
}
