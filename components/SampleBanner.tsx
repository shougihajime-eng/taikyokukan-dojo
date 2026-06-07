// テスト用のかり局面で出題している時に必ず出す注意バナー
export default function SampleBanner() {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[var(--kin)] bg-[var(--kin-light)]/25 text-[var(--sumi)] text-xs px-3.5 py-2.5">
      <span className="text-base shrink-0" aria-hidden>
        🧪
      </span>
      <span className="leading-snug">
        いまは<b>テスト用のかり局面</b>です（評価値もかりの数字）。本物の問題は準備中。
      </span>
    </div>
  );
}
