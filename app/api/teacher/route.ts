// 先生用: 合言葉（TEACHER_PASSWORD）を確認して、全生徒のけいこ状況を返す。
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { biasLabel } from "@/lib/scoring";

export async function POST(req: Request) {
  let body: { pass?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "形式が正しくありません" }, { status: 400 });
  }
  const teacherPass = process.env.TEACHER_PASSWORD;
  if (!teacherPass || body.pass !== teacherPass) {
    return NextResponse.json({ error: "合言葉が違います" }, { status: 401 });
  }

  const sb = supabaseServer();
  const [{ data: students, error: stErr }, { data: sessions, error: seErr }] = await Promise.all([
    sb.from("students").select("id, name, created_at").order("created_at", { ascending: true }),
    sb
      .from("sessions")
      .select("student_id, started_at, weighted_score, signed_bias, n_positions, finished_at")
      .not("finished_at", "is", null)
      .order("started_at", { ascending: true })
      .limit(5000),
  ]);
  if (stErr || seErr) {
    return NextResponse.json({ error: "読み込みに失敗しました" }, { status: 500 });
  }

  const byStudent = new Map<
    string,
    { sessions: number; guesses: number; scoreSum: number; biasSum: number; biasN: number; last: string | null }
  >();
  for (const s of sessions ?? []) {
    const cur = byStudent.get(s.student_id) ?? {
      sessions: 0,
      guesses: 0,
      scoreSum: 0,
      biasSum: 0,
      biasN: 0,
      last: null,
    };
    cur.sessions += 1;
    cur.guesses += s.n_positions ?? 0;
    if (typeof s.weighted_score === "number") cur.scoreSum += s.weighted_score;
    if (typeof s.signed_bias === "number" && typeof s.n_positions === "number") {
      cur.biasSum += s.signed_bias * s.n_positions;
      cur.biasN += s.n_positions;
    }
    cur.last = s.started_at;
    byStudent.set(s.student_id, cur);
  }

  return NextResponse.json({
    students: (students ?? []).map((st) => {
      const a = byStudent.get(st.id);
      const avgScore = a && a.sessions > 0 ? Math.round(a.scoreSum / a.sessions) : null;
      const bias = a && a.biasN > 0 ? a.biasSum / a.biasN : null;
      return {
        id: st.id,
        name: st.name,
        since: st.created_at,
        sessions: a?.sessions ?? 0,
        guesses: a?.guesses ?? 0,
        avgScore,
        bias,
        biasLabel: bias === null ? null : biasLabel(bias),
        lastAt: a?.last ?? null,
      };
    }),
  });
}
