"use client";
// 起動画面（スプラッシュ・暗い藍×金）: 筆ロゴ「大局観道場」が書かれ、金粉が舞い、朱の落款が押される。
// セッションに1回だけ表示（けいこから戻ったときは出ない）。
import { useEffect, useState } from "react";
import { SPLASH } from "@/lib/text";

const SEEN_KEY = "taikyoku_splash_seen_v1";

export default function Splash() {
  const [show, setShow] = useState(false);
  const [omoi, setOmoi] = useState(false);

  // SSRとずれないよう、表示判定は描画後に行う（一度見たセッションでは出さない）
  useEffect(() => {
    try {
      if (!sessionStorage.getItem(SEEN_KEY)) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  function dismiss() {
    try { sessionStorage.setItem(SEEN_KEY, "1"); } catch {}
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="splash-screen">
      <div className="sp-frame" />
      <div className="sp-stage">
        <div className="sp-emblem"><span>{SPLASH.emblem}</span></div>
        <div className="sp-titlewrap">
          <div className="sp-word">{SPLASH.brand}</div>
          <div className="sp-seal">{SPLASH.seal}</div>
        </div>
        <div className="sp-stroke" />
        <div className="sp-tag">{SPLASH.tag}</div>
        <div className="sp-sub">{SPLASH.sub}</div>
        <button type="button" className="sp-start" onClick={dismiss}>{SPLASH.start}</button>
        <button type="button" className="sp-omoi" onClick={() => setOmoi(true)}>{SPLASH.omoiBtn}</button>
        <div className="sp-hint">{SPLASH.hint}</div>
      </div>

      {/* 「このアプリについて」＝序文が巻物のように開く */}
      {omoi && (
        <div className="omoi-ov" onClick={() => setOmoi(false)}>
          <div className="omoi-card" onClick={(e) => e.stopPropagation()}>
            <div className="omoi-title">{SPLASH.omoiTitle}</div>
            <div className="omoi-lines">
              {SPLASH.lines.map((line, i) => (
                <p key={i} className="sp-jo-line" style={{ animationDelay: `${0.2 + i * 0.34}s` }}>
                  {line}
                </p>
              ))}
            </div>
            <button type="button" className="omoi-close" onClick={() => setOmoi(false)}>とじる</button>
          </div>
        </div>
      )}
    </div>
  );
}
