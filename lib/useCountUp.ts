"use client";
// 数字をなめらかに 0→target までカウントアップするフック（点数の演出用）。
// prefers-reduced-motion のときは一瞬で target を出す。
import { useEffect, useRef, useState } from "react";

export function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setValue(target);
      return;
    }

    let start: number | null = null;
    const from = 0;
    const step = (t: number) => {
      if (start === null) start = t;
      const p = Math.min(1, (t - start) / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs]);

  return value;
}
