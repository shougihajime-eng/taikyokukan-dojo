"use client";
// けいこ画面（コアループ）:
//   局面を表示（評価値は隠す）→ スライダーで予測 → 判定 → 開示・解説 → 次へ → 終了で集計
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ShogiCore from "@/lib/shogi/core";
import ShogiBoard from "@/components/ShogiBoard";
import EvalSlider, { type SliderMode } from "@/components/EvalSlider";
import ResultReveal from "@/components/ResultReveal";
import SampleBanner from "@/components/SampleBanner";
import { buildExplanation, type Explanation } from "@/lib/explain";
import { weightedScore, meanAbsError, bestStreak, signedBias, biasLabel, STREAK_THRESH } from "@/lib/scoring";
import { loadStudent, type Student } from "@/lib/student";

interface PositionItem {
  id: string;
  sfen: string;
  styleTag: string;
  phaseTag: string;
  isSample: boolean;
}

interface RevealData {
  actualWinrate: number;
  absError: number;
  signedError: number;
  weight: number;
  explanation: Explanation;
}

type Stage = "setup" | "loading" | "playing" | "finished" | "error";

const PHASE_LABEL: Record<string, string> = { opening: "序盤", middle: "中盤", endgame: "終盤" };
const STYLE_LABEL: Record<string, string> = { ibisha: "居飛車", furibisha: "振り飛車", other: "その他" };

