// クセ分析: 符号付き誤差を 全体/戦法別/局面帯別/互角vs大差 で集計し、時系列も返す。
// 集計はサーバー側で行う（生データをブラウザに送らない・service_role はサーバーのみ）。
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { signedBias, meanAbsError, biasLabel, EVEN_BAND_CP, type Phase, type Style } from "@/lib/scoring";

const MIN_SAMPLES = 5; // これ未満は「データ不足」

interface GuessRow {
  signed_error: number;
  abs_error: number;
  actual_cp: number;
  style_tag: Style;
  phase_tag: Phase;
}

function summarize(rows: GuessRow[]) {
  const count = rows.length;
  if (count < MIN_SAMPLES) {
    return { count, enough: false as const, needMore: MIN_SAMPLES - count };
  }
  const bias = signedBias(rows.map((r) => r.signed_error));
  return {
    count,
    enough: true as const,
    bias,
    meanAbsError: meanAbsError(rows.map((r) => r.abs_error)),
    label: biasLabel(bias),
  };
}

export async function POST(req: Request) {
  let body: { studentId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "形式が正しくありません" }, { status: 400 });
  }
  if (!body.studentId) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 400 });
  }

  const sb = supabaseServer();
  const [{ data: guesses, error: gErr }, { data: sessions, error: sErr }] = await Promise.all([
    sb
      .from("guesses")
      .select("signed_error, abs_error, actual_cp, style_tag, phase_tag")
      .eq("student_id", body.studentId)
      .order("created_at", { ascending: false })
      .limit(2000),
    sb
      .from("sessions")
      .select("started_at, weighted_score, signed_bias, mean_abs_error, best_streak, n_positions")
      .eq("student_id", body.studentId)
      .not("finished_at", "is", null)
      .order("started_at", { ascending: true })
      .limit(200),
  ]);
  if (gErr || sErr) {
    return NextResponse.json({ error: "記録を読み込めませんでした" }, { status: 500 });
  }

  const rows = (guesses ?? []) as GuessRow[];
  const byStyle = (s: Style) => rows.filter((r) => r.style_tag === s);
  const byPhase = (p: Phase) => rows.filter((r) => r.phase_tag === p);

  return NextResponse.json({
    overall: summarize(rows),
    byStyle: {
      ibisha: summarize(byStyle("ibisha")),
      furibisha: summarize(byStyle("furibisha")),
      other: summarize(byStyle("other")),
    },
    byPhase: {
      opening: summarize(byPhase("opening")),
      middle: summarize(byPhase("middle")),
      endgame: summarize(byPhase("endgame")),
    },
    evenVsBig: {
      even: summarize(rows.filter((r) => Math.abs(r.actual_cp) <= EVEN_BAND_CP)),
      big: summarize(rows.filter((r) => Math.abs(r.actual_cp) > EVEN_BAND_CP)),
    },
    trend: (sessions ?? []).map((s) => ({
      at: s.started_at,
      score: s.weighted_score,
      bias: s.signed_bias,
      meanAbsError: s.mean_abs_error,
      streak: s.best_streak,
      n: s.n_positions,
    })),
    totalGuesses: rows.length,
  });
}
