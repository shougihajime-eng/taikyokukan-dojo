// 画面のことば: ひらがな(小学生むけ) と 漢字(大人向け) の切替表
// ⚠ 形勢の予測スライダーは常に「先手から見て」なので、持ち駒のラベルも ▲先手/△後手 で固定。
import type { TextMode } from "./settings";

const STRINGS = {
  kana: {
    subtitle: "けいせいはんだん を きたえる どうじょう",
    me: "▲せんて",
    opp: "△ごて",
    noHand: "持ち駒なし",
    loading: "よみこみ中…",
    loginTitle: "☁️ きろくを残す（ログイン）",
    loginHint: "なまえ と じぶんで決めた あいことば だけでOK。べつの端末でも続きができるよ",
    namePh: "なまえ（例: はじめ）",
    passPh: "あいことば（4文字以上・わすれないでね）",
    loginBtn: "はじめる／つづける",
    loginChecking: "確認中…",
    loginEmpty: "なまえ と あいことば を入れてね",
    loginFail: "うまくいきませんでした",
    loginOffline: "通信できませんでした。電波を確認してね",
    logout: "ログアウト",
    teacher: "先生用",
    dressup: "🎨 きせかえ",
    textModeLabel: "ことば",
    komaLabel: "駒のもじ",
    banLabel: "盤のいろ",
    modeKana: "ひらがな（小学生）",
    modeKanji: "かんじ（大人）",
    back: "← もどる",
  },
  kanji: {
    subtitle: "形勢判断を鍛える道場",
    me: "▲先手",
    opp: "△後手",
    noHand: "持ち駒なし",
    loading: "読み込み中…",
    loginTitle: "☁️ 記録を残す（ログイン）",
    loginHint: "名前と自分で決めた合言葉だけでOK。別の端末でも続きができます",
    namePh: "名前（例: はじめ）",
    passPh: "合言葉（4文字以上・忘れずに）",
    loginBtn: "はじめる／続きから",
    loginChecking: "確認中…",
    loginEmpty: "名前と合言葉を入力してください",
    loginFail: "うまくいきませんでした",
    loginOffline: "通信できませんでした。電波を確認してください",
    logout: "ログアウト",
    teacher: "先生用",
    dressup: "🎨 デザイン設定",
    textModeLabel: "表示",
    komaLabel: "駒の書体",
    banLabel: "盤のデザイン",
    modeKana: "ひらがな（小学生）",
    modeKanji: "漢字（大人）",
    back: "← 戻る",
  },
};

export type UiText = (typeof STRINGS)["kana"];

export function uiText(mode: TextMode): UiText {
  return STRINGS[mode];
}

// ===== 起動画面（スプラッシュ）の文章 =====
// ツメル譲りの上品な起動演出（暗い藍×金）。形勢を読む目を育てる導入。
export const SPLASH = {
  brand: "大局観道場",
  emblem: "局",
  seal: "道",
  tag: "盤上に、世界が広がる。",
  sub: "── 形勢判断トレーニング ──",
  start: "はじめる",
  omoiBtn: "このアプリについて",
  omoiTitle: "このアプリについて",
  lines: [
    "将棋の強さは、形勢を読む目から。",
    "どちらが、どれだけ有利なのか。",
    "その見立てを、AIと答え合わせ。",
    "くりかえすほど、判断の軸が育つ。",
    "盤上に広がる世界を、その目で。",
  ],
  hint: "ボタンをおして はじめよう",
};

// スプラッシュで使う文字だけをフォントに読み込むための一覧（自動で同期）
export const SPLASH_CHARS = Array.from(
  new Set(
    [
      SPLASH.brand, SPLASH.emblem, SPLASH.seal, SPLASH.tag, SPLASH.sub,
      SPLASH.start, SPLASH.omoiBtn, SPLASH.omoiTitle, ...SPLASH.lines, SPLASH.hint,
    ]
      .join("")
      .replace(/\s/g, "")
  )
).join("");
