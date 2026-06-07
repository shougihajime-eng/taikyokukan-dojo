"use client";
// 「解説の名人」のまめちしき: 形勢判断の定番の考え方を固定文で見せる。
// ⚠ ここは将棋で広く教えられている一般知識のみ。この局面に固有の断定はしない
//   （局面固有のことは評価値・最善手・駒の損得＝確かなデータだけに語らせる方針）。
// 「やさしい／くわしい」の2モードを用意し、選んだモードは端末に覚えさせる（次回も同じ表示）。
import { useEffect, useState } from "react";

type Level = "easy" | "deep";
const STORE_KEY = "taikyokukan-tips-level";

/** 4つのものさし: やさしい版とくわしい版の両方を持つ */
const MONOSASHI: { name: string; easy: string; deep: string }[] = [
  {
    name: "① 駒の損得（こまのそんとく）",
    easy: "どっちがたくさん駒を取ったかな？　上の「駒の損得」が、きかいが数えた正かいだよ。",
    deep: "取った駒と取られた駒を価値で差し引きする。上の「駒の損得」欄が盤上＋持ち駒の機械数え（成駒は元の駒で計算）。同じ枚数でも飛角を取られた方が痛い。",
  },
  {
    name: "② 玉の堅さ（ぎょくのかたさ）",
    easy: "じぶんの王さまのまわりに、まもりの金や銀が何まいいるかな？　多いほど安心だよ。",
    deep: "玉の周囲の金銀の枚数と囲いの完成度を見る。美濃・矢倉・穴熊など囲いの種類で堅さがちがう。堅い側は多少の駒損より粘り強い。",
  },
  {
    name: "③ 駒の働き（こまのはたらき）",
    easy: "おやすみしてる（はたらいてない）駒がないかな？　みんなはたらいてる方がつよいよ。",
    deep: "遊び駒（働いていない駒）の有無を見る。盤の隅で眠る飛角は価値が大きく下がり、逆に好位置の桂銀は数字以上に働く。駒の損得と合わせて判断する。",
  },
  {
    name: "④ 手番（てばん）",
    easy: "つぎに指せるのはどっちかな？　さきに攻められる方がちょっとだけトクだよ。",
    deep: "次に着手できる側の利。終盤の寄せ合いでは一手の価値が極端に高まり、手番の有無が勝敗を直接分けることも多い（『一手勝ち』）。",
  },
];

const VALUE_LINE: Record<Level, string> = {
  easy: "駒のつよさのめやす: 飛車がいちばん上、つぎに角、金、銀…のじゅんだよ。",
  deep: "駒の価値の目安: 飛10・角8・金6・銀5・桂4・香3・歩1（歩を1とした広く使われる換算。成駒はおおむね金相当）。",
};

/** 局面帯ごとの「見るコツ」(固定文)・やさしい/くわしい両方 */
const PHASE_TIP: Record<string, { title: string; easy: string; deep: string }> = {
  opening: {
    title: "序盤（じょばん）を見るコツ",
    easy: "はじめのうちは大きな差はつきにくいよ。駒組みがうまく進んでいるか、角や飛車がちゃんとはたらいているかを見よう。",
    deep: "序盤は差がつきにくい。駒の損得より駒組みの効率と大駒の働きの差を重視する。無理な仕掛けで損をしていないかを確認。",
  },
  middle: {
    title: "中盤（ちゅうばん）を見るコツ",
    easy: "中ばんは4つのものさしが全部だいじ。とくに「駒の損得」と「玉の堅さ」をくらべてみよう。",
    deep: "中盤は4要素すべてが効く。駒得と玉の堅さのトレードオフが核心で、駒得でも玉が薄ければ差し引き互角のことも。攻めが続くかどうかの『速度』も加味する。",
  },
  endgame: {
    title: "終盤（しゅうばん）を見るコツ",
    easy: "終ばんは「どっちの王さまが先につかまりそうか」がいちばんだいじ。駒の数より速さだよ。",
    deep: "終盤は駒の損得より『どちらの玉が先に詰むか（速度）』が最優先。大駒を捨てても先に寄せ切れれば良く、駒得でも自玉が危なければ形勢は悪い。",
  },
};

export default function MasterTips({ phaseTag }: { phaseTag?: string }) {
  const [level, setLevel] = useState<Level>("easy");

  // 端末に覚えさせたモードを読み込む
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved === "easy" || saved === "deep") setLevel(saved);
    } catch {
      /* localStorage が使えなくても既定値で動く */
    }
  }, []);

  function choose(next: Level) {
    setLevel(next);
    try {
      localStorage.setItem(STORE_KEY, next);
    } catch {
      /* 保存できなくても表示は切り替わる */
    }
  }

  const tip = phaseTag ? PHASE_TIP[phaseTag] : undefined;

  return (
    <details className="rounded-xl border border-[var(--line)] bg-white/55 px-3.5 py-2.5 text-sm">
      <summary className="cursor-pointer select-none font-bold text-[var(--sumi-soft)]">
        📖 形勢判断の4つのものさし（まめちしき）
      </summary>
      <div className="mt-2.5 flex flex-col gap-2.5 leading-relaxed">
        {/* やさしい / くわしい きりかえ */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-[var(--sumi-soft)]">説明の くわしさ:</span>
          {(
            [
              ["easy", "やさしい"],
              ["deep", "くわしい"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => choose(v)}
              aria-pressed={level === v}
              className={`rounded-full border px-2.5 py-0.5 font-bold transition ${
                level === v
                  ? "border-[var(--shu)] bg-[var(--shu)]/10 text-[var(--shu-deep)]"
                  : "border-[var(--line)] text-[var(--sumi-soft)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <ul className="flex flex-col gap-1.5">
          {MONOSASHI.map((m) => (
            <li key={m.name}>
              <span className="font-bold text-[var(--shu-deep)]">{m.name}</span>
              <span className="text-[var(--sumi-soft)]">　{level === "easy" ? m.easy : m.deep}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-[var(--sumi-soft)]">{VALUE_LINE[level]}</p>
        {tip && (
          <div className="rounded-lg bg-[var(--paper)] border border-[var(--line)] px-3 py-2">
            <p className="font-bold text-xs text-[var(--shu)]">{tip.title}</p>
            <p className="text-xs mt-0.5">{level === "easy" ? tip.easy : tip.deep}</p>
          </div>
        )}
      </div>
    </details>
  );
}
