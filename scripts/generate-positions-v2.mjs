// 水匠10で「形勢のはっきりした本番局面」を作るスクリプト（バンド指定版）。
//
// ねらい（はじめ先生の指示 2026-06-09）:
//   - 序盤・中盤・終盤それぞれ、評価差が「はっきり」した局面を中心に作る
//     （±100〜300のモヤッとは避け、だいたい 600〜700点差くらいの面白い差を狙う）
//   - 少しだけ「互角（±100以内）」の局面も混ぜる（序盤・中盤）
//   - 形は自然に。片側に「ありがちな緩手（top数手のうちの下の手）」を入れて差を作る
//   - 売り物なので手抜き厳禁 → 採用する局面は最後に思考2.5秒で評価を取り直す
//
// ★ 安全ルール（変更禁止・generate-positions.mjs と同じ約束）★
//   1. 問題を作る時だけ手動実行（常駐・タスク登録・24時間稼働は禁止）
//   2. 起動前に他ソフトがエンジン使用中なら即中止
//   3. 思考時間は1局面 2〜3秒（生成中の対局は短め・採用局面の確定は2.5秒）
//   4. スレッドは8まで
//   5. 作り終えたら自動終了
//   6. 黒い窓を出さない（windowsHide: true）
//
// 使い方（このフォルダで・ShogiHome等を閉じてから）:
//   node scripts/generate-positions-v2.mjs            → 序盤50・中盤50・終盤50
//   node scripts/generate-positions-v2.mjs --smoke    → 各フェーズ少量で動作確認（数分）
//   node scripts/generate-positions-v2.mjs --only middle
//   出力: scripts/out/positions-v2-<日時>.json
import { spawn, execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ShogiCore from "../lib/shogi/core.js";

const ENGINE_DIR = "C:\\Users\\shoug\\将棋home\\engine\\suisho10";
const ENGINE_EXE = join(ENGINE_DIR, "YO860kai_AVX2.exe");
const THREADS = 8;
const MULTIPV = 6; // 緩手えらび用に上位6手を見る
const SCAN_MS = 900; // 対局を進めるときの思考（短め＝たくさん回す）
const VERIFY_MS = 2500; // 採用局面の確定評価（約束の2〜3秒）
const CP_CLAMP = 2000;
const MATE_CP = 2000; // 詰みは±2000相当に

// 戦法シード（lib/samples.ts と同じ実在の定跡手順）
const SEEDS = [
  { style: "ibisha", name: "相掛かり", moves: ["2g2f", "8c8d", "7g7f", "3c3d", "2f2e", "8d8e", "6i7h", "4a3b"] },
  { style: "ibisha", name: "矢倉", moves: ["7g7f", "8c8d", "7i6h", "3c3d", "6g6f", "7a6b", "5g5f", "5c5d"] },
  { style: "ibisha", name: "横歩取り", moves: ["7g7f", "3c3d", "2g2f", "8c8d", "2f2e", "8d8e", "6i7h", "4a3b", "2e2d", "2c2d", "2h2d"] },
  { style: "ibisha", name: "角換わり調", moves: ["2g2f", "3c3d", "7g7f", "8c8d", "2f2e", "8d8e", "8h7g"] },
  { style: "furibisha", name: "四間飛車", moves: ["7g7f", "3c3d", "6g6f", "8c8d", "2h6h", "8d8e", "7i7h", "7a6b"] },
  { style: "furibisha", name: "中飛車", moves: ["7g7f", "3c3d", "5g5f", "8c8d", "2h5h", "8d8e", "8h7g"] },
  { style: "furibisha", name: "三間飛車", moves: ["7g7f", "3c3d", "6g6f", "8c8d", "2h7h", "8d8e", "8h7g"] },
  { style: "ibisha", name: "角換わり腰掛", moves: ["7g7f", "8c8d", "2g2f", "3c3d", "2f2e", "2b3c", "8h3c", "2a3c"] },
  { style: "furibisha", name: "ゴキゲン中飛車", moves: ["2g2f", "3c3d", "7g7f", "5c5d", "2f2e", "5d5e"] },
  { style: "other", name: "自由対局A", moves: ["7g7f", "3c3d"] },
  { style: "other", name: "自由対局B", moves: ["2g2f", "8c8d"] },
];

// ===== フェーズ設定 =====
// band=はっきり差バンド[min,max]（先手から見た絶対値cp）/ even=互角バンド上限
const PHASE_CFG = {
  opening: {
    label: "序盤",
    plyMin: 10, plyMax: 24, maxPly: 26,
    band: [450, 850], quota: 42,
    evenMax: 110, evenQuota: 8,
    startMistakePly: 8, stopMistakePly: 24, weakMinDrop: 60, weakMaxDrop: 360,
    decidedStop: 1400, // 序盤は差がつきすぎたら打ち切って次の対局へ
    scanMs: 900, wallMs: 14 * 60_000,
  },
  middle: {
    label: "中盤",
    plyMin: 26, plyMax: 60, maxPly: 62,
    band: [520, 1080], quota: 42,
    evenMax: 120, evenQuota: 8,
    startMistakePly: 12, stopMistakePly: 60, weakMinDrop: 70, weakMaxDrop: 520,
    decidedStop: 1700,
    scanMs: 900, wallMs: 14 * 60_000,
  },
  endgame: {
    label: "終盤",
    plyMin: 58, plyMax: 130, maxPly: 140,
    band: [620, 1850], quota: 50,
    evenMax: 0, evenQuota: 0,
    // 中盤までに「ほどよい差(〜600〜900)」をつけ、stopMistakePly以降は両者最善で
    // 「勝勢を勝ちきる」長い終盤を作る → 帯[620,1850]に長く留まりたくさん採れる
    startMistakePly: 14, stopMistakePly: 40, weakMinDrop: 60, weakMaxDrop: 240,
    decidedStop: 1900,
    scanMs: 700, wallMs: 25 * 60_000,
  },
};

// ===== 引数 =====
const args = process.argv.slice(2);
const SMOKE = args.includes("--smoke");
function argVal(flag) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
}
const ONLY = argVal("--only");
const QUOTA_OVERRIDE = argVal("--quota") ? Number(argVal("--quota")) : null;
const EVEN_OVERRIDE = argVal("--even") !== null ? Number(argVal("--even")) : null;
const WALL_OVERRIDE = argVal("--wall") ? Number(argVal("--wall")) * 1000 : null;
const WALL_MS_PER_PHASE = WALL_OVERRIDE ?? (SMOKE ? 90_000 : 16 * 60_000); // 1フェーズの上限時間（安全網）

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

