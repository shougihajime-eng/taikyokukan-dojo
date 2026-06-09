"use client";
// ホーム画面: 道場の題字・ログイン・けいこ開始
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSettings } from "@/lib/settings";
import { uiText } from "@/lib/text";
import { loadStudent, saveStudent, clearStudent, type Student } from "@/lib/student";
import ThemeSheet from "@/components/ThemeSheet";

export default function HomePage() {
  const { settings } = useSettings();
  const T = uiText(settings.textMode);
  const [student, setStudent] = useState<Student | null>(null);
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [sheet, setSheet] = useState(false);

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
    <main className="app-main safe-bottom" style={{ paddingTop: "max(20px, var(--sat))" }}>
      <div className="wrap wrap-readable stagger flex flex-col gap-5 pb-6">
        {/* 右上のきせかえ */}
        <div className="flex justify-end -mb-2 pt-1">
          <button type="button" onClick={() => setSheet(true)} className="chip" aria-label="きせかえ">
            🎨 きせかえ
          </button>
        </div>

        {/* ヒーロー（題字） */}
        <header className="relative card card-kin card-pad overflow-hidden">
          {/* 背景：広がる世界（地平のひかり＋星） */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 select-none"
            style={{
              background:
                "radial-gradient(80% 60% at 78% 120%, rgba(247,196,120,0.18), transparent 60%), radial-gradient(50% 40% at 15% 5%, rgba(125,146,230,0.16), transparent 70%)",
            }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -right-5 -bottom-9 font-fude text-[10rem] leading-none text-[var(--kin)] opacity-[0.10] select-none"
            style={{ textShadow: "0 0 60px rgba(231,201,135,0.5)" }}
          >
            局
          </span>
          <div className="relative flex items-stretch gap-4">
            <div className="flex flex-col justify-center">
              <p className="label-eyebrow mb-1">将棋・形勢判断トレーニング</p>
              <h1
                className="font-fude text-[clamp(2.6rem,12vw,4rem)] leading-[1.05] tracking-wide text-[var(--kin-light)]"
                style={{ textShadow: "0 0 30px rgba(231,201,135,0.35)" }}
              >
                大局観
                <br />
                道場
              </h1>
              <p className="mt-3 font-mincho text-sm text-[var(--kin)]">盤上に、世界が広がる。</p>
              <p className="mt-2 text-sm text-[var(--sumi-soft)] leading-relaxed">
                盤面を見て「先手がどれくらい有利か」を予想。
                <br />
                AIの判定とのズレで、あなたの<b className="text-[var(--shu-bright)]">見る目</b>を数値にします。
              </p>
            </div>
            <div className="flex items-start pt-1">
              <span className="hanko text-lg">道</span>
            </div>
          </div>
        </header>

        {/* けいこ開始 */}
        <section className="flex flex-col gap-3">
          <Link href="/play" className="btn btn-shu text-lg">
            ▶ けいこをはじめる
          </Link>
          <Link href="/dashboard" className="btn btn-ghost">
            📈 じぶんのクセを見る
          </Link>
        </section>

        {/* 3つのものさし（このアプリで分かること） */}
        <section className="card card-pad">
          <p className="label-eyebrow mb-3">このアプリで分かること</p>
          <ul className="flex flex-col gap-3">
            <FeatureRow icon="⚖" title="形勢のズレ" body="あなたの予想とAIの差を毎回その場で採点" />
            <div className="rule-kin" />
            <FeatureRow icon="🔍" title="判断のクセ" body="先手を高く見がち・低く見がち…を見える化" />
            <div className="rule-kin" />
            <FeatureRow icon="📈" title="上達の記録" body="精度の伸びを折れ線グラフでふり返り" />
          </ul>
        </section>

        {/* ログイン */}
        <section className="card card-pad">
          {student ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm">
                <span className="font-bold text-base text-[var(--kin-light)]">{student.name}</span> さんでログイン中
                <span className="block text-xs text-[var(--sumi-soft)] mt-0.5">きろくはクラウドに保存されます</span>
              </p>
              <button type="button" onClick={logout} className="chip shrink-0">
                {T.logout}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-lg" aria-hidden>☁️</span>
                <h2 className="font-bold">{T.loginTitle.replace("☁️ ", "")}</h2>
              </div>
              <p className="text-xs text-[var(--sumi-soft)]">{T.loginHint}</p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={T.namePh}
                maxLength={20}
                className="input"
              />
              <input
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && login()}
                placeholder={T.passPh}
                maxLength={30}
                type="password"
                className="input"
              />
              {msg && <p className="text-sm text-[var(--shu-bright)]">{msg}</p>}
              <button type="button" onClick={login} disabled={busy} className="btn btn-sumi">
                {busy ? T.loginChecking : T.loginBtn}
              </button>
              <p className="text-[11px] text-center text-[var(--sumi-soft)]">
                ログインしなくても「おためし」で遊べます（きろくは残りません）
              </p>
            </div>
          )}
        </section>

        <footer className="flex items-center justify-center gap-5 text-xs text-[var(--sumi-soft)] pt-1">
          <Link href="/teacher" className="underline underline-offset-2 hover:text-[var(--kin)] transition">
            {T.teacher}
          </Link>
        </footer>
      </div>

      <ThemeSheet open={sheet} onClose={() => setSheet(false)} />
    </main>
  );
}

function FeatureRow({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className="grid place-items-center w-9 h-9 shrink-0 rounded-xl text-lg"
        style={{ background: "rgba(231,201,135,0.12)", border: "1px solid var(--line)" }}
        aria-hidden
      >
        {icon}
      </span>
      <div>
        <p className="font-bold text-sm text-[var(--kin-light)]">{title}</p>
        <p className="text-xs text-[var(--sumi-soft)] leading-relaxed">{body}</p>
      </div>
    </li>
  );
}
