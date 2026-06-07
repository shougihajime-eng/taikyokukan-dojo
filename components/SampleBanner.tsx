// テスト用のかり局面で出題している時に必ず出す注意バナー
export default function SampleBanner() {
  return (
    <div className="rounded-lg border border-amber-600/50 bg-amber-100/80 text-amber-900 text-xs px-3 py-2 text-center">
      ⚠ いまは<b>テスト用のかり局面</b>です（評価値もかりの数字）。本物の問題は準備中。
    </div>
  );
}
