// なまえ＋あいことば のかんたんログイン（一閃と同方式）。
// はじめての名前なら自動で登録、知っている名前なら あいことば を確認。
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { supabaseServer } from "@/lib/supabase/server";

function hashPass(name: string, pass: string): string {
  return createHash("sha256").update(`taikyokukan:${name}:${pass}`).digest("hex");
}

export async function POST(req: Request) {
  let body: { name?: string; pass?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "形式が正しくありません" }, { status: 400 });
  }
  const name = (body.name ?? "").trim();
  const pass = (body.pass ?? "").trim();
  if (!name || name.length > 20) {
    return NextResponse.json({ error: "なまえは1〜20文字で入れてね" }, { status: 400 });
  }
  if (pass.length < 4 || pass.length > 30) {
    return NextResponse.json({ error: "あいことばは4〜30文字で入れてね" }, { status: 400 });
  }

  const sb = supabaseServer();
  const { data: found, error: selErr } = await sb
    .from("students")
    .select("id, name, pass_hash")
    .eq("name", name)
    .maybeSingle();
  if (selErr) {
    return NextResponse.json({ error: "サーバーの調子が悪いみたい。少し待ってね" }, { status: 500 });
  }

  const h = hashPass(name, pass);
  if (found) {
    if (found.pass_hash !== h) {
      return NextResponse.json(
        { error: "その なまえ は使われています。あいことばが違うときは べつの なまえ にしてね" },
        { status: 401 }
      );
    }
    return NextResponse.json({ id: found.id, name: found.name, isNew: false });
  }

  const { data: created, error: insErr } = await sb
    .from("students")
    .insert({ name, pass_hash: h })
    .select("id, name")
    .single();
  if (insErr || !created) {
    return NextResponse.json({ error: "登録できませんでした。もう一度ためしてね" }, { status: 500 });
  }
  return NextResponse.json({ id: created.id, name: created.name, isNew: true });
}
