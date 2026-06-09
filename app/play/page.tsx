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
import AppHeader from "@/components/AppHeader";
import Sparkles from "@/components/Sparkles";
import { buildExplanation, type Explanation } from "@/lib/explain";
import { weightedScore, meanAbsError, bestStreak, signedBias, biasLabel, STREAK_THRESH } from "@/lib/scoring";
import { loadStudent, type Student } from "@/lib/student";
import { useCountUp } from "@/lib/useCountUp";

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
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    setStudent(loadStudent());
  }, []);

  // 判定したしゅんかんに盤を光らせる＋スマホはそっと振動
  useEffect(() => {
    if (!reveal) return;
    setBurst(true);
    try {
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (!reduce && typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(reveal.absError <= 0.03 ? [14, 44, 20] : 10);
      }
    } catch {
      /* 振動できない端末は無視 */
    }
    const t = setTimeout(() => setBurst(false), 760);
    return () => clearTimeout(t);
  }, [reveal]);

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
          phase: current.phaseTag,
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
      if (typeof window !== "undefined") {
        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      }
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
      <main className="flex flex-col flex-1">
        <AppHeader back="/" backLabel="ホーム" />
        <div className="app-main safe-bottom pt-6">
          <div className="wrap wrap-readable stagger flex flex-col gap-5">
            <header className="text-center">
              <p className="label-eyebrow">けいこの準備</p>
              <h1 className="font-mincho text-3xl mt-1">どんな けいこ にする？</h1>
              {!student && (
                <p className="mt-3 text-xs text-[var(--sumi-soft)] inline-block rounded-full bg-white/5 border border-[var(--line)] px-3 py-1.5">
                  いまは<b className="text-[var(--kin)]">おためし</b>（きろくは残りません）・
                  <Link href="/" className="underline font-bold text-[var(--kin-light)]">ホームでログイン</Link>すると保存されます
                </p>
              )}
            </header>

            <section className="card card-pad flex flex-col gap-5">
              <Choice
                label="よそくの仕方"
                value={mode}
                onChange={(v) => setMode(v as SliderMode)}
                options={[
                  { v: "winrate", label: "勝率で予測", sub: "0〜100%（おすすめ）" },
                  { v: "cp", label: "評価値で予測", sub: "±2000（上級）" },
                ]}
                cols={2}
              />
              <Choice
                label="出題する戦法"
                value={styleFilter}
                onChange={(v) => setStyleFilter(v as "all" | "ibisha" | "furibisha")}
                options={[
                  { v: "all", label: "すべて" },
                  { v: "ibisha", label: "居飛車" },
                  { v: "furibisha", label: "振り飛車" },
                ]}
                cols={3}
              />
              <Choice
                label="問題数"
                value={String(count)}
                onChange={(v) => setCount(Number(v))}
                options={[
                  { v: "10", label: "10問" },
                  { v: "15", label: "15問" },
                  { v: "20", label: "20問" },
                ]}
                cols={3}
              />

              {stage === "error" && <p className="text-sm text-[var(--shu-bright)]">{errMsg}</p>}

              <button type="button" onClick={start} disabled={stage === "loading"} className="btn btn-shu text-lg">
                {stage === "loading" ? "じゅんび中…" : "▶ けいこ開始"}
              </button>
            </section>
          </div>
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
      <main className="flex flex-col flex-1">
        <AppHeader back="/" backLabel="ホーム" />
        <div className="app-main safe-bottom pt-6">
          <div className="wrap wrap-readable stagger flex flex-col gap-5">
            <header className="text-center">
              <p className="label-eyebrow">けいこ終了</p>
              <h1 className="font-mincho text-3xl mt-1">今日の大局観</h1>
              {!student && <p className="mt-1 text-xs text-[var(--sumi-soft)]">（おためしのため、きろくは残っていません）</p>}
            </header>

            <ScoreCard score={score} />

            <section className="card card-pad grid grid-cols-3 gap-2 text-center divide-x divide-[var(--line)]">
              <Stat label="平均のズレ" value={`${meanErr}`} unit="pt" />
              <Stat label="最高れんぞく" value={`${stk}`} unit="回" />
              <Stat label="今回のクセ" text={biasLabel(bias)} />
            </section>

            <div className="flex flex-col gap-2.5">
              <button type="button" onClick={() => setStage("setup")} className="btn btn-shu">
                🔁 もういちど けいこする
              </button>
              <Link href="/dashboard" className="btn btn-ghost">
                📈 じぶんのクセを見る
              </Link>
            </div>
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
    <main className="flex flex-col flex-1">
      <AppHeader back="/" backLabel="やめる" />
      <div className="app-main safe-bottom pt-3">
        <div className="wrap wrap-wide flex flex-col gap-3">
          {/* 進行 */}
          <div className="flex items-center justify-between">
            <span className="font-mincho text-lg">
              第{idx + 1}問<span className="text-sm text-[var(--sumi-soft)] font-sans"> ／ 全{positions.length}問</span>
            </span>
            <span className={`chip ${streak >= 2 ? "streak-aura bounce-soft" : ""}`}>🔥 {streak}連続</span>
          </div>
          {/* 進行バー */}
          <div className="h-1.5 rounded-full bg-[var(--line)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--kin-light)] to-[var(--shu)] transition-all duration-500"
              style={{ width: `${((idx + (reveal ? 1 : 0)) / positions.length) * 100}%` }}
            />
          </div>

          {current.isSample && <SampleBanner />}

          {/* iPad横・横向きスマホは2段組（盤｜操作）、たて持ちは縦積み */}
          <div className="play-grid">
            {/* 盤と局面情報 */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span className="chip chip-fill">{turnLabel}</span>
                <span className="chip">{STYLE_LABEL[current.styleTag] ?? "—"}</span>
                <span className="chip">{PHASE_LABEL[current.phaseTag] ?? "—"}</span>
              </div>
              <div className="board-stage">
                {burst && <span className="judge-burst" aria-hidden />}
                <ShogiBoard state={state} />
              </div>
            </div>

            {/* 操作（予測 → 判定 → 開示） */}
            <div className="play-side lg:sticky lg:top-[70px] flex flex-col gap-3">
              {!reveal ? (
                <div className="card card-pad flex flex-col gap-4">
                  <p className="text-center font-mincho text-lg">
                    <span className="text-[var(--kin-light)]">先手から見て</span>どれくらい？
                  </p>
                  <EvalSlider mode={mode} value={guess} onChange={setGuess} disabled={judging} />
                  {errMsg && <p className="text-sm text-[var(--shu-bright)] text-center">{errMsg}</p>}
                  <button type="button" onClick={judge} disabled={judging} className="btn btn-shu text-lg">
                    {judging ? "判定中…" : "⚖ 形勢を判定する"}
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
                  <button type="button" onClick={next} className="btn btn-sumi text-lg">
                    {idx + 1 < positions.length ? `次の局面へ（第${idx + 2}問）→` : "結果を見る →"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ===== 小さな部品 ===== */
function ScoreCard({ score }: { score: number }) {
  const shown = useCountUp(score, 1000);
  const grade =
    score >= 85 ? "免許皆伝" : score >= 70 ? "高段者" : score >= 55 ? "有段者" : score >= 40 ? "級位者" : "修行中";
  const high = score >= 85;
  return (
    <section className="card card-kin card-pad text-center relative overflow-hidden">
      {high && <Sparkles count={16} spread={120} />}
      <p className="label-eyebrow">大局観の精度ポイント</p>
      <p
        className="font-mincho text-[clamp(4.5rem,26vw,7rem)] leading-none my-1 text-[var(--kin-light)] tnum"
        style={{ textShadow: "0 0 40px rgba(231,201,135,0.45)" }}
      >
        {shown}
      </p>
      <p className="inline-block font-fude text-lg px-4 py-0.5 rounded-full bg-[var(--shu)]/15 text-[var(--kin-light)]">
        {grade}
      </p>
      <p className="text-xs text-[var(--sumi-soft)] mt-2">100にちかいほど正確・互角の局面ほど重く採点します</p>
    </section>
  );
}

function Choice({
  label,
  value,
  onChange,
  options,
  cols,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; label: string; sub?: string }[];
  cols: 2 | 3;
}) {
  return (
    <div>
      <p className="label-eyebrow mb-2">{label}</p>
      <div className={`grid gap-2 ${cols === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
        {options.map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            className={`rounded-xl border-2 py-2.5 px-1 text-sm font-bold transition ${
              value === o.v
                ? "border-[var(--kin)] bg-[var(--kin)]/12 text-[var(--kin-light)]"
                : "border-[var(--line-strong)] text-[var(--sumi)]"
            }`}
          >
            {o.label}
            {o.sub && <span className="block text-[10px] font-normal text-[var(--sumi-soft)]">{o.sub}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, unit, text }: { label: string; value?: string; unit?: string; text?: string }) {
  return (
    <div className="px-1">
      <p className="text-[11px] text-[var(--sumi-soft)]">{label}</p>
      {text ? (
        <p className="text-sm font-bold mt-2 leading-tight">{text}</p>
      ) : (
        <p className="text-2xl font-bold tnum mt-1">
          {value}
          {unit && <span className="text-sm font-normal"> {unit}</span>}
        </p>
      )}
    </div>
  );
}
