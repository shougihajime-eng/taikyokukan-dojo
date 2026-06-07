// ログインした生徒の情報を端末（localStorage）に保持する小さなヘルパー
"use client";

export interface Student {
  id: string;
  name: string;
}

const KEY = "taikyokukan_student_v1";

export function loadStudent(): Student | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<Student>;
    if (typeof v.id === "string" && typeof v.name === "string") return { id: v.id, name: v.name };
    return null;
  } catch {
    return null;
  }
}

export function saveStudent(s: Student) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // 保存できない環境でも動かす
  }
}

export function clearStudent() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 何もしない
  }
}