// ===== エンジン（USI） =====
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
  function send(cmd) { proc.stdin.write(cmd + "\n"); }
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
      }, 8);
    });
  }
  return { proc, send, waitFor };
}

/** MultiPV の info 行を multipv番号ごとに最後（最深）の {scoreCp,mate,pv,move} にまとめる */
function parseMultiPV(lines) {
  const map = new Map();
  for (const line of lines) {
    if (!line.startsWith("info ") || !line.includes(" score ")) continue;
    const mIdx = line.match(/ multipv (\d+)/);
    const idx = mIdx ? Number(mIdx[1]) : 1;
    const mCp = line.match(/ score cp (-?\d+)/);
    const mMate = line.match(/ score mate (-?\d+)/);
    const mPv = line.match(/ pv (.+)$/);
    const entry = { scoreCp: null, mate: null, pv: [], move: null };
    if (mCp) entry.scoreCp = Number(mCp[1]);
    if (mMate) entry.mate = Number(mMate[1]);
    if (mPv) entry.pv = mPv[1].trim().split(/\s+/);
    entry.move = entry.pv[0] ?? null;
    map.set(idx, entry);
  }
  return map;
}

/** 手番視点スコア(cp相当) を返す（詰みは±MATE_CP） */
function stmScore(entry) {
  if (entry.mate !== null) return entry.mate >= 0 ? MATE_CP : -MATE_CP;
  if (entry.scoreCp !== null) return entry.scoreCp;
  return null;
}

function clamp(v) { return Math.max(-CP_CLAMP, Math.min(CP_CLAMP, v)); }

/** 読み筋を core.js で検証し、合法な範囲だけ返す（最大7手） */
function legalPv(st, pv) {
  const out = [];
  let cur = st;
  for (const u of pv.slice(0, 7)) {
    const next = ShogiCore.applyUsiStrict(cur, u);
    if (!next) break;
    out.push(u);
    cur = next;
  }
  return out;
}

