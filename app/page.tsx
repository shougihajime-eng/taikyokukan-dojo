"use client";
// ホーム画面: 題字・ログイン・けいこ開始
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSettings } from "@/lib/settings";
import { uiText } from "@/lib/text";
import { loadStudent, saveStudent, clearStudent, type Student } from "@/lib/student";

export default function HomePage() {
  const { settings } = useSettings();
  const T = uiText(settings.textMode);
  const [student, setStudent] = useState<Student | null>(null);
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setStudent(loadStudent());
  }, []);

  async function login() {
    const n = name.trim();
    const p = pass.trim();
    if (!n || !p) {
      setMsg(T.loginEmpty);
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n, pass: p }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? T.loginFail);
        return;
      }
      const s = { id: data.id as string, name: data.name as string };
      saveStudent(s);
      setStudent(s);
      setName("");
      setPass("");
    } catch {
      setMsg(T.loginOffline);
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    clearStudent();
    setStudent(null);
  }

  return (
    <main className="flex-1 w-full max-w-130 mx-auto px-4 py-8">
      <div className="stagger flex flex-col gap-6">
        {/* 題字 */}
        <header className="text-center">
          <h1 className="font-fude text-5xl sm:text-6xl tracking-wide leading-tight">
            大局観道場
            <span className="hanko ml-2 align-middle">道</span>
          </h1>
          <p className="mt-2 text-sm opacity-75">{T.subtitle}</p>
        </header>

        {/* けいこ開始 */}
        <section className="rounded-2xl border border-amber-900/20 bg-white/55 backdrop-blur-sm shadow-sm p-5 flex flex-col gap-3">
          <p className="text-sm leading-relaxed">
            盤面を見て「先手がどれくらい有利か」をスライダーで予測。
            <br />
            AI（エンジン）の判定とのズレで、あなたの<b>大局観の精度</b>を測ります。
          </p>
          <Link
            href="/play"
            className="block text-center rounded-xl bg-gradient-to-b from-[#d8442e] to-[#b32718] text-[#fff6ec] font-bold text-lg py-3.5 shadow-md active:scale-[0.98] transition"
          >
            ▶ けいこをはじめる
          </Link>
          <Link
            href="/dashboard"
            className="block text-center rounded-xl border-2 border-[#3b2f1e]/70 font-bold py-3 active:scale-[0.98] transition"
          >
            📈 じぶんのクセを見る
          </Link>
        </section>

        {/* ログイン */}
        <section className="rounded-2xl border border-amber-900/20 bg-white/55 backdrop-blur-sm shadow-sm p-5">
          {student ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm">
                <span className="font-bold text-base">{student.name}</span> さんでログイン中
                <span className="block text-xs opacity-70 mt-0.5">きろくはクラウドに保存されます</span>
              </p>
              <button
                type="button"
                onClick={logout}
                className="shrink-0 text-xs rounded-lg border border-[#3b2f1e]/40 px-3 py-2 active:scale-95 transition"
              >
                {T.logout}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              <h2 className="font-bold">{T.loginTitle}</h2>
              <p className="text-xs opacity-75">{T.loginHint}</p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={T.namePh}
                maxLength={20}
                className="rounded-lg border border-[#3b2f1e]/30 bg-white/80 px-3 py-2.5"
              />
              <input
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder={T.passPh}
                maxLength={30}
                type="password"
                className="rounded-lg border border-[#3b2f1e]/30 bg-white/80 px-3 py-2.5"
              />
              {msg && <p className="text-sm text-[#b32718]">{msg}</p>}
              <button
                type="button"
                onClick={login}
                disabled={busy}
                className="rounded-xl bg-[#3b2f1e] text-[#fff6ec] font-bold py-3 active:scale-[0.98] transition disabled:opacity-50"
              >
                {busy ? T.loginChecking : T.loginBtn}
              </button>
            </div>
          )}
        </section>

        {/* 下のリンク */}
        <footer className="flex items-center justify-center gap-5 text-xs opacity-70">
          <Link href="/teacher" className="underline underline-offset-2">
            {T.teacher}
          </Link>
        </footer>
      </div>
    </main>
  );
}
