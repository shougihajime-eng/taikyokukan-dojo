"use client";
// 先生用ページ: 合言葉を入れると全生徒のけいこ状況が見える。
import { useState } from "react";
import AppHeader from "@/components/AppHeader";

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
    <main className="flex flex-col flex-1">
      <AppHeader back="/" backLabel="ホーム" showDressup={false} />
      <div className="app-main safe-bottom pt-5">
        <div className="wrap wrap-wide flex flex-col gap-5">
          <header className="text-center">
            <h1 className="font-mincho text-3xl">先生用</h1>
            <p className="mt-1 text-xs text-[var(--sumi-soft)]">生徒のけいこ状況と判断のクセ</p>
          </header>

          {!students ? (
            <section className="card card-pad flex flex-col gap-3 max-w-[26rem] w-full mx-auto">
              <input
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load()}
                placeholder="先生の合言葉"
                type="password"
                className="input"
              />
              {msg && <p className="text-sm text-[var(--shu-bright)]">{msg}</p>}
              <button type="button" onClick={load} disabled={busy} className="btn btn-sumi">
                {busy ? "確認中…" : "開く"}
              </button>
            </section>
          ) : students.length === 0 ? (
            <p className="text-center text-sm text-[var(--sumi-soft)] py-8">まだ生徒の登録がありません</p>
          ) : (
            <section className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-[var(--kin-light)] text-xs" style={{ background: "linear-gradient(180deg,#F7E9CF,#F0DCB8)" }}>
                      <th className="px-3 py-3 text-left font-bold">なまえ</th>
                      <th className="px-2 py-3 text-right font-bold">けいこ</th>
                      <th className="px-2 py-3 text-right font-bold">問題数</th>
                      <th className="px-2 py-3 text-right font-bold">平均精度</th>
                      <th className="px-2 py-3 text-left font-bold">クセ</th>
                      <th className="px-3 py-3 text-right font-bold whitespace-nowrap">最終けいこ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, i) => (
                      <tr key={s.id} className={i % 2 === 1 ? "bg-[var(--paper)]/60" : ""}>
                        <td className="px-3 py-3 font-bold whitespace-nowrap">{s.name}</td>
                        <td className="px-2 py-3 text-right tnum">{s.sessions}回</td>
                        <td className="px-2 py-3 text-right tnum">{s.guesses}問</td>
                        <td className="px-2 py-3 text-right font-bold tnum">
                          {s.avgScore === null ? "—" : `${s.avgScore}点`}
                        </td>
                        <td className="px-2 py-3 text-xs whitespace-nowrap">
                          {s.biasLabel ?? "—"}
                          {s.bias !== null && (
                            <span className="text-[var(--sumi-soft)] ml-1 tnum">
                              ({Math.round(s.bias * 100) > 0 ? "+" : ""}
                              {Math.round(s.bias * 100)})
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right text-xs text-[var(--sumi-soft)] whitespace-nowrap">
                          {s.lastAt
                            ? new Date(s.lastAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
