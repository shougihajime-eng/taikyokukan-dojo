"use client";
// 先生用ページ: 合言葉を入れると全生徒のけいこ状況が見える。
import { useState } from "react";
import Link from "next/link";

interface StudentRow {
  id: string;
  name: string;
  since: string;
  sessions: number;
  guesses: number;
  avgScore: number | null;
  bias: number | null;
  biasLabel: string | null;
  lastAt: string | null;
}

export default function TeacherPage() {
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [students, setStudents] = useState<StudentRow[] | null>(null);

  async function load() {
    if (!pass.trim()) {
      setMsg("合言葉を入れてください");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pass: pass.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "読み込めませんでした");
        return;
      }
      setStudents(data.students);
    } catch {
      setMsg("通信できませんでした");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex-1 w-full max-w-150 mx-auto px-4 py-8">
      <div className="flex flex-col gap-5">
        <header className="text-center">
          <h1 className="font-fude text-4xl">先生用</h1>
          <p className="mt-1 text-xs opacity-70">生徒のけいこ状況と判断のクセ</p>
        </header>

        {!students ? (
          <section className="rounded-2xl border border-amber-900/20 bg-white/60 p-5 flex flex-col gap-3 max-w-100 w-full mx-auto">
            <input
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder="先生の合言葉"
              type="password"
              className="rounded-lg border border-[#3b2f1e]/30 bg-white/80 px-3 py-2.5"
            />
            {msg && <p className="text-sm text-[#b32718]">{msg}</p>}
            <button
              type="button"
              onClick={load}
              disabled={busy}
              className="rounded-xl bg-[#3b2f1e] text-[#fff6ec] font-bold py-3 active:scale-[0.98] transition disabled:opacity-50"
            >
              {busy ? "確認中…" : "開く"}
            </button>
          </section>
        ) : students.length === 0 ? (
          <p className="text-center text-sm opacity-70 py-8">まだ生徒の登録がありません</p>
        ) : (
          <section className="rounded-2xl border border-amber-900/20 bg-white/70 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#3b2f1e] text-[#fff6ec] text-xs">
                  <th className="px-3 py-2.5 text-left">なまえ</th>
                  <th className="px-2 py-2.5 text-right">けいこ</th>
                  <th className="px-2 py-2.5 text-right">問題数</th>
                  <th className="px-2 py-2.5 text-right">平均精度</th>
                  <th className="px-2 py-2.5 text-left">クセ</th>
                  <th className="px-3 py-2.5 text-right">最終けいこ</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s.id} className={i % 2 === 1 ? "bg-[#fbf4e2]/70" : ""}>
                    <td className="px-3 py-2.5 font-bold">{s.name}</td>
                    <td className="px-2 py-2.5 text-right">{s.sessions}回</td>
                    <td className="px-2 py-2.5 text-right">{s.guesses}問</td>
                    <td className="px-2 py-2.5 text-right font-bold">
                      {s.avgScore === null ? "—" : `${s.avgScore}点`}
                    </td>
                    <td className="px-2 py-2.5 text-xs">
                      {s.biasLabel ?? "—"}
                      {s.bias !== null && (
                        <span className="opacity-60 ml-1">
                          ({Math.round(s.bias * 100) > 0 ? "+" : ""}
                          {Math.round(s.bias * 100)}pt)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs opacity-75">
                      {s.lastAt
                        ? new Date(s.lastAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <footer className="text-center text-xs opacity-70">
          <Link href="/" className="underline underline-offset-2">← ホームへ</Link>
        </footer>
      </div>
    </main>
  );
}
