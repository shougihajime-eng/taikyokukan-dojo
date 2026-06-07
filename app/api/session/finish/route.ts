// けいこ終了: セッションの集計を確定して保存・返却する。
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { weightedScore, meanAbsError, bestStreak, signedBias } from "@/lib/scoring";

export async function POST(req: Request) {
  let body: { sessionId?: string; studentId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "形式が正しくありません" }, { status: 400 });
  }
  if (!body.sessionId || !body.studentId) {
    return NextResponse.json({ error: "セッションが指定されていません" }, { status: 400 });
  }

  const sb = supabaseServer();
  const { data: rows, error: selErr } = await sb
    .from("guesses")
    .select("abs_error, signed_error, weight, order_no")
    .eq("session_id", body.sessionId)
    .eq("student_id", body.studentId)
    .order("order_no", { ascending: true });
  if (selErr) {
    return NextResponse.json({ error: "記録を読み込めませんでした" }, { status: 500 });
  }
  const list = rows ?? [];
  if (list.length === 0) {
    return NextResponse.json({ error: "このけいこの記録がありません" }, { status: 404 });
  }

  const absErrors = list.map((r) => r.abs_error as number);
  const summary = {
    n: list.length,
    meanAbsError: meanAbsError(absErrors),
    weightedScore: weightedScore(
      list.map((r) => ({ absError: r.abs_error as number, weight: r.weight as number }))
    ),
    signedBias: signedBias(list.map((r) => r.signed_error as number)),
    bestStreak: bestStreak(absErrors),
  };

  const { error: updErr } = await sb
    .from("sessions")
    .update({
      finished_at: new Date().toISOString(),
      n_positions: summary.n,
      mean_abs_error: summary.meanAbsError,
      weighted_score: summary.weightedScore,
      signed_bias: summary.signedBias,
      best_streak: summary.bestStreak,
    })
    .eq("id", body.sessionId)
    .eq("student_id", body.studentId);
  if (updErr) {
    return NextResponse.json({ error: "集計の保存に失敗しました" }, { status: 500 });
  }

  return NextResponse.json(summary);
}
