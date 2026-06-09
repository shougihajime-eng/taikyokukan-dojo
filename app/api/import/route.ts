// 局面インポートの受け皿（先生の合言葉ガード付き）。
// 2つの使い方:
//   1) { pass, seedSamples: true } … テスト用かり局面を入れ直す（既存のかり局面は削除→新規投入）
//   2) { pass, positions: [...] } … エンジン生成データ等の本番局面を検証つきで投入
// すべての局面は core.js で合法性を機械検証してから入れる（不正は1件単位で弾いて報告）。
import { NextResponse } from "next/server";
import ShogiCore from "@/lib/shogi/core";
import { supabaseServer } from "@/lib/supabase/server";
import { buildSamples } from "@/lib/samples";
import { clampCp } from "@/lib/eval";

interface ImportPosition {
  sfen?: string;
  eval_cp?: number;
  best_move_usi?: string | null;
  pv?: string[] | null;
  style_tag?: string;
  phase_tag?: string;
  comment?: string | null;
}

const STYLES = new Set(["ibisha", "furibisha", "other"]);
const PHASES = new Set(["opening", "middle", "endgame"]);

/** 1局面を検証。問題なければ挿入用の行を、ダメなら理由を返す */
function validate(p: ImportPosition): { row?: Record<string, unknown>; error?: string } {
  if (!p.sfen || typeof p.sfen !== "string") return { error: "sfen がありません" };
  const st = ShogiCore.parseSfen(p.sfen);
  if (!st) return { error: `SFENが不正: ${p.sfen}` };
  if (ShogiCore.inCheck(st, ShogiCore.opp(st.turn))) {
    return { error: `非手番側が王手放置の局面: ${p.sfen}` };
  }
  if (typeof p.eval_cp !== "number" || !Number.isFinite(p.eval_cp)) {
    return { error: `eval_cp が数値ではありません: ${p.sfen}` };
  }
  if (!p.style_tag || !STYLES.has(p.style_tag)) return { error: `style_tag が不正: ${p.style_tag}` };
  if (!p.phase_tag || !PHASES.has(p.phase_tag)) return { error: `phase_tag が不正: ${p.phase_tag}` };

  // 最善手と読み筋は「その局面で本当に指せる手か」を検証
  let best: string | null = null;
  if (p.best_move_usi) {
    if (!ShogiCore.usiToMove(st, p.best_move_usi)) {
      return { error: `最善手が非合法: ${p.best_move_usi} (${p.sfen})` };
    }
    best = p.best_move_usi;
  }
  let pv: string[] | null = null;
  if (Array.isArray(p.pv) && p.pv.length > 0) {
    let cur = st;
    for (const u of p.pv) {
      const next = ShogiCore.applyUsiStrict(cur, u);
      if (!next) return { error: `読み筋に非合法手: ${u} (${p.sfen})` };
      cur = next;
    }
    pv = p.pv;
  }

  return {
    row: {
      sfen: p.sfen,
      eval_cp: clampCp(Math.round(p.eval_cp)),
      best_move_usi: best,
      pv,
      style_tag: p.style_tag,
      phase_tag: p.phase_tag,
      is_sample: false,
      source: "import",
      comment: p.comment ?? null,
    },
  };
}

export async function POST(req: Request) {
  let body: { pass?: string; seedSamples?: boolean; purgeSamples?: boolean; positions?: ImportPosition[] };
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

  // --- かり局面の削除（本番局面を入れたあと、かりの12局面を消すのに使う）---
  if (body.purgeSamples) {
    const { data: del, error: delErr } = await sb
      .from("positions")
      .delete()
      .eq("is_sample", true)
      .select("id");
    if (delErr) {
      return NextResponse.json({ error: `かり局面の削除に失敗: ${delErr.message}` }, { status: 500 });
    }
    return NextResponse.json({ purged: del?.length ?? 0, kind: "purgeSamples" });
  }

  // --- かり局面の入れ直し ---
  if (body.seedSamples) {
    const samples = buildSamples();
    const { error: delErr } = await sb.from("positions").delete().eq("is_sample", true);
    if (delErr) {
      return NextResponse.json({ error: `古いかり局面の削除に失敗: ${delErr.message}` }, { status: 500 });
    }
    const rows = samples.map((s) => ({
      sfen: s.sfen,
      eval_cp: clampCp(s.evalCp),
      best_move_usi: null,
      pv: null,
      style_tag: s.styleTag,
      phase_tag: s.phaseTag,
      is_sample: true,
      source: "sample",
      comment: s.comment,
    }));
    const { error: insErr } = await sb.from("positions").insert(rows);
    if (insErr) {
      return NextResponse.json({ error: `かり局面の投入に失敗: ${insErr.message}` }, { status: 500 });
    }
    return NextResponse.json({ inserted: rows.length, kind: "samples" });
  }

  // --- 本番局面のインポート ---
  if (!Array.isArray(body.positions) || body.positions.length === 0) {
    return NextResponse.json({ error: "positions が空です" }, { status: 400 });
  }
  if (body.positions.length > 2000) {
    return NextResponse.json({ error: "一度に入れられるのは2000局面まで" }, { status: 400 });
  }
  const rows: Record<string, unknown>[] = [];
  const errors: string[] = [];
  for (const p of body.positions) {
    const v = validate(p);
    if (v.row) rows.push(v.row);
    else errors.push(v.error!);
  }
  if (rows.length > 0) {
    const { error: insErr } = await sb.from("positions").insert(rows);
    if (insErr) {
      return NextResponse.json({ error: `投入に失敗: ${insErr.message}`, rejected: errors }, { status: 500 });
    }
  }
  return NextResponse.json({ inserted: rows.length, rejectedCount: errors.length, rejected: errors });
}
