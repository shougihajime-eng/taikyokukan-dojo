"use client";
// 🔰 はじめての人への使い方ガイド（ウォークスルー）。
// ・初めて開いた人にだけ、最初に1回だけ自動で出る（端末に「見た」印を残す）。
// ・window のイベント（openEvent）を受け取って、いつでも開き直せる（「❔使い方」ボタンから）。
// ・要素にくっつけない中央カード＝どの画面サイズでも崩れない。本体に触れないあと付け部品。
// 他の将棋アプリにもそのまま移植できる汎用部品（steps と storageKey を渡すだけ）。
import { useCallback, useEffect, useState } from "react";

export interface WalkStep {
  e: string; // 絵文字
  t: string; // みだし
  b: string; // 本文（<b>強調</b>・<br> 可）
}

export default function Walkthrough({
  steps,
  storageKey,
  openEvent = "walkthrough-open",
  waitForSelector,
}: {
  steps: WalkStep[];
  storageKey: string;
  openEvent?: string;
  waitForSelector?: string; // 指定すると、この要素が画面から消えてから出す（起動画面の後など）
}) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  const close = useCallback(() => {
    setOpen(false);
    try { localStorage.setItem(storageKey, "1"); } catch {}
  }, [storageKey]);

  // 初回の自動表示 ＋ 「❔使い方」からの再表示
  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(storageKey) === "1"; } catch {}
    let cancelled = false;
    let tid: ReturnType<typeof setTimeout> | undefined;
    let iid: ReturnType<typeof setInterval> | undefined;
    const showNow = () => { if (!cancelled) { setI(0); setOpen(true); } };
    if (!seen) {
      if (waitForSelector) {
        const startedAt = Date.now();
        iid = setInterval(() => {
          if (cancelled) return;
          const gone = !document.querySelector(waitForSelector);
          if (gone || Date.now() - startedAt > 15000) {
            if (iid) clearInterval(iid);
            tid = setTimeout(showNow, 400);
          }
        }, 300);
      } else {
        tid = setTimeout(showNow, 700);
      }
    }
    const onOpen = () => { setI(0); setOpen(true); };
    window.addEventListener(openEvent, onOpen);
    return () => {
      cancelled = true;
      window.removeEventListener(openEvent, onOpen);
      if (tid) clearTimeout(tid);
      if (iid) clearInterval(iid);
    };
  }, [storageKey, openEvent, waitForSelector]);

  // キーボード操作（← → Enter Esc）
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") setI((p) => Math.max(0, p - 1));
      else if (e.key === "ArrowRight" || e.key === "Enter") {
        setI((p) => {
          if (p < steps.length - 1) return p + 1;
          close();
          return p;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, steps.length, close]);

  if (!open) return null;
  const s = steps[i];
  const last = i === steps.length - 1;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-5 bg-black/55"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      role="dialog"
      aria-modal="true"
      aria-label="使い方ガイド"
    >
      <div className="w-full max-w-[420px] max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-amber-400 bg-gradient-to-b from-amber-50 to-orange-50 shadow-2xl p-6 animate-[tutpop_.22s_ease]">
        <style>{`@keyframes tutpop{from{transform:scale(.92);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
        <div className="text-5xl text-center leading-none mb-2">{s.e}</div>
        <div className="text-center text-xs font-bold text-amber-600 mb-1">{i + 1} / {steps.length}</div>
        <div className="text-center text-xl font-extrabold text-amber-900 mb-3">{s.t}</div>
        <div
          className="text-center text-[15px] leading-7 text-amber-950 min-h-[92px] [&_b]:text-red-700 [&_b]:font-bold"
          dangerouslySetInnerHTML={{ __html: s.b }}
        />
        <div className="flex flex-wrap gap-1.5 justify-center my-4">
          {steps.map((_, n) => (
            <span
              key={n}
              className={`w-2.5 h-2.5 rounded-full transition-transform ${n === i ? "bg-amber-500 scale-125" : "bg-amber-300/50"}`}
            />
          ))}
        </div>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => setI((p) => Math.max(0, p - 1))}
            className={`flex-1 min-h-[50px] rounded-2xl border-2 border-amber-300 bg-white font-extrabold text-amber-800 active:scale-95 ${i === 0 ? "invisible" : ""}`}
          >
            ◀ もどる
          </button>
          <button
            type="button"
            onClick={() => { if (last) close(); else setI((p) => p + 1); }}
            className="flex-1 min-h-[50px] rounded-2xl bg-amber-600 text-white font-extrabold shadow active:scale-95"
          >
            {last ? "はじめる 🎉" : "次へ ▶"}
          </button>
        </div>
        <button
          type="button"
          onClick={close}
          className="block w-full text-center mt-2.5 py-2 text-xs text-amber-700/80 underline"
        >
          とじる（あとで「❔使い方」から見られます）
        </button>
      </div>
    </div>
  );
}
