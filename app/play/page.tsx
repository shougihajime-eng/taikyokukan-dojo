"use client";
// /play 形勢判断トレーニングの本体（いまは盤の表示確認用の仮ページ）
import ShogiCore from "@/lib/shogi/core";
import ShogiBoard from "@/components/ShogiBoard";

const STARTPOS = "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1";

export default function PlayPage() {
  const state = ShogiCore.parseSfen(STARTPOS);
  if (!state) return <main className="p-6">局面を読み込めませんでした</main>;
  return (
    <main className="flex-1 w-full max-w-130 mx-auto px-3 py-4">
      <h1 className="font-fude text-2xl mb-3">大局観道場（盤の表示テスト）</h1>
      <ShogiBoard state={state} />
    </main>
  );
}
