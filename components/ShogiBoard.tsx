"use client";
// 将棋盤の表示と操作（Kifu Vault の盤を React 化したもの）
// 先手（あなた）が下。駒は五角形のかたち。成り駒は赤系。後手の駒は逆さま。
// 盤の色・駒のもじは「きせかえ」設定（lib/settings.ts）で変わる。
import { memo } from "react";
import type { GameState, PieceType, Square } from "@/lib/shogi/core";
import { useSettings, type KomaStyle } from "@/lib/settings";
import { uiText } from "@/lib/text";

const KANJI: Record<PieceType, string> = { P: "歩", L: "香", N: "桂", S: "銀", G: "金", B: "角", R: "飛", K: "玉" };
const PROMO: Record<string, string> = { P: "と", L: "杏", N: "圭", S: "全", B: "馬", R: "龍" };
// ひらがな駒（成り駒は色で分かるので、と・馬なども読みやすい字のまま）
const KANA: Record<PieceType, string> = { P: "ふ", L: "きょ", N: "けい", S: "ぎん", G: "きん", B: "かく", R: "ひ", K: "おう" };
const PROMO_KANA: Record<string, string> = { P: "と", L: "なり", N: "なり", S: "なり", B: "うま", R: "りゅ" };
const HAND_ORDER: PieceType[] = ["R", "B", "G", "S", "N", "L", "P"];
const ZEN = "０１２３４５６７８９";
const KAN = "〇一二三四五六七八九";

// 書体設定 → CSSクラス
const FACE_CLASS: Record<KomaStyle, string> = {
  kaisho: "komaface-kaisho",
  fude: "komaface-fude",
  maru: "komaface-maru",
  kana: "komaface-maru", // ひらがな駒はまる文字で
  dot: "komaface-dot",
};

export type HandSel = { hand: PieceType };
export type CellSel = { r: number; c: number };
export type Selection = CellSel | HandSel | null;

interface Props {
  state: GameState;
  selected?: Selection;
  targets?: Square[]; // 動けるマスのしるし
  lastTo?: Square | null; // 最後に動いたマス（うすい色）
  interactive?: boolean;
  onCellTap?: (r: number, c: number) => void;
  onHandTap?: (type: PieceType) => void; // 押せる側の持駒
  handTapColor?: "sente" | "gote"; // どちらの持駒を押せるか（ならべるモードでは手番側になる）
}

function pieceChar(type: PieceType, promoted: boolean, style: KomaStyle): string {
  if (style === "kana") {
    return promoted ? PROMO_KANA[type] ?? KANA[type] : KANA[type];
  }
  return promoted ? PROMO[type] ?? KANJI[type] : KANJI[type];
}

// 五角形の駒（1個）
function Koma({
  type, promoted, gote, lifted, style, hand,
}: {
  type: PieceType;
  promoted: boolean;
  gote?: boolean;
  lifted?: boolean;
  style: KomaStyle;
  hand?: boolean;
}) {
  const ch = pieceChar(type, promoted, style);
  return (
    <span className={`koma ${hand ? "koma-hand" : ""} ${gote ? "rotate-180" : ""} ${lifted ? "is-lifted" : ""}`} aria-hidden>
      <span
        className={`koma-char ${promoted && type !== "K" ? "is-promoted" : ""} ${ch.length > 1 ? "is-multi" : ""}`}
      >
        {ch}
      </span>
    </span>
  );
}

