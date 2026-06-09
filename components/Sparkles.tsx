"use client";
// ピタリ正解のときに放射する金の火花（CSS だけ・軽量）。
// 中心から外へ飛ぶ小さな光を count 個ならべる。色・距離は good の度合いで変える。
// reduced-motion のときは globals.css 側で非表示。

export default function Sparkles({
  count = 12,
  spread = 76,
  color,
}: {
  count?: number;
  spread?: number; // 飛ぶ距離(px)
  color?: string;
}) {
  return (
    <span className="pointer-events-none absolute inset-0 z-10 overflow-visible" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const angle = (360 / count) * i + (i % 2 === 0 ? 0 : 18);
        const dist = spread * (0.7 + (i % 3) * 0.15);
        const dx = Math.cos((angle * Math.PI) / 180) * dist;
        const dy = Math.sin((angle * Math.PI) / 180) * dist;
        const delay = (i % 4) * 0.04;
        return (
          <span
            key={i}
            className="spark"
            style={
              {
                "--dx": `${dx.toFixed(1)}px`,
                "--dy": `${dy.toFixed(1)}px`,
                animationDelay: `${delay}s`,
                ...(color ? { background: `radial-gradient(circle, #fff 0%, ${color} 45%, transparent 72%)` } : {}),
              } as React.CSSProperties
            }
          />
        );
      })}
    </span>
  );
}