/** position go を1回。multipvマップと bestmove を返す */
async function search(eng, moves, movetime) {
  eng.send(`position startpos moves ${moves.join(" ")}`);
  eng.send(`go movetime ${movetime}`);
  const lines = await eng.waitFor(/^bestmove /, movetime + 30000);
  const bestLine = lines.find((l) => l.startsWith("bestmove "));
  const bestmove = bestLine ? bestLine.split(/\s+/)[1] : null;
  return { map: parseMultiPV(lines), bestmove };
}

// ===== 1フェーズぶんの収集 =====
async function collectPhase(eng, phase, seenSfen, out) {
  const cfg = PHASE_CFG[phase];
  const quota = QUOTA_OVERRIDE ?? (SMOKE ? 3 : cfg.quota);
  const evenQuota = EVEN_OVERRIDE ?? (SMOKE ? 1 : cfg.evenQuota);
  const scanMs = cfg.scanMs ?? SCAN_MS;
  const wallMs = WALL_OVERRIDE ?? (SMOKE ? 90_000 : cfg.wallMs ?? 16 * 60_000);
  let clearN = 0, evenN = 0;
  const phaseStart = Date.now();
  let game = 0;

  console.log(`\n=== ${cfg.label}を集める（はっきり${quota}・互角${evenQuota}）===`);

  while ((clearN < quota || evenN < evenQuota) && Date.now() - phaseStart < wallMs) {
    const seed = SEEDS[game % SEEDS.length];
    game++;
    // 緩手をどちら側に入れるか（対局ごとに交互＝＋と−の両方の局面ができる）
    const weakSide = game % 2 === 0 ? "sente" : "gote";

    // シードを手元の盤でも進める（合法性の二重チェック）
    let st = ShogiCore.initialState();
    const moves = [];
    let ok = true;
    for (const u of seed.moves) {
      const next = ShogiCore.applyUsiStrict(st, u);
      if (!next) { ok = false; break; }
      st = next; moves.push(u);
    }
    if (!ok) continue;

    eng.send("usinewgame");
    for (let ply = moves.length; ply < cfg.maxPly; ply++) {
      if (Date.now() - phaseStart >= wallMs) break;
      if (clearN >= quota && evenN >= evenQuota) break;

      // 詰み・手詰まりなら終局
      if (!ShogiCore.hasAnyLegalMove(st)) break;

      const { map, bestmove } = await search(eng, moves, scanMs);
      const best = map.get(1);
      if (!best || best.move === null) {
        if (!bestmove || bestmove === "resign" || bestmove === "win" || bestmove === "(none)") break;
      }
      const bestMoveUsi = (best && best.move) || bestmove;
      const sc = best ? stmScore(best) : null;

      // 先手から見た評価値
      let cpSente = null;
      if (sc !== null) cpSente = st.turn === "sente" ? sc : -sc;

      // ---- 記録判定（この局面 st を出題候補にする）----
      if (cpSente !== null) {
        const sfen = ShogiCore.toSfen(st);
        const abs = Math.abs(cpSente);
        const inThisPhasePly = moves.length >= cfg.plyMin && moves.length <= cfg.plyMax;
        const isClear = abs >= cfg.band[0] && abs <= cfg.band[1];
        const isEven = cfg.evenQuota > 0 && abs <= cfg.evenMax;
        const wantClear = isClear && clearN < quota;
        const wantEven = isEven && evenN < evenQuota;
        if (inThisPhasePly && (wantClear || wantEven) && !seenSfen.has(sfen)) {
          // 採用候補 → 確定評価を2.5秒で取り直す
          const v = await search(eng, moves, VERIFY_MS);
          const vb = v.map.get(1);
          const vsc = vb ? stmScore(vb) : null;
          if (vsc !== null) {
            const vCpSente = st.turn === "sente" ? vsc : -vsc;
            const vAbs = Math.abs(vCpSente);
            // 取り直しても帯に残っているものだけ採用（ノイズ除去）
            const stillClear = vAbs >= cfg.band[0] && vAbs <= cfg.band[1] && clearN < quota;
            const stillEven = cfg.evenQuota > 0 && vAbs <= cfg.evenMax && evenN < evenQuota;
            if (stillClear || stillEven) {
              const vBestMove = (vb && vb.move) || bestMoveUsi;
              const pv = vb && vb.pv && vb.pv.length ? legalPv(st, vb.pv) : [];
              const bandKind = stillClear ? "clear" : "even";
              seenSfen.add(sfen);
              out.push({
                sfen,
                eval_cp: clamp(Math.round(vCpSente)),
                best_move_usi: ShogiCore.usiToMove(st, vBestMove) ? vBestMove : null,
                pv,
                style_tag: seed.style,
                phase_tag: phase,
                comment: `水匠10生成（${seed.name}・${cfg.label}・思考${VERIFY_MS / 1000}秒・${bandKind === "clear" ? "はっきり" : "互角"}）`,
              });
              if (bandKind === "clear") clearN++; else evenN++;
              if ((clearN + evenN) % 5 === 0) {
                console.log(`  ${cfg.label}: はっきり${clearN}/${quota}・互角${evenN}/${evenQuota}（${out.length}局面）`);
              }
            }
          }
        }
      }

      // ---- 次の手を選ぶ ----
      let chosen = bestMoveUsi;
      const weakTurn =
        st.turn === weakSide &&
        moves.length >= cfg.startMistakePly &&
        moves.length <= (cfg.stopMistakePly ?? cfg.maxPly);
      if (weakTurn && best) {
        const bestSc = stmScore(best);
        // 上位手のうち「ほどよい緩手（落差が weakMinDrop〜weakMaxDrop）」で最大の落差を選ぶ
        let pick = null, pickDrop = -1;
        for (const e of map.values()) {
          if (!e.move) continue;
          const esc = stmScore(e);
          if (esc === null) continue;
          const drop = bestSc - esc; // 0以上＝best比でどれだけ損か
          if (drop >= cfg.weakMinDrop && drop <= cfg.weakMaxDrop && drop > pickDrop) {
            // その手が手元の盤でも合法か確認
            if (ShogiCore.usiToMove(st, e.move)) { pick = e.move; pickDrop = drop; }
          }
        }
        if (pick) chosen = pick;
      }
      if (!chosen || chosen === "resign" || chosen === "win" || chosen === "(none)") break;

      const next = ShogiCore.applyUsiStrict(st, chosen);
      if (!next) break;
      st = next;
      moves.push(chosen);

      // 差がつきすぎたら次の対局へ（このフェーズの帯を外れて伸びるのを防ぐ）
      if (cpSente !== null && Math.abs(cpSente) >= cfg.decidedStop && phase !== "endgame") break;
    }
  }
  console.log(`  → ${cfg.label} 完了: はっきり${clearN}・互角${evenN}（対局${game}・${Math.round((Date.now() - phaseStart) / 1000)}秒）`);
}

