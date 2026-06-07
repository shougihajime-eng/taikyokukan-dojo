"use client";
// 「解説の名人」のまめちしき: 形勢判断の定番の考え方を固定文で見せる。
// ⚠ ここは将棋で広く教えられている一般知識のみ。この局面に固有の断定はしない
//   （局面固有のことは評価値・最善手・駒の損得＝確かなデータだけに語らせる方針）。

/** 局面帯ごとの「見るコツ」(固定文) */
const PHASE_TIP: Record<string, { title: string; body: string }> = {
  opening: {
    title: "序盤を見るコツ",
    body: "序盤はまだ大きな差がつきにくい時期。駒の損得よりも「駒組みがスムーズに進んでいるか」「角や飛車の働きに差がないか」をくらべるのがコツです。",
  },
  middle: {
    title: "中盤を見るコツ",
    body: "中盤は4つのものさしが全部きいてきます。とくに「駒の損得」と「玉の堅さ」のつりあいで考えるのがコツ。駒得していても玉が薄ければ、差し引きで互角に近いこともあります。",
  },
  endgame: {
    title: "終盤を見るコツ",
    body: "終盤は駒の損得より「どちらの玉が先につかまりそうか（速さ）」が大事。大駒を渡しても先に寄せ切れるなら良し、逆に駒得でも自玉が危なければ形勢は悪いこともあります。",
  },
};

const MONOSASHI: { name: string; how: string }[] = [
  { name: "① 駒の損得", how: "取った駒と取られた駒をくらべる（上の「駒の損得」欄が機械数えの正確な答え）" },
  { name: "② 玉の堅さ", how: "自分の玉のまわりに守りの金銀が何枚いるか。囲いの完成度をくらべる" },
  { name: "③ 駒の働き", how: "遊んでいる（仕事のない）駒がないか。同じ駒でも働きで価値が変わる" },
  { name: "④ 手番", how: "次に指せるのはどちらか。攻めの一手を先にえらべる側が少しトク" },
];

export default function MasterTips({ phaseTag }: { phaseTag?: string }) {
  const tip = phaseTag ? PHASE_TIP[phaseTag] : undefined;
  return (
    <details className="rounded-xl border border-amber-900/15 bg-white/55 px-3 py-2 text-sm">
      <summary className="cursor-pointer select-none font-bold text-[#5d4a2f]">
        📖 形勢判断の4つのものさし（まめちしき）
      </summary>
      <div className="mt-2 flex flex-col gap-2 leading-relaxed">
        <ul className="flex flex-col gap-1">
          {MONOSASHI.map((m) => (
            <li key={m.name}>
              <span className="font-bold">{m.name}</span>
              <span className="opacity-80">　{m.how}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs opacity-70">
          駒の価値の目安: 飛10・角8・金6・銀5・桂4・香3・歩1（歩を1とした広く使われる数え方）
        </p>
        {tip && (
          <div className="rounded-lg bg-[#fbf4e2] border border-amber-900/15 px-3 py-2">
            <p className="font-bold text-xs text-[#b32718]">{tip.title}</p>
            <p className="text-xs mt-0.5">{tip.body}</p>
          </div>
        )}
      </div>
    </details>
  );
}
