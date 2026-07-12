// 手の感触（触覚フィードバック）── 駒を「持った・置いた」感じを指に返す。
//
// 機種ごとの事情（正直に）:
//  ・Android など：navigator.vibrate が使えるので、種類ごとに強さを変えて振動。
//  ・iPhone：Safari は通常の vibrate が使えない。→ 隠した「スイッチ部品」を
//            トグルすると iOS が“コトッ”という触覚を出す裏ワザを使う（iOS 17.4+）。
//            強さは一定（種類で変えられない）。タップの瞬間（ユーザー操作の中）に呼ぶ必要がある。
//  ・iPad：本体に振動する部品（Taptic Engine）が無いので、触覚はそもそも出せない。
//          → 触覚は静かに何もしない。持った感じは「駒の持ち上がり＋木の音」で演出する。
"use client";

const KEY = "taikyoku_haptic_v1";

export function hapticEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(KEY) !== "0"; // 既定オン
  } catch {
    return true;
  }
}
export function setHapticEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    // 保存できなくてもアプリは動かす
  }
}

// iPhone用：隠した <label><input type="checkbox" switch></label> を1つ用意し、
// トグル（click）するたびに iOS が触覚を返す。
let switchEl: HTMLElement | null = null;
function iosHapticSwitch(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  if (switchEl) return switchEl;
  try {
    const label = document.createElement("label");
    label.setAttribute("aria-hidden", "true");
    label.style.cssText =
      "position:fixed;top:-9999px;left:-9999px;width:0;height:0;opacity:0;pointer-events:none;overflow:hidden;";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", ""); // iOSのスイッチ表示（これがあると触覚が出る）
    input.tabIndex = -1;
    label.appendChild(input);
    document.body.appendChild(label);
    switchEl = label;
    return label;
  } catch {
    return null;
  }
}

type Kind = "grab" | "place" | "correct" | "wrong";

// 感触を出す。かならず「タップの瞬間（onClick等）の中」から呼ぶこと（iOSの制約）。
export function haptic(kind: Kind) {
  if (!hapticEnabled()) return;
  // ① Android など：振動APIがあれば種類ごとに強さを変える
  try {
    const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
    if (typeof nav.vibrate === "function") {
      const pat: number | number[] =
        kind === "place" ? [0, 22] : // 駒を置く＝しっかり
        kind === "correct" ? [0, 12, 40, 18] : // 正解＝トン・トン
        kind === "wrong" ? 40 : // まちがい＝短いブッ
        8; // grab（つかむ）＝ごく軽く
      nav.vibrate(pat);
      return;
    }
  } catch {
    // vibrate が無ければ次へ
  }
  // ② iPhone：スイッチのトグルで触覚（強さは一定）
  try {
    const el = iosHapticSwitch();
    if (el) el.click();
  } catch {
    // iPad等（振動部品なし）は静かに何もしない
  }
}
