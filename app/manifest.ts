import type { MetadataRoute } from "next";

// スマホの「ホーム画面に追加」で、本物のアプリのように全画面で開くための設定
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "大局観道場｜形勢判断トレーニング",
    short_name: "大局観",
    description:
      "局面の形勢をスライダーで予測し、エンジンの評価とのズレを採点。自分の判断のクセを見つけて大局観を鍛える将棋トレーニングアプリ。",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#05070f",
    theme_color: "#0a0f20",
    lang: "ja",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
