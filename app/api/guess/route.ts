// 予測の判定: ここで初めて答え（評価値・最善手・読み筋）を開示する。
// ログイン済み（sessionId + studentId あり）なら guesses に記録、おためしなら採点だけ。
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { cpToWinrate } from "@/lib/eval";
import { scoreGuess } from "@/lib/scoring";

export async function POST(req: Request) {
  let body: {
    positionId?: string;
    guessWinrate?: number;
    sessionId?: string | null;
    studentId?: string | null;
    orderNo?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "形式が正しくありません" }, { status: 400 });
  }
  const g = body.guessWinrate;
  if (typeof g !== "number" || !Number.isFinite(g) || g < 0 || g > 1) {
    return NextResponse.json({ error: "予測の値が正しくありません" }, { status: 400 });
  }
  if (!body.positionId) {
    return NextResponse.json({ error: "局面が指定されていません" }, { status: 400 });
  }

  const sb = supabaseServer();
  const { data: pos, error: posErr } = await sb
    .from("positions")
    .select("id, sfen, eval_cp, best_move_usi, pv, style_tag, phase_tag, is_sample, comment")
    .eq("id", body.positionId)
    .maybeSingle();
  if (posErr || !pos) {
    return NextResponse.json({ error: "局面が見つかりませんでした" }, { status: 404 });
  }

  const score = scoreGuess(g, pos.eval_cp);
  const actualWinrate = cpToWinrate(pos.eval_cp);

  // ログイン済みなら記録する
  if (body.sessionId && body.studentId) {
    const { error: insErr } = await sb.from("guesses").insert({
      session_id: body.sessionId,
      student_id: body.studentId,
      position_id: pos.id,
      order_no: Math.max(0, Math.round(body.orderNo ?? 0)),
      guess_winrate: g,
      actual_cp: pos.eval_cp,
      actual_winrate: actualWinrate,
      abs_error: score.absError,
      signed_error: score.signedError,
      weight: score.weight,
      style_tag: pos.style_tag,
      phase_tag: pos.phase_tag,
    });
    if (insErr) {
      return NextResponse.json({ error: "記録の保存に失敗しました" }, { status: 500 });
    }
  }

  return NextResponse.json({
    actualCp: pos.eval_cp,
    actualWinrate,
    absError: score.absError,
    signedError: score.signedError,
    weight: score.weight,
    bestMoveUsi: pos.best_move_usi,
    pv: pos.pv ?? [],
    isSample: pos.is_sample,
    comment: pos.comment,
  });
}
