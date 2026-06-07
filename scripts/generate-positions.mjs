// 水匠10の自己対局で「本番の局面データ」を作るスクリプト。
//
// ★ 安全ルール（はじめ先生との約束 2026-06-08）— 変更禁止 ★
//   1. 問題を作る時だけ手動で実行する（常駐・タスクスケジューラ登録・24時間稼働は禁止）
//   2. 起動前に他のソフトがエンジンを使っていないか必ず確認（使用中なら即中止）
//   3. 思考時間は1局面 2〜3秒（既定 2500ms）
//   4. スレッドは8まで（32全部使わない＝パソコンに余裕を残す）
//   5. 指定数を作り終えたら自動で終了する
//   6. 黒い窓を出さない（windowsHide: true）
//
// 使い方（このフォルダで）:
//   node scripts/generate-positions.mjs                 → ためし生成（2局・少量）
//   node scripts/generate-positions.mjs --games 12      → 12局ぶん生成
//   出力: scripts/out/positions-<日時>.json （次に import-positions.mjs で投入）
import { spawn, execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ShogiCore from "../lib/shogi/core.js";

const ENGINE_DIR = "C:\\Users\\shoug\\将棋home\\engine\\suisho10";
const ENGINE_EXE = join(ENGINE_DIR, "YO860kai_AVX2.exe");
const THREADS = 8; // 約束: 8まで
const MOVETIME = 2500; // 約束: 2〜3秒
const MAX_PLIES = 110; // 1局の上限手数
const DECIDED_CP = 2800; // これを超えたら大勢決しとして終局
const CP_CLAMP = 2000;

// --- 戦法シード（lib/samples.ts と同じ定跡手順 + 追加） ---
const SEEDS = [
  { style: "ibisha", name: "相掛かり", moves: ["2g2f", "8c8d", "7g7f", "3c3d", "2f2e", "8d8e", "6i7h", "4a3b"] },
  { style: "ibisha", name: "矢倉", moves: ["7g7f", "8c8d", "7i6h", "3c3d", "6g6f", "7a6b", "5g5f", "5c5d"] },
  { style: "ibisha", name: "横歩取り", moves: ["7g7f", "3c3d", "2g2f", "8c8d", "2f2e", "8d8e", "6i7h", "4a3b", "2e2d", "2c2d", "2h2d"] },
  { style: "ibisha", name: "角換わり調", moves: ["2g2f", "3c3d", "7g7f", "8c8d", "2f2e", "8d8e", "8h7g"] },
  { style: "furibisha", name: "四間飛車", moves: ["7g7f", "3c3d", "6g6f", "8c8d", "2h6h", "8d8e", "7i7h", "7a6b"] },
  { style: "furibisha", name: "中飛車", moves: ["7g7f", "3c3d", "5g5f", "8c8d", "2h5h", "8d8e", "8h7g"] },
  { style: "furibisha", name: "三間飛車", moves: ["7g7f", "3c3d", "6g6f", "8c8d", "2h7h", "8d8e", "8h7g"] },
  { style: "other", name: "自由対局", moves: ["7g7f", "3c3d"] },
];

// ===== 引数 =====
const args = process.argv.slice(2);
function argNum(flag, dflt) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : dflt;
}
const GAMES = Math.max(1, Math.min(60, argNum("--games", 2)));

// ===== 安全チェック =====
function preflight() {
  let list = "";
  try {
    list = execSync("tasklist", { encoding: "utf8", windowsHide: true });
  } catch {
    console.error("⚠ 実行中ソフトの確認に失敗したため、安全のため中止します");
    process.exit(1);
  }
  if (/YO860kai|YaneuraOu|ShogiHome/i.test(list)) {
    console.error("⚠ エンジンまたはShogiHomeが使用中です。安全のため中止します（約束その2）");
    console.error("   → ShogiHome や検討を閉じてから、もう一度実行してください");
    process.exit(1);
  }
}

// ===== エンジンとのやりとり（USI） =====
function createEngine() {
  const proc = spawn(ENGINE_EXE, [], { cwd: ENGINE_DIR, windowsHide: true });
  let buffer = "";
  const waiters = [];
  proc.stdout.on("data", (d) => {
    buffer += d.toString();
    let nl;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      for (const w of waiters) w.lines.push(line);
    }
  });
  proc.on("error", (e) => {
    console.error(`エンジンを起動できませんでした: ${e.message}`);
    process.exit(1);
  });

  function send(cmd) {
    proc.stdin.write(cmd + "\n");
  }
  /** untilRe にマッチする行が来るまで待ち、その間の全行を返す */
  function waitFor(untilRe, timeoutMs = 60000) {
    return new Promise((resolve, reject) => {
      const w = { lines: [] };
      waiters.push(w);
      const started = Date.now();
      const timer = setInterval(() => {
        const hit = w.lines.find((l) => untilRe.test(l));
        if (hit) {
          clearInterval(timer);
          waiters.splice(waiters.indexOf(w), 1);
          resolve(w.lines);
        } else if (Date.now() - started > timeoutMs) {
          clearInterval(timer);
          waiters.splice(waiters.indexOf(w), 1);
          reject(new Error(`エンジンの返事待ちが時間切れ: ${untilRe}`));
        }
      }, 10);
    });
  }
  return { proc, send, waitFor };
}

