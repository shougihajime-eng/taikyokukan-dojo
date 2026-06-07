// けいこ開始: 局面を抽選して返す。
// ⚠ ここでは評価値・最善手・読み筋は絶対に返さない（答えを隠して出題するアプリの根幹）。
// ログイン済み (studentId あり) ならセッション行を作成、未ログインなら「おためし」(保存なし)。
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

const MODES = new Set(["winrate", "cp"]);
const FILTERS = new Set(["all", "ibisha", "furibisha"]);

export async function POST(req: Request) {
  let body: { studentId?: string | null; mode?: string; styleFilter?: string; count?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "形式が正しくありません" }, { status: 400 });
  }
  const mode = MODES.has(body.mode ?? "") ? body.mode! : "winrate";
  const styleFilter = FILTERS.has(body.styleFilter ?? "") ? body.styleFilter! : "all";
  const count = Math.max(5, Math.min(20, Math.round(body.count ?? 10)));

  const sb = supabaseServer();
  let q = sb.from("positions").select("id, sfen, style_tag, phase_tag, is_sample").limit(500);
  if (styleFilter !== "all") q = q.eq("style_tag", styleFilter);
  const { data: pool, error: poolErr } = await q;
  if (poolErr) {
    return NextResponse.json({ error: "局面を読み込めませんでした" }, { status: 500 });
  }
  if (!pool || pool.length === 0) {
    return NextResponse.json({ error: "出題できる局面がまだ入っていません" }, { status: 404 });
  }

  // シャッフルして count 局面を選ぶ
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const picked = shuffled.slice(0, Math.min(count, shuffled.length));

  // ログイン済みならセッションを記録
  let sessionId: string | null = null;
  if (body.studentId) {
    const { data: ses, error: sesErr } = await sb
      .from("sessions")
      .insert({ student_id: body.studentId, mode, style_filter: styleFilter, n_positions: picked.length })
      .select("id")
      .single();
    if (sesErr || !ses) {
      return NextResponse.json({ error: "けいこの記録を作れませんでした" }, { status: 500 });
    }
    sessionId = ses.id;
  }

  return NextResponse.json({
    sessionId,
    positions: picked.map((p) => ({
      id: p.id,
      sfen: p.sfen,
      styleTag: p.style_tag,
      phaseTag: p.phase_tag,
      isSample: p.is_sample,
    })),
  });
}
