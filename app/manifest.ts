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
    orientation: "portrait",
    background_color: "#f2e4c5",
    theme_color: "#f2e4c5",
    lang: "ja",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
