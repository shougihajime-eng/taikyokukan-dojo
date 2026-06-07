// 通しテスト: ログイン → けいこ開始 → 全問判定 → 終了集計 → クセ分析 → 先生ページ
// 使い方: node scripts/golden-path-test.mjs [ベースURL]
// 環境変数 TEACHER_PASSWORD を .env.local から読む
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.argv[2] ?? "http://localhost:3000";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envText = readFileSync(join(root, ".env.local"), "utf8");
const TEACHER_PASSWORD = envText.match(/^TEACHER_PASSWORD=(.*)$/m)?.[1]?.trim();

let failed = 0;
function check(name, cond, detail = "") {
  if (cond) console.log(`  OK  ${name}`);
  else {
    failed++;
    console.log(`  NG  ${name} ${detail}`);
  }
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

console.log(`通しテスト開始: ${BASE}`);

// 0) 画面の疎通（全ルート200）
for (const p of ["/", "/play", "/dashboard", "/teacher"]) {
  const res = await fetch(`${BASE}${p}`);
  check(`GET ${p} が 200`, res.status === 200, `→ ${res.status}`);
}

// 1) ログイン（テスト用生徒・毎回同じ名前で再ログインも検証）
const name = "通しテスト用";
const login1 = await post("/api/login", { name, pass: "test-1234" });
check("ログイン（登録 or 再ログイン）", login1.status === 200, JSON.stringify(login1.data));
const studentId = login1.data?.id;
const loginNg = await post("/api/login", { name, pass: "wrong-pass" });
check("まちがった合言葉は 401", loginNg.status === 401);

// 2) けいこ開始
const start = await post("/api/session/start", { studentId, mode: "winrate", styleFilter: "all", count: 10 });
check("けいこ開始", start.status === 200, JSON.stringify(start.data));
const { sessionId, positions } = start.data ?? {};
check("セッションIDが発行される", typeof sessionId === "string");
check("局面が10個くる", Array.isArray(positions) && positions.length === 10);
check(
  "出題データに評価値が入っていない（答えを隠す）",
  positions.every((p) => !("eval_cp" in p) && !("evalCp" in p) && !("best_move_usi" in p))
);

// 3) 全問判定
let revealOk = true;
let savedOk = true;
for (let i = 0; i < positions.length; i++) {
  const r = await post("/api/guess", {
    positionId: positions[i].id,
    guessWinrate: 0.4 + (i % 3) * 0.1,
    sessionId,
    studentId,
    orderNo: i,
  });
  if (r.status !== 200) savedOk = false;
  if (typeof r.data?.actualCp !== "number" || typeof r.data?.actualWinrate !== "number") revealOk = false;
}
check("全10問の判定が成功", savedOk);
check("判定で評価値が開示される", revealOk);

// 4) 終了集計
const fin = await post("/api/session/finish", { sessionId, studentId });
check("終了集計", fin.status === 200, JSON.stringify(fin.data));
check("精度ポイントが0..100", typeof fin.data?.weightedScore === "number" && fin.data.weightedScore >= 0 && fin.data.weightedScore <= 100);
check("10問ぶん集計された", fin.data?.n === 10);

// 5) クセ分析
const bias = await post("/api/bias", { studentId });
check("クセ分析", bias.status === 200);
check("全体の傾向が出る（10問でデータ充足）", bias.data?.overall?.enough === true, JSON.stringify(bias.data?.overall));
check("時系列が1件以上", Array.isArray(bias.data?.trend) && bias.data.trend.length >= 1);

// 6) 先生ページ
const t1 = await post("/api/teacher", { pass: TEACHER_PASSWORD });
check("先生ページ（正しい合言葉）", t1.status === 200);
check("テスト生徒が一覧に出る", t1.data?.students?.some((s) => s.name === name));
const t2 = await post("/api/teacher", { pass: "wrong" });
check("先生ページ（違う合言葉は401）", t2.status === 401);

// 7) インポートの検証（不正データが弾かれる）
const imp = await post("/api/import", {
  pass: TEACHER_PASSWORD,
  positions: [
    { sfen: "これは不正", eval_cp: 0, style_tag: "ibisha", phase_tag: "opening" },
  ],
});
check("不正なSFENは弾かれて報告される", imp.status === 200 && imp.data?.inserted === 0 && imp.data?.rejectedCount === 1, JSON.stringify(imp.data));

console.log(failed === 0 ? "\n✅ 通しテスト全部OK" : `\n❌ 失敗 ${failed} 件`);
process.exit(failed === 0 ? 0 : 1);
