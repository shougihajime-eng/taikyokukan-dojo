"use client";
// きせかえシート（下からせり上がる）。盤の色・駒の書体・ことば（ひらがな/漢字）を選ぶ。
// 既存の lib/settings.ts をそのまま使う（localStorage に保存・全画面で共有）。
import { useEffect } from "react";
import { useSettings, KOMA_STYLES, BAN_THEMES, type BanTheme, type KomaStyle } from "@/lib/settings";
import { uiText } from "@/lib/text";
import ShogiBoard from "@/components/ShogiBoard";
import ShogiCore from "@/lib/shogi/core";

// プレビュー用のミニ局面（平手の出だし）
const PREVIEW_SFEN = "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1";

export default function ThemeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, update } = useSettings();
  const T = uiText(settings.textMode);
  const previewState = ShogiCore.parseSfen(PREVIEW_SFEN);

  // 開いている間は背面スクロールを止める
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="きせかえ">
      <button
        type="button"
        aria-label="とじる"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 scrim-in"
      />
      <div className="sheet-up relative w-full max-w-[34rem] max-h-[88dvh] overflow-y-auto rounded-t-3xl border-t border-[var(--line-strong)] shadow-2xl px-5 pt-4 pb-[max(22px,env(safe-area-inset-bottom))]"
        style={{ background: "linear-gradient(180deg, #131a34 0%, #0b1020 100%)" }}>
        <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-white/25" />
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-mincho text-xl">{T.dressup}</h2>
          <button type="button" onClick={onClose} className="text-sm chip">
            とじる
          </button>
        </div>

        {/* 盤プレビュー */}
        {previewState && (
          <div className="mx-auto mb-5 w-full max-w-[15rem] pointer-events-none">
            <ShogiBoard state={previewState} />
          </div>
        )}

        {/* 盤の色 */}
        <section className="mb-5">
          <p className="label-eyebrow mb-2">{T.banLabel}</p>
          <div className="grid grid-cols-4 gap-2">
            {BAN_THEMES.map((b) => (
              <ThemeChip
                key={b.id}
                active={settings.ban === b.id}
                onClick={() => update({ ban: b.id })}
                label={settings.textMode === "kana" ? b.kana : b.kanji}
                swatchClass={`ban-${b.id as BanTheme}`}
              />
            ))}
          </div>
        </section>

        {/* 駒の書体 */}
        <section className="mb-5">
          <p className="label-eyebrow mb-2">{T.komaLabel}</p>
          <div className="grid grid-cols-5 gap-2">
            {KOMA_STYLES.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => update({ koma: k.id as KomaStyle })}
                className={`rounded-xl border-2 py-2 flex flex-col items-center gap-0.5 transition ${
                  settings.koma === k.id ? "border-[var(--shu)] bg-[var(--shu)]/8" : "border-[var(--line-strong)]"
                }`}
              >
                <span className={`${k.cls} text-2xl leading-none`} style={{ fontFamily: "var(--font-koma)" }}>
                  {k.sample}
                </span>
                <span className="text-[10px] opacity-75">{settings.textMode === "kana" ? k.kana : k.kanji}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ことば */}
        <section>
          <p className="label-eyebrow mb-2">{T.textModeLabel}</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => update({ textMode: "kana" })}
              className={`rounded-xl border-2 py-2.5 text-sm font-bold transition ${
                settings.textMode === "kana" ? "border-[var(--shu)] bg-[var(--shu)]/8" : "border-[var(--line-strong)]"
              }`}
            >
              {T.modeKana}
            </button>
            <button
              type="button"
              onClick={() => update({ textMode: "kanji" })}
              className={`rounded-xl border-2 py-2.5 text-sm font-bold transition ${
                settings.textMode === "kanji" ? "border-[var(--shu)] bg-[var(--shu)]/8" : "border-[var(--line-strong)]"
              }`}
            >
              {T.modeKanji}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function ThemeChip({
  active,
  onClick,
  label,
  swatchClass,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  swatchClass: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border-2 p-1.5 flex flex-col items-center gap-1 transition ${
        active ? "border-[var(--shu)] bg-[var(--shu)]/8" : "border-[var(--line-strong)]"
      }`}
    >
      <span
        className={`block w-full h-7 rounded-md ${swatchClass}`}
        style={{ background: "linear-gradient(150deg, var(--ban-surface1), var(--ban-surface2))" }}
      />
      <span className="text-[10px] opacity-75">{label}</span>
    </button>
  );
}