/** info行から score と pv を取り出す（最後の有効行を採用） */
function parseSearch(lines) {
  let scoreCp = null;
  let mate = null;
  let pv = [];
  for (const line of lines) {
    if (!line.startsWith("info ") || !line.includes(" score ")) continue;
    const mCp = line.match(/ score cp (-?\d+)/);
    const mMate = line.match(/ score mate (-?\d+)/);
    const mPv = line.match(/ pv (.+)$/);
    if (mCp) {
      scoreCp = Number(mCp[1]);
      mate = null;
    } else if (mMate) {
      mate = Number(mMate[1]);
      scoreCp = null;
    }
    if (mPv) pv = mPv[1].trim().split(/\s+/);
  }
  return { scoreCp, mate, pv };
}

function clamp(v) {
  return Math.max(-CP_CLAMP, Math.min(CP_CLAMP, v));
}

function phaseOf(moveCount) {
  if (moveCount < 25) return "opening";
  if (moveCount <= 60) return "middle";
  return "endgame";
}

// ===== 本体 =====
async function main() {
  preflight();
  console.log(`水匠10で局面生成: ${GAMES}局（思考${MOVETIME}ms・${THREADS}スレッド・終わったら自動終了）`);

  const eng = createEngine();
  eng.send("usi");
  await eng.waitFor(/^usiok$/);
  eng.send(`setoption name Threads value ${THREADS}`);
  eng.send("setoption name USI_Hash value 512");
  eng.send("setoption name BookFile value no_book"); // 定跡を切って毎手探索＝毎局面に評価値が付く
  eng.send("isready");
  await eng.waitFor(/^readyok$/);

  const out = [];
  const seenSfen = new Set();

  for (let g = 0; g < GAMES; g++) {
    const seed = SEEDS[g % SEEDS.length];
    console.log(`\n— ${g + 1}/${GAMES}局目: シード「${seed.name}」(${seed.style})`);

    // シードを手元の盤でも進める（合法性の二重チェック）
    let st = ShogiCore.initialState();
    const moves = [];
    let seedOk = true;
    for (const u of seed.moves) {
      const next = ShogiCore.applyUsiStrict(st, u);
      if (!next) {
        console.error(`  ⚠ シードに非合法手 ${u} — この局はとばします`);
        seedOk = false;
        break;
      }
      st = next;
      moves.push(u);
    }
    if (!seedOk) continue;

    eng.send("usinewgame");
    for (let ply = moves.length; ply < MAX_PLIES; ply++) {
      eng.send(`position startpos moves ${moves.join(" ")}`);
      eng.send(`go movetime ${MOVETIME}`);
      const lines = await eng.waitFor(/^bestmove /, MOVETIME + 30000);
      const bestLine = lines.find((l) => l.startsWith("bestmove "));
      const best = bestLine.split(/\s+/)[1];
      const { scoreCp, mate, pv } = parseSearch(lines);

      if (best === "resign" || best === "win" || best === "(none)") {
        console.log(`  ${ply}手目で終局（${best}）`);
        break;
      }

      // 手番視点 → 先手視点へ
      let cpSente = null;
      if (scoreCp !== null) cpSente = st.turn === "sente" ? scoreCp : -scoreCp;
      else if (mate !== null) cpSente = (st.turn === "sente" ? 1 : -1) * (mate >= 0 ? CP_CLAMP : -CP_CLAMP);

      // 記録（評価値が取れた局面のみ・同一局面はスキップ）
      const sfen = ShogiCore.toSfen(st);
      if (cpSente !== null && !seenSfen.has(sfen)) {
        seenSfen.add(sfen);
        out.push({
          sfen,
          eval_cp: clamp(cpSente),
          best_move_usi: best,
          pv: pv.slice(0, 7),
          style_tag: seed.style,
          phase_tag: phaseOf(moves.length),
          comment: `水匠10自己対局（${seed.name}・思考${MOVETIME / 1000}秒）`,
        });
      }

      // 大勢が決したら終局
      if (cpSente !== null && Math.abs(cpSente) >= DECIDED_CP) {
        console.log(`  ${moves.length}手目で大勢決し（評価値 ${cpSente}）`);
        break;
      }

      const next = ShogiCore.applyUsiStrict(st, best);
      if (!next) {
        console.error(`  ⚠ エンジンの手 ${best} を盤に適用できず終局扱い`);
        break;
      }
      st = next;
      moves.push(best);
      if (moves.length % 10 === 0) console.log(`  …${moves.length}手目まで（記録 ${out.length}局面）`);
    }
  }

  eng.send("quit");
  setTimeout(() => eng.proc.kill(), 2000); // 念のため確実に終了（約束その5）

  const dir = join(dirname(fileURLToPath(import.meta.url)), "out");
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);
  const file = join(dir, `positions-${stamp}.json`);
  writeFileSync(file, JSON.stringify(out, null, 1), "utf8");
  console.log(`\n✅ ${out.length}局面を書き出しました → ${file}`);
  console.log("   次: node scripts/import-positions.mjs <このファイル> <アプリのURL>");
}

main().catch((e) => {
  console.error(`エラー: ${e.message}`);
  process.exit(1);
});