function HandRow({
  color, state, selected, interactive, onHandTap, style, meLabel, oppLabel, noHandLabel, tappable,
}: {
  color: "sente" | "gote";
  state: GameState;
  selected?: Selection;
  interactive?: boolean;
  onHandTap?: (t: PieceType) => void;
  style: KomaStyle;
  meLabel: string;
  oppLabel: string;
  noHandLabel: string;
  tappable: boolean; // この側の持ち駒を押せるか
}) {
  const hand = state.hands[color];
  const items = HAND_ORDER.filter((t) => (hand[t] ?? 0) > 0);
  const mine = color === "sente";
  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 min-h-11 rounded-lg border ${mine ? "" : "flex-row-reverse"}`}
      style={{ background: "var(--hand-bg)", borderColor: "var(--hand-border)" }}
    >
      <span className={`text-[11px] font-bold ${mine ? "" : "rotate-180"}`} style={{ color: "var(--hand-label)" }}>
        {mine ? meLabel : oppLabel}
      </span>
      <div className={`flex gap-1 flex-wrap ${mine ? "" : "flex-row-reverse"}`}>
        {items.length === 0 && (
          <span className="text-xs px-1" style={{ color: "var(--hand-empty)" }}>{noHandLabel}</span>
        )}
        {items.map((t) => {
          const n = hand[t] ?? 0;
          const isSel = !!selected && "hand" in selected && tappable && selected.hand === t;
          return (
            <button
              key={t}
              type="button"
              disabled={!tappable || !interactive}
              onClick={() => tappable && onHandTap?.(t)}
              className={`relative w-9 h-10 grid place-items-center rounded-md transition select-none
                ${tappable ? "cursor-pointer" : "cursor-default"}
                ${isSel ? "scale-110 ring-2 ring-yellow-500 rounded-md" : ""}
                ${tappable && interactive ? "active:scale-95" : ""}`}
              style={isSel ? { background: "var(--cell-sel)" } : undefined}
              aria-label={`持ち駒 ${KANJI[t]} ${n}枚`}
            >
              <Koma type={t} promoted={false} gote={!mine} style={style} hand />
              {n > 1 && (
                <span
                  className="absolute -right-1 -bottom-1 text-[10px] text-white rounded-full w-4 h-4 grid place-items-center"
                  style={{ background: "var(--hand-label)" }}
                >
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ShogiBoardInner({ state, selected, targets = [], lastTo, interactive = false, onCellTap, onHandTap, handTapColor = "sente" }: Props) {
  const { settings } = useSettings();
  const T = uiText(settings.textMode);
  const komaStyle = settings.koma;

  const isTarget = (r: number, c: number) => targets.some((t) => t.r === r && t.c === c);
  const isSelected = (r: number, c: number) => !!selected && "r" in selected && selected.r === r && selected.c === c;

  return (
    <div className={`w-full mx-auto flex flex-col gap-1.5 select-none ban-${settings.ban} ${FACE_CLASS[komaStyle]}`}>
      <HandRow
        color="gote" state={state} selected={selected} interactive={interactive} onHandTap={onHandTap}
        style={komaStyle} meLabel={T.me} oppLabel={T.opp} noHandLabel={T.noHand} tappable={handTapColor === "gote"}
      />

      <div>
        {/* 筋の数字（9〜1） */}
        <div className="grid grid-cols-9 px-px">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="text-center text-[10px] font-semibold" style={{ color: "var(--coord)" }}>
              {ZEN[9 - i]}
            </div>
          ))}
        </div>
        <div className="flex">
          {/* 盤本体: 外枠（木の額）の中に9×9 */}
          <div
            className="relative flex-1 rounded-lg p-[3px] shadow-md"
            style={{ background: "linear-gradient(165deg, var(--ban-frame1), var(--ban-frame2))" }}
          >
            <div
              className="relative grid grid-cols-9 grid-rows-9 aspect-square rounded-[5px] overflow-hidden"
              role="grid"
              aria-label="将棋盤"
              style={{
                background:
                  "repeating-linear-gradient(90deg, var(--ban-grain) 0 2px, transparent 2px 9px), linear-gradient(170deg, var(--ban-surface1), var(--ban-surface2))",
              }}
            >
              {state.board.map((row, r) =>
                row.map((p, c) => {
                  const sel = isSelected(r, c);
                  const tgt = isTarget(r, c);
                  const last = lastTo && lastTo.r === r && lastTo.c === c;
                  return (
                    <button
                      key={`${r}-${c}`}
                      type="button"
                      disabled={!interactive}
                      onClick={() => onCellTap?.(r, c)}
                      role="gridcell"
                      aria-label={`${9 - c}${KAN[r + 1]} ${p ? pieceChar(p.type, p.promoted, "kaisho") : "空き"}`}
                      className="relative grid place-items-center border-[0.5px] leading-none p-0"
                      style={{
                        borderColor: "var(--ban-line)",
                        background: sel
                          ? "var(--cell-sel)"
                          : last
                            ? "var(--cell-last)"
                            : tgt
                              ? "var(--cell-target)"
                              : "transparent",
                      }}
                    >
                      {tgt && !p && (
                        <span className="absolute w-1/4 h-1/4 rounded-full" style={{ background: "var(--target-dot)" }} aria-hidden />
                      )}
                      {tgt && p && (
                        <span
                          className="absolute inset-0 ring-3 ring-inset rounded-sm"
                          style={{ "--tw-ring-color": "var(--target-dot)" } as React.CSSProperties}
                          aria-hidden
                        />
                      )}
                      {p && (
                        <Koma
                          type={p.type}
                          promoted={p.promoted}
                          gote={p.color === "gote"}
                          lifted={sel}
                          style={komaStyle}
                        />
                      )}
                    </button>
                  );
                })
              )}
              {/* 星（盤の目印4つ） */}
              {[[3, 3], [3, 6], [6, 3], [6, 6]].map(([rr, cc]) => (
                <span
                  key={`${rr}${cc}`}
                  aria-hidden
                  className="absolute w-[5px] h-[5px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  style={{
                    left: `${(cc / 9) * 100}%`,
                    top: `${(rr / 9) * 100}%`,
                    background: "var(--ban-star)",
                  }}
                />
              ))}
            </div>
          </div>
          {/* 段の漢数字（一〜九） */}
          <div className="grid grid-rows-9 w-4 ml-0.5">
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className="grid place-items-center text-[10px] font-semibold" style={{ color: "var(--coord)" }}>
                {KAN[i + 1]}
              </div>
            ))}
          </div>
        </div>
      </div>

      <HandRow
        color="sente" state={state} selected={selected} interactive={interactive} onHandTap={onHandTap}
        style={komaStyle} meLabel={T.me} oppLabel={T.opp} noHandLabel={T.noHand} tappable={handTapColor === "sente"}
      />
    </div>
  );
}

const ShogiBoard = memo(ShogiBoardInner);
export default ShogiBoard;