// ===== 本体 =====
async function main() {
  preflight();
  console.log(`水匠10で本番局面を生成${SMOKE ? "（動作確認モード）" : ""}: 序盤・中盤・終盤（8スレッド・終わったら自動終了）`);

  const eng = createEngine();
  eng.send("usi");
  await eng.waitFor(/^usiok$/);
  eng.send(`setoption name Threads value ${THREADS}`);
  eng.send("setoption name USI_Hash value 512");
  eng.send(`setoption name MultiPV value ${MULTIPV}`);
  eng.send("setoption name BookFile value no_book");
  eng.send("isready");
  await eng.waitFor(/^readyok$/);

  const out = [];
  const seenSfen = new Set();
  const phases = ONLY ? [ONLY] : ["opening", "middle", "endgame"];
  for (const ph of phases) {
    if (!PHASE_CFG[ph]) { console.error(`未知のフェーズ: ${ph}`); continue; }
    await collectPhase(eng, ph, seenSfen, out);
  }

  eng.send("quit");
  setTimeout(() => eng.proc.kill(), 2000);

  const dir = join(dirname(fileURLToPath(import.meta.url)), "out");
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);
  const file = join(dir, `positions-v2-${stamp}.json`);
  writeFileSync(file, JSON.stringify(out, null, 1), "utf8");

  // フェーズ別の集計
  const byPhase = {};
  for (const p of out) byPhase[p.phase_tag] = (byPhase[p.phase_tag] ?? 0) + 1;
  console.log(`\n✅ ${out.length}局面を書き出しました → ${file}`);
  console.log(`   内訳: ${JSON.stringify(byPhase)}`);
  console.log("   次: node scripts/import-positions.mjs <このファイル> https://taikyokukan-dojo.vercel.app");
}

main().catch((e) => {
  console.error(`エラー: ${e.message}`);
  process.exit(1);
});