export default function PlayPage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [stage, setStage] = useState<Stage>("setup");
  const [errMsg, setErrMsg] = useState("");

  // せってい
  const [mode, setMode] = useState<SliderMode>("winrate");
  const [styleFilter, setStyleFilter] = useState<"all" | "ibisha" | "furibisha">("all");
  const [count, setCount] = useState(10);

  // けいこ中
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [positions, setPositions] = useState<PositionItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [guess, setGuess] = useState(0.5);
  const [judging, setJudging] = useState(false);
  const [reveal, setReveal] = useState<RevealData | null>(null);
  const [results, setResults] = useState<RevealData[]>([]);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    setStudent(loadStudent());
  }, []);

  const current = positions[idx] ?? null;
  const state = useMemo(() => (current ? ShogiCore.parseSfen(current.sfen) : null), [current]);

  async function start() {
    setStage("loading");
    setErrMsg("");
    try {
      const res = await fetch("/api/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student?.id ?? null, mode, styleFilter, count }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrMsg(data.error ?? "はじめられませんでした");
        setStage("error");
        return;
      }
      setSessionId(data.sessionId);
      setPositions(data.positions);
      setIdx(0);
      setGuess(0.5);
      setReveal(null);
      setResults([]);
      setStreak(0);
      setStage("playing");
    } catch {
      setErrMsg("通信できませんでした。電波を確認してね");
      setStage("error");
    }
  }

  async function judge() {
    if (!current || judging) return;
    setJudging(true);
    try {
      const res = await fetch("/api/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positionId: current.id,
          guessWinrate: guess,
          sessionId,
          studentId: student?.id ?? null,
          orderNo: idx,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrMsg(data.error ?? "判定できませんでした");
        return;
      }
      const r: RevealData = {
        actualWinrate: data.actualWinrate,
        absError: data.absError,
        signedError: data.signedError,
        weight: data.weight,
        explanation: buildExplanation({
          sfen: current.sfen,
          actualCp: data.actualCp,
          actualWinrate: data.actualWinrate,
          guessWinrate: guess,
          signedError: data.signedError,
          bestMoveUsi: data.bestMoveUsi,
          pv: data.pv ?? [],
        }),
      };
      setReveal(r);
      setResults((prev) => [...prev, r]);
      setStreak((prev) => (r.absError <= STREAK_THRESH ? prev + 1 : 0));
    } catch {
      setErrMsg("通信できませんでした。電波を確認してね");
    } finally {
      setJudging(false);
    }
  }

  async function next() {
    if (idx + 1 < positions.length) {
      setIdx(idx + 1);
      setGuess(0.5);
      setReveal(null);
      setErrMsg("");
      return;
    }
    // 終了: ログイン済みならサーバーで集計確定（表示は手元の results からでも出せる）
    if (sessionId && student) {
      try {
        await fetch("/api/session/finish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, studentId: student.id }),
        });
      } catch {
        // 保存に失敗しても結果表示は出す
      }
    }
    setStage("finished");
  }

  // ===== せってい画面 =====
  if (stage === "setup" || stage === "loading" || stage === "error") {
    return (
      <main className="flex-1 w-full max-w-130 mx-auto px-4 py-8">
        <div className="stagger flex flex-col gap-5">
          <header className="text-center">
            <h1 className="font-fude text-4xl">けいこの準備</h1>
            {!student && (
              <p className="mt-2 text-xs rounded-lg bg-white/60 border border-amber-900/20 px-3 py-2">
                いまは<b>おためしモード</b>（きろくは残りません）。きろくを残すには
                <Link href="/" className="underline font-bold mx-1">ホーム</Link>でログインしてね
              </p>
            )}
          </header>

          <section className="rounded-2xl border border-amber-900/20 bg-white/55 p-5 flex flex-col gap-4">
            <div>
              <p className="font-bold text-sm mb-1.5">よそくの仕方</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("winrate")}
                  className={`rounded-xl border-2 py-2.5 text-sm font-bold transition ${mode === "winrate" ? "border-[#b32718] bg-[#b32718]/10" : "border-[#3b2f1e]/25"}`}
                >
                  勝率で予測
                  <span className="block text-[10px] font-normal opacity-70">0〜100%（おすすめ）</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("cp")}
                  className={`rounded-xl border-2 py-2.5 text-sm font-bold transition ${mode === "cp" ? "border-[#b32718] bg-[#b32718]/10" : "border-[#3b2f1e]/25"}`}
                >
                  評価値で予測
                  <span className="block text-[10px] font-normal opacity-70">±2000（上級）</span>
                </button>
              </div>
            </div>

            <div>
              <p className="font-bold text-sm mb-1.5">出題する戦法</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ["all", "すべて"],
                  ["ibisha", "居飛車"],
                  ["furibisha", "振り飛車"],
                ] as const).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setStyleFilter(v)}
                    className={`rounded-xl border-2 py-2.5 text-sm font-bold transition ${styleFilter === v ? "border-[#b32718] bg-[#b32718]/10" : "border-[#3b2f1e]/25"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="font-bold text-sm mb-1.5">問題数</p>
              <div className="grid grid-cols-3 gap-2">
                {[10, 15, 20].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCount(n)}
                    className={`rounded-xl border-2 py-2.5 text-sm font-bold transition ${count === n ? "border-[#b32718] bg-[#b32718]/10" : "border-[#3b2f1e]/25"}`}
                  >
                    {n}問
                  </button>
                ))}
              </div>
            </div>

            {stage === "error" && <p className="text-sm text-[#b32718]">{errMsg}</p>}

            <button
              type="button"
              onClick={start}
              disabled={stage === "loading"}
              className="rounded-xl bg-gradient-to-b from-[#d8442e] to-[#b32718] text-[#fff6ec] font-bold text-lg py-3.5 shadow-md active:scale-[0.98] transition disabled:opacity-60"
            >
              {stage === "loading" ? "じゅんび中…" : "▶ けいこ開始"}
            </button>
          </section>

          <footer className="text-center text-xs opacity-70">
            <Link href="/" className="underline underline-offset-2">← ホームへ</Link>
          </footer>
        </div>
      </main>
    );
  }

  // ===== 結果画面 =====
  if (stage === "finished") {
    const score = weightedScore(results.map((r) => ({ absError: r.absError, weight: r.weight })));
    const meanErr = Math.round(meanAbsError(results.map((r) => r.absError)) * 100);
    const bias = signedBias(results.map((r) => r.signedError));
    const stk = bestStreak(results.map((r) => r.absError));
    return (
      <main className="flex-1 w-full max-w-130 mx-auto px-4 py-8">
        <div className="stagger flex flex-col gap-5">
          <header className="text-center">
            <h1 className="font-fude text-4xl">けいこ終了</h1>
            {!student && <p className="mt-1 text-xs opacity-70">（おためしモードのため、きろくは残っていません）</p>}
          </header>

          <section className="rounded-2xl border border-amber-900/20 bg-white/60 p-5 text-center">
            <p className="text-sm opacity-75">大局観の精度ポイント</p>
            <p className="font-fude text-7xl leading-none my-2 text-[#b32718] pop-num">{score}</p>
            <p className="text-xs opacity-60">（100にちかいほど正確・互角の局面ほど重く採点）</p>
          </section>

          <section className="rounded-2xl border border-amber-900/20 bg-white/60 p-5 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs opacity-70">平均のズレ</p>
              <p className="text-2xl font-bold">{meanErr}<span className="text-sm">pt</span></p>
            </div>
            <div>
              <p className="text-xs opacity-70">最高れんぞく</p>
              <p className="text-2xl font-bold">{stk}<span className="text-sm">回</span></p>
            </div>
            <div>
              <p className="text-xs opacity-70">今回のクセ</p>
              <p className="text-sm font-bold mt-1.5">{biasLabel(bias)}</p>
            </div>
          </section>

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => setStage("setup")}
              className="rounded-xl bg-gradient-to-b from-[#d8442e] to-[#b32718] text-[#fff6ec] font-bold py-3 shadow-md active:scale-[0.98] transition"
            >
              🔁 もういちど けいこする
            </button>
            <Link href="/dashboard" className="text-center rounded-xl border-2 border-[#3b2f1e]/70 font-bold py-3 active:scale-[0.98] transition">
              📈 じぶんのクセを見る
            </Link>
            <Link href="/" className="text-center text-sm underline underline-offset-2 opacity-75 py-1">
              ← ホームへ
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ===== けいこ中 =====
  if (!current || !state) {
    return <main className="p-6 text-center">局面を読み込めませんでした</main>;
  }
  const turnLabel = state.turn === "sente" ? "▲先手の番" : "△後手の番";

  return (
    <main className="flex-1 w-full max-w-130 mx-auto px-3 py-4">
      <div className="flex flex-col gap-3">
        {/* 進行ヘッダー */}
        <div className="flex items-center justify-between text-sm">
          <Link href="/" className="opacity-70 underline underline-offset-2 text-xs">← やめる</Link>
          <span className="font-bold">
            第{idx + 1}問 <span className="opacity-60 font-normal">／ 全{positions.length}問</span>
          </span>
          <span className={`text-xs font-bold ${streak >= 2 ? "bounce-soft text-[#b32718]" : "opacity-60"}`}>
            🔥{streak}連続
          </span>
        </div>

        {current.isSample && <SampleBanner />}

        {/* 局面の情報（評価値は隠す） */}
        <div className="flex items-center justify-center gap-2 text-xs">
          <span className="rounded-full bg-[#3b2f1e] text-[#fff6ec] px-2.5 py-1 font-bold">{turnLabel}</span>
          <span className="rounded-full border border-[#3b2f1e]/30 px-2.5 py-1">{STYLE_LABEL[current.styleTag] ?? "—"}</span>
          <span className="rounded-full border border-[#3b2f1e]/30 px-2.5 py-1">{PHASE_LABEL[current.phaseTag] ?? "—"}</span>
        </div>

        <ShogiBoard state={state} />

        {!reveal ? (
          <div className="rounded-2xl border border-amber-900/20 bg-white/60 p-4 flex flex-col gap-3">
            <p className="text-center text-sm font-bold">
              この局面、<span className="text-[#b32718]">先手から見て</span>どれくらい？
            </p>
            <EvalSlider mode={mode} value={guess} onChange={setGuess} disabled={judging} />
            {errMsg && <p className="text-sm text-[#b32718] text-center">{errMsg}</p>}
            <button
              type="button"
              onClick={judge}
              disabled={judging}
              className="rounded-xl bg-gradient-to-b from-[#d8442e] to-[#b32718] text-[#fff6ec] font-bold text-lg py-3 shadow-md active:scale-[0.98] transition disabled:opacity-60"
            >
              {judging ? "判定中…" : "⚖ 判定する"}
            </button>
          </div>
        ) : (
          <>
            <ResultReveal
              guessWinrate={guess}
              actualWinrate={reveal.actualWinrate}
              absError={reveal.absError}
              explanation={reveal.explanation}
              phaseTag={current.phaseTag}
            />
            <button
              type="button"
              onClick={next}
              className="rounded-xl bg-[#3b2f1e] text-[#fff6ec] font-bold text-lg py-3 shadow-md active:scale-[0.98] transition"
            >
              {idx + 1 < positions.length ? `次の局面へ（第${idx + 2}問）→` : "結果を見る →"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
