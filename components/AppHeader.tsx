"use client";
// 上部バー（けいこ・クセ・先生の各画面で共通）。
// 左に「もどる」、中央に道場の小さな題字、右に「きせかえ」ボタン。
import { useState } from "react";
import Link from "next/link";
import ThemeSheet from "@/components/ThemeSheet";

export default function AppHeader({
  back = "/",
  backLabel = "もどる",
  title = "大局観道場",
  showDressup = true,
}: {
  back?: string;
  backLabel?: string;
  title?: string;
  showDressup?: boolean;
}) {
  const [sheet, setSheet] = useState(false);
  return (
    <>
      <header className="appbar">
        <div className="appbar-inner">
          <Link href={back} className="chip" aria-label={backLabel}>
            <span aria-hidden>←</span>
            <span>{backLabel}</span>
          </Link>
          <span className="font-mincho text-base tracking-wide select-none">{title}</span>
          {showDressup ? (
            <button type="button" onClick={() => setSheet(true)} className="chip" aria-label="きせかえ">
              <span aria-hidden>🎨</span>
              <span>きせかえ</span>
            </button>
          ) : (
            <span className="w-16" />
          )}
        </div>
      </header>
      {showDressup && <ThemeSheet open={sheet} onClose={() => setSheet(false)} />}
    </>
  );
}
