"use client";
// ホーム画面: 道場の題字・ログイン・けいこ開始
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSettings } from "@/lib/settings";
import { uiText } from "@/lib/text";
import { loadStudent, saveStudent, clearStudent, type Student } from "@/lib/student";
import ThemeSheet from "@/components/ThemeSheet";
import Walkthrough, { type WalkStep } from "@/components/Walkthrough";
import Splash from "@/components/Splash";

// 🔰 はじめての人への使い方ガイドの中身（ひらがな＝こども／漢字＝大人）
function walkSteps(kana: boolean): WalkStep[] {
  return kana
    ? [
        { e: "🔰", t: "ようこそ！", b: "ここは、どっちが <b>ゆうり</b>かを 見る目を きたえる どうじょうだよ。<br>30びょうで つかいかたを みてみよう。" },
        { e: "▶️", t: "けいこを はじめる", b: "<b>▶けいこをはじめる</b>を おすと、もんだいの ばんめんが でるよ。" },
        { e: "🎚️", t: "よそうする", b: "ばんを 見て、<b>せんてが どれくらい ゆうり</b>かを、<b>スライダー</b>で よそうするよ。" },
        { e: "🎯", t: "さいてん", b: "AIの はんていとの <b>ズレ</b>が てんすうに なるよ。<br>あなたの <b>見る目</b>が すうじで わかる。" },
        { e: "📈", t: "じぶんのクセ", b: "つづけると、じぶんの <b>クセ</b>（はやとちり など）が 見えるよ。<br>ログインすると せいせきが ぜんぶの きかいに のこるよ。" },
        { e: "🎨", t: "きせかえ・もういちど", b: "<b>🎨きせかえ</b>で 見た目を かえられるよ。<br>もういちど みたいときは、みぎうえの <b>❔つかいかた</b>を おしてね。" },
      ]
    : [
        { e: "🔰", t: "ようこそ！", b: "ここは、どちらが <b>有利</b>かを見る目をきたえる道場です。<br>30秒で使い方を見てみましょう。" },
        { e: "▶️", t: "けいこを始める", b: "<b>▶けいこをはじめる</b>を押すと、問題の盤面が出ます。" },
        { e: "🎚️", t: "予想する", b: "盤面を見て、<b>先手がどれくらい有利か</b>を<b>スライダー</b>で予想します。" },
        { e: "🎯", t: "採点", b: "AIの判定との<b>ズレ</b>が点数になります。<br>あなたの<b>見る目</b>が数値で分かります。" },
        { e: "📈", t: "自分のクセ", b: "つづけると、自分の<b>クセ</b>（早とちりなど）が見えます。<br>ログインすると成績がすべての端末に残ります。" },
        { e: "🎨", t: "きせかえ・もう一度", b: "<b>🎨きせかえ</b>で見た目を変えられます。<br>もう一度見たいときは、右上の<b>❔使い方</b>を押してください。" },
      ];
}

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
        {/* 右上のきせかえ・使い方 */}
        <div className="flex justify-end gap-2 -mb-2 pt-1">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("taikyoku-walk-open"))}
            className="chip"
            aria-label="使い方"
          >
            ❔ {settings.textMode === "kana" ? "つかいかた" : "使い方"}
          </button>
          <button type="button" onClick={() => setSheet(true)} className="chip" aria-label="きせかえ">
            🎨 きせかえ
          </button>
        </div>

        {/* ヒーロー（signature＝駒文字タイトル：一文字ずつ駒に乗せて「コトン…」と並ぶ） */}
        <header className="relative card card-kin card-pad overflow-hidden">
          {/* 背景：朝焼けのひかり＋ぼかした巨大な駒の気配 */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 select-none"
            style={{
              background:
                "radial-gradient(80% 60% at 78% 120%, rgba(232,96,60,0.10), transparent 60%), radial-gradient(50% 40% at 15% 5%, rgba(99,131,188,0.10), transparent 70%)",
            }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -right-5 -bottom-9 font-fude text-[10rem] leading-none text-[var(--yamabuki)] opacity-[0.08] select-none"
            style={{ filter: "blur(2px)" }}
          >
            局
          </span>
          <div className="relative flex flex-col justify-center">
            <p className="label-eyebrow mb-2">将棋・形勢判断トレーニング</p>
            <h1 className="title-halo koma-title" aria-label="大局観道場">
              {"大局観道場".split("").map((c, i) => (
                <span key={i} className="kt-koma" style={{ animationDelay: `${0.12 + i * 0.12}s` }} aria-hidden>
                  <span className="kt-char">{c}</span>
                </span>
              ))}
              <span className="kt-rakkan" style={{ animationDelay: "0.85s" }} aria-hidden />
            </h1>
            <p className="mt-3 font-mincho text-sm text-[var(--kin)]">盤上に、世界が広がる。</p>
            <p className="mt-2 text-sm text-[var(--sumi-soft)] leading-relaxed">
              盤面を見て「先手がどれくらい有利か」を予想。
              <br />
              AIの判定とのズレで、あなたの<b className="text-[var(--shu-bright)]">見る目</b>を数値にします。
            </p>
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

      {/* 🔰 はじめての人への使い方ガイド（起動画面が消えてから・初回だけ自動／❔つかいかたで再表示） */}
      <Walkthrough
        steps={walkSteps(settings.textMode === "kana")}
        storageKey="taikyoku_tutorial_seen_v1"
        openEvent="taikyoku-walk-open"
        waitForSelector=".splash-screen"
      />

      {/* 起動画面（このセッションで最初に開いたときだけ） */}
      <Splash />
    </main>
  );
}

function FeatureRow({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className="grid place-items-center w-9 h-9 shrink-0 rounded-xl text-lg"
        style={{ background: "rgba(221,156,43,0.14)", border: "1px solid var(--line)" }}
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
