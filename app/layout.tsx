import type { Metadata, Viewport } from "next";
import { SPLASH_CHARS } from "@/lib/text";
import "./globals.css";

export const metadata: Metadata = {
  title: "大局観道場｜形勢判断トレーニング",
  description:
    "局面の形勢をスライダーで予測して、エンジンの評価とのズレを採点。自分の判断のクセを見つけて大局観を鍛える将棋トレーニングアプリ。",
  applicationName: "大局観道場",
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "大局観",
  },
  openGraph: {
    title: "大局観道場｜形勢判断トレーニング",
    description:
      "局面の形勢をスライダーで予測して、エンジンの評価とのズレを採点。自分の判断のクセを見つけて大局観を鍛える将棋トレーニングアプリ。",
    type: "website",
    locale: "ja_JP",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // ピンチ拡大は禁止しない（弱視の方・小さい字を読みたい方のため）
  viewportFit: "cover", // iPhone のノッチ・ホームバー領域まで使う
  themeColor: "#FBEDDC",
};

// 駒に使う文字だけを読み込む（軽くするため）
const KOMA_CHARS = encodeURIComponent("歩香桂銀金角飛玉王と杏圭全馬龍");
// 筆文字は題字・落款・起動画面のロゴ／序文にも使うので、その文字も読み込む
const FUDE_CHARS = encodeURIComponent("歩香桂銀金角飛玉王と杏圭全馬龍大局観道場たいきょくかんどう先手後手互角" + SPLASH_CHARS);

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
        {/* 見出し: 絵本のような飾り明朝（Kaisei Decol＝共通デザインシステム） */}
        <link
          href="https://fonts.googleapis.com/css2?family=Kaisei+Decol:wght@500;700&display=swap"
          rel="stylesheet"
        />
        {/* 駒の字・題字: しっぽり明朝 */}
        <link
          href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* 題字・落款: 筆文字（必要な字だけ） */}
        <link
          href={`https://fonts.googleapis.com/css2?family=Yuji+Syuku&text=${FUDE_CHARS}&display=swap`}
          rel="stylesheet"
        />
        {/* 駒の書体オプション */}
        <link
          href={`https://fonts.googleapis.com/css2?family=DotGothic16&text=${KOMA_CHARS}&display=swap`}
          rel="stylesheet"
        />
        {/* 本文の書体: 丸ゴシック（Zen Maru Gothic＝安心のやわらかさ） */}
        <link
          href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@400;500;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
