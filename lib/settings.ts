// きせかえ・表示モードの設定（localStorage に保存・全画面で共有）
"use client";

import { useEffect, useState } from "react";

export type TextMode = "kana" | "kanji"; // ひらがな(小学生) / 漢字(大人)
export type KomaStyle = "kaisho" | "fude" | "maru" | "kana" | "dot"; // 駒のもじ
export type BanTheme = "kaya" | "sakura" | "wakaba" | "yozora"; // 盤のデザイン

export interface Settings {
  textMode: TextMode;
  koma: KomaStyle;
  ban: BanTheme;
}

export const DEFAULT_SETTINGS: Settings = { textMode: "kana", koma: "kaisho", ban: "kaya" };

const KEY = "taikyokukan_settings_v1";
const EVENT = "taikyokukan-settings-changed";

export function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const v = JSON.parse(raw) as Partial<Settings>;
    return {
      textMode: v.textMode === "kanji" ? "kanji" : "kana",
      koma: (["kaisho", "fude", "maru", "kana", "dot"] as const).includes(v.koma as KomaStyle)
        ? (v.koma as KomaStyle)
        : "kaisho",
      ban: (["kaya", "sakura", "wakaba", "yozora"] as const).includes(v.ban as BanTheme)
        ? (v.ban as BanTheme)
        : "kaya",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(patch: Partial<Settings>) {
  const next = { ...loadSettings(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 保存できない環境でも動かす
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

// どの画面からでも同じ設定が見える小さなフック
export function useSettings(): { settings: Settings; update: (patch: Partial<Settings>) => void } {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  useEffect(() => {
    setSettings(loadSettings());
    const onChange = () => setSettings(loadSettings());
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange); // 別タブで変えた時
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return { settings, update: saveSettings };
}

// --- 駒のもじ・盤デザインの見出し（選択ボタン用） ---
export const KOMA_STYLES: { id: KomaStyle; kana: string; kanji: string; sample: string; cls: string }[] = [
  { id: "kaisho", kana: "きほん", kanji: "楷書", sample: "銀", cls: "komaface-kaisho" },
  { id: "fude", kana: "ふでもじ", kanji: "筆文字", sample: "銀", cls: "komaface-fude" },
  { id: "maru", kana: "まるもじ", kanji: "丸文字", sample: "銀", cls: "komaface-maru" },
  { id: "kana", kana: "ひらがな", kanji: "ひらがな", sample: "ぎん", cls: "komaface-maru" },
  { id: "dot", kana: "ゲーム", kanji: "ゲーム", sample: "銀", cls: "komaface-dot" },
];

export const BAN_THEMES: { id: BanTheme; kana: string; kanji: string }[] = [
  { id: "kaya", kana: "かやの木", kanji: "榧の木" },
  { id: "sakura", kana: "さくら", kanji: "桜" },
  { id: "wakaba", kana: "わかば", kanji: "若葉" },
  { id: "yozora", kana: "よぞら", kanji: "夜空" },
];
