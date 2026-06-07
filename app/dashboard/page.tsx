"use client";
// クセ分析ダッシュボード: 符号付き誤差の傾向を 全体/戦法別/局面帯別/互角vs大差 で見せる。
import { useEffect, useState } from "react";
import Link from "next/link";
import TrendChart, { type TrendPoint } from "@/components/TrendChart";
import { loadStudent, type Student } from "@/lib/student";

interface GroupStat {
  count: number;
  enough: boolean;
  needMore?: number;
  bias?: number; // 勝率pt(0..1)。＋=先手を高く見がち
  meanAbsError?: number;
  label?: string;
}

interface BiasData {
  overall: GroupStat;
  byStyle: { ibisha: GroupStat; furibisha: GroupStat; other: GroupStat };
  byPhase: { opening: GroupStat; middle: GroupStat; endgame: GroupStat };
  evenVsBig: { even: GroupStat; big: GroupStat };
  trend: TrendPoint[];
  totalGuesses: number;
}

/** ＋＝先手を高く・−＝低く のバー（中央が0） */
function BiasRow({ name, stat }: { name: string; stat: GroupStat }) {
  if (!stat.enough) {
    return (
      <div className="flex items-center gap-2 py-1.5">
        <span className="w-20 shrink-0 text-xs font-bold">{name}</span>
        <span className="text-xs opacity-55">
          データ不足（あと{stat.needMore ?? "?"}問で表示）
        </span>
      </div>
    );
  }
  const pt = Math.round((stat.bias ?? 0) * 100); // ±pt
  const widthPct = Math.min(50, Math.abs(pt) * 2.5); // 20ptで振り切れ
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="w-20 shrink-0 text-xs font-bold">{name}</span>
      <div className="relative flex-1 h-5 rounded-full bg-[#efe3c8] overflow-hidden">
        <span className="absolute left-1/2 top-0 bottom-0 w-px bg-[#3b2f1e]/40" />
        <span
          className="absolute top-0.5 bottom-0.5 rounded-full"
          style={
            pt >= 0
              ? { left: "50%", width: `${widthPct}%`, background: "linear-gradient(90deg,#d8442e,#b32718)" }
              : { right: "50%", width: `${widthPct}%`, background: "linear-gradient(270deg,#4b537f,#2e3458)" }
          }
        />
      </div>
      <span className="w-20 shrink-0 text-right text-xs font-bold">
        {pt > 0 ? `+${pt}` : pt}pt
        <span className="block text-[9px] font-normal opacity-60">{stat.count}問</span>
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState<BiasData | null>(null);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    const s = loadStudent();
    setStudent(s);
    if (!s) {
      setLoaded(true);
      return;
    }
    fetch("/api/bias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: s.id }),
    })
      .then(async (res) => {
        const d = await res.json();
        if (!res.ok) throw new Error(d.error ?? "読み込めませんでした");
        setData(d);
      })
      .catch((e: Error) => setErrMsg(e.message || "通信できませんでした"))
      .finally(() => setLoaded(true));
  }, []);

  return (
    <main className="flex-1 w-full max-w-130 mx-auto px-4 py-8">
      <div className="stagger flex flex-col gap-5">
        <header className="text-center">
          <h1 className="font-fude text-4xl">あなたのクセ</h1>
          <p className="mt-1 text-xs opacity-70">プラス＝先手を高く見がち ／ マイナス＝低く見がち</p>
        </header>

        {!loaded ? (
          <p className="text-center text-sm opacity-70 py-10">読み込み中…</p>
        ) : !student ? (
          <section className="rounded-2xl border border-amber-900/20 bg-white/60 p-6 text-center flex flex-col gap-3">
            <p className="text-4xl">🔒</p>
            <p className="text-sm leading-relaxed">
              クセ分析を見るには、ホームで<b>ログイン</b>してから
              <br />
              けいこの記録をためてください
            </p>
            <Link href="/" className="rounded-xl bg-[#3b2f1e] text-[#fff6ec] font-bold py-3">
              ホームでログインする
            </Link>
          </section>
        ) : errMsg ? (
          <p className="text-center text-sm text-[#b32718] py-10">{errMsg}</p>
        ) : !data || data.totalGuesses < 10 ? (
          <section className="rounded-2xl border border-amber-900/20 bg-white/60 p-6 text-center flex flex-col gap-3">
            <p className="text-4xl">🌱</p>
            <p className="text-sm leading-relaxed">
              まだデータが足りません（いま {data?.totalGuesses ?? 0} 問）。
              <br />
              <b>10問</b>こえると、あなたのクセが見えてきます
            </p>
            <Link
              href="/play"
              className="rounded-xl bg-gradient-to-b from-[#d8442e] to-[#b32718] text-[#fff6ec] font-bold py-3 shadow-md"
            >
              ▶ けいこをはじめる
            </Link>
          </section>
        ) : (
          <>
            {/* 全体のクセ */}
            <section className="rounded-2xl border border-amber-900/20 bg-white/60 p-5 text-center">
              <p className="text-xs opacity-70">ぜんたいの傾向（{data.overall.count}問ぶん）</p>
              <p className="font-fude text-3xl my-2 text-[#b32718]">{data.overall.label}</p>
              {data.overall.enough && (
                <p className="text-sm opacity-80">
                  平均 {Math.round((data.overall.bias ?? 0) * 100) > 0 ? "+" : ""}
                  {Math.round((data.overall.bias ?? 0) * 100)}pt ／ ズレ平均{" "}
                  {Math.round((data.overall.meanAbsError ?? 0) * 100)}pt
                </p>
              )}
            </section>

            {/* 精度の推移 */}
            <section className="rounded-2xl border border-amber-900/20 bg-white/60 p-5">
              <h2 className="font-bold text-sm mb-2">📈 精度ポイントの推移</h2>
              {data.trend.length >= 2 ? (
                <TrendChart data={data.trend} />
              ) : (
                <p className="text-xs opacity-55 py-4 text-center">
                  けいこを2回以上終えると、折れ線グラフが出ます
                </p>
              )}
            </section>

            {/* 戦法別 */}
            <section className="rounded-2xl border border-amber-900/20 bg-white/60 p-5">
              <h2 className="font-bold text-sm mb-1">⚔ 戦法別のクセ</h2>
              <BiasRow name="居飛車" stat={data.byStyle.ibisha} />
              <BiasRow name="振り飛車" stat={data.byStyle.furibisha} />
              <BiasRow name="その他" stat={data.byStyle.other} />
            </section>

            {/* 局面帯別 */}
            <section className="rounded-2xl border border-amber-900/20 bg-white/60 p-5">
              <h2 className="font-bold text-sm mb-1">⏳ 序盤・中盤・終盤のクセ</h2>
              <BiasRow name="序盤" stat={data.byPhase.opening} />
              <BiasRow name="中盤" stat={data.byPhase.middle} />
              <BiasRow name="終盤" stat={data.byPhase.endgame} />
            </section>

            {/* 互角 vs 大差 */}
            <section className="rounded-2xl border border-amber-900/20 bg-white/60 p-5">
              <h2 className="font-bold text-sm mb-1">⚖ 競り合いと大差のクセ</h2>
              <BiasRow name="互角の局面" stat={data.evenVsBig.even} />
              <BiasRow name="大差の局面" stat={data.evenVsBig.big} />
            </section>
          </>
        )}

        <footer className="text-center text-xs opacity-70 flex items-center justify-center gap-4">
          <Link href="/" className="underline underline-offset-2">← ホームへ</Link>
          <Link href="/play" className="underline underline-offset-2">けいこをする →</Link>
        </footer>
      </div>
    </main>
  );
}
