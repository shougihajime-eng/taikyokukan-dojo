"use client";
// クセ分析ダッシュボード: 符号付き誤差の傾向を 全体/戦法別/局面帯別/互角vs大差 で見せる。
import { useEffect, useState } from "react";
import Link from "next/link";
import TrendChart, { type TrendPoint } from "@/components/TrendChart";
import AppHeader from "@/components/AppHeader";
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
      <div className="flex items-center gap-3 py-2">
        <span className="w-20 shrink-0 text-xs font-bold">{name}</span>
        <span className="text-xs text-[var(--sumi-soft)]">データ不足（あと{stat.needMore ?? "?"}問で表示）</span>
      </div>
    );
  }
  const pt = Math.round((stat.bias ?? 0) * 100); // ±pt
  const widthPct = Math.min(50, Math.abs(pt) * 2.5); // 20ptで振り切れ
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-20 shrink-0 text-xs font-bold">{name}</span>
      <div className="bias-track flex-1">
        <span className="bias-mid" aria-hidden />
        <span
          className="absolute top-1 bottom-1 rounded-full"
          style={
            pt >= 0
              ? { left: "50%", width: `${widthPct}%`, background: "linear-gradient(90deg,#ff7d57,#e8492a)" }
              : { right: "50%", width: `${widthPct}%`, background: "linear-gradient(270deg,#9aa9ee,#5a64a0)" }
          }
        />
      </div>
      <span className="w-16 shrink-0 text-right text-xs font-bold tnum">
        {pt > 0 ? `+${pt}` : pt}pt
        <span className="block text-[9px] font-normal text-[var(--sumi-soft)]">{stat.count}問</span>
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
    <main className="flex flex-col flex-1">
      <AppHeader back="/" backLabel="ホーム" />
      <div className="app-main safe-bottom pt-5">
        <div className="wrap wrap-readable stagger flex flex-col gap-5">
          <header className="text-center">
            <h1 className="font-mincho text-3xl">あなたのクセ</h1>
            <p className="mt-1 text-xs text-[var(--sumi-soft)]">
              <span className="text-[var(--shu)] font-bold">＋</span>先手を高く見がち ／{" "}
              <span className="text-[var(--ai)] font-bold">−</span>低く見がち
            </p>
          </header>

          {!loaded ? (
            <p className="text-center text-sm text-[var(--sumi-soft)] py-10">読み込み中…</p>
          ) : !student ? (
            <section className="card card-pad text-center flex flex-col gap-3">
              <p className="text-5xl">🔒</p>
              <p className="text-sm leading-relaxed">
                クセ分析を見るには、ホームで<b>ログイン</b>してから
                <br />
                けいこの記録をためてください
              </p>
              <Link href="/" className="btn btn-sumi">
                ホームでログインする
              </Link>
            </section>
          ) : errMsg ? (
            <p className="text-center text-sm text-[var(--shu)] py-10">{errMsg}</p>
          ) : !data || data.totalGuesses < 10 ? (
            <section className="card card-pad text-center flex flex-col gap-3">
              <p className="text-5xl">🌱</p>
              <p className="text-sm leading-relaxed">
                まだデータが足りません（いま {data?.totalGuesses ?? 0} 問）。
                <br />
                <b>10問</b>こえると、あなたのクセが見えてきます
              </p>
              <Link href="/play" className="btn btn-shu">
                ▶ けいこをはじめる
              </Link>
            </section>
          ) : (
            <>
              {/* 全体のクセ */}
              <section className="card card-kin card-pad text-center">
                <p className="label-eyebrow">ぜんたいの傾向（{data.overall.count}問ぶん）</p>
                <p className="font-mincho text-[clamp(1.8rem,8vw,2.5rem)] my-2 text-[var(--shu)]">{data.overall.label}</p>
                {data.overall.enough && (
                  <p className="text-sm text-[var(--sumi-soft)] tnum">
                    平均 {Math.round((data.overall.bias ?? 0) * 100) > 0 ? "+" : ""}
                    {Math.round((data.overall.bias ?? 0) * 100)}pt ／ ズレ平均{" "}
                    {Math.round((data.overall.meanAbsError ?? 0) * 100)}pt
                  </p>
                )}
              </section>

              {/* 精度の推移 */}
              <section className="card card-pad">
                <h2 className="font-bold text-sm mb-2">📈 精度ポイントの推移</h2>
                {data.trend.length >= 2 ? (
                  <TrendChart data={data.trend} />
                ) : (
                  <p className="text-xs text-[var(--sumi-soft)] py-6 text-center">
                    けいこを2回以上終えると、折れ線グラフが出ます
                  </p>
                )}
              </section>

              {/* iPadは戦法別と局面帯別を2段に */}
              <div className="md:grid md:grid-cols-2 md:gap-4 flex flex-col gap-5">
                <section className="card card-pad">
                  <h2 className="font-bold text-sm mb-1">⚔ 戦法別のクセ</h2>
                  <BiasRow name="居飛車" stat={data.byStyle.ibisha} />
                  <BiasRow name="振り飛車" stat={data.byStyle.furibisha} />
                  <BiasRow name="その他" stat={data.byStyle.other} />
                </section>

                <section className="card card-pad">
                  <h2 className="font-bold text-sm mb-1">⏳ 序盤・中盤・終盤のクセ</h2>
                  <BiasRow name="序盤" stat={data.byPhase.opening} />
                  <BiasRow name="中盤" stat={data.byPhase.middle} />
                  <BiasRow name="終盤" stat={data.byPhase.endgame} />
                </section>
              </div>

              {/* 互角 vs 大差 */}
              <section className="card card-pad">
                <h2 className="font-bold text-sm mb-1">⚖ 競り合いと大差のクセ</h2>
                <BiasRow name="互角の局面" stat={data.evenVsBig.even} />
                <BiasRow name="大差の局面" stat={data.evenVsBig.big} />
              </section>

              <Link href="/play" className="btn btn-shu">
                ▶ もっとけいこする
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
