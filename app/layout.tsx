import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "大局観道場｜形勢判断トレーニング",
  description:
    "局面の形勢をスライダーで予測して、エンジンの評価とのズレを採点。自分の判断のクセを見つけて大局観を鍛える将棋トレーニングアプリ。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// 駒に使う文字だけを読み込む（軽くするため）
const KOMA_CHARS = encodeURIComponent("歩香桂銀金角飛玉王と杏圭全馬龍");
const FUDE_CHARS = encodeURIComponent("歩香桂銀金角飛玉王と杏圭全馬龍大局観道場たいきょくかん");

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* 駒の書体: 楷書（しっぽり明朝）・筆文字（ゆうじ朱駆）・ゲーム（ドットゴシック） */}
        <link
          href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href={`https://fonts.googleapis.com/css2?family=Yuji+Syuku&text=${FUDE_CHARS}&display=swap`}
          rel="stylesheet"
        />
        <link
          href={`https://fonts.googleapis.com/css2?family=DotGothic16&text=${KOMA_CHARS}&display=swap`}
          rel="stylesheet"
        />
        {/* まる文字（ひらがな駒と見出し用） */}
        <link
          href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
