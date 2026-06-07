// 生成した局面JSONをアプリに投入するスクリプト（/api/import 経由・合言葉ガード）。
// アプリ側で全局面の合法性がもう一度機械検証される（不正は弾かれて報告される）。
//
// 使い方:
//   node scripts/import-positions.mjs scripts/out/positions-xxxx.json                → ローカル(3000)へ
//   node scripts/import-positions.mjs scripts/out/positions-xxxx.json https://taikyokukan-dojo.vercel.app
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const file = process.argv[2];
const BASE = process.argv[3] ?? "http://localhost:3000";
if (!file) {
  console.error("使い方: node scripts/import-positions.mjs <JSONファイル> [アプリのURL]");
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envText = readFileSync(join(root, ".env.local"), "utf8");
const pass = envText.match(/^TEACHER_PASSWORD=(.*)$/m)?.[1]?.trim();
if (!pass) {
  console.error(".env.local に TEACHER_PASSWORD がありません");
  process.exit(1);
}

const positions = JSON.parse(readFileSync(file, "utf8"));
if (!Array.isArray(positions) || positions.length === 0) {
  console.error("JSONに局面がありません");
  process.exit(1);
}
console.log(`${positions.length}局面を ${BASE} へ投入します`);

let inserted = 0;
let rejected = 0;
const CHUNK = 500;
for (let i = 0; i < positions.length; i += CHUNK) {
  const chunk = positions.slice(i, i + CHUNK);
  const res = await fetch(`${BASE}/api/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pass, positions: chunk }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error(`投入に失敗: ${data.error ?? res.status}`);
    process.exit(1);
  }
  inserted += data.inserted ?? 0;
  rejected += data.rejectedCount ?? 0;
  for (const r of data.rejected ?? []) console.warn(`  弾かれた: ${r}`);
  console.log(`  ${Math.min(i + CHUNK, positions.length)}/${positions.length} …`);
}
console.log(`✅ 投入 ${inserted}件 ／ 弾かれた ${rejected}件`);
