<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 大局観道場（たいきょくかんどうじょう）

形勢判断（大局観）を鍛える将棋トレーニングアプリ。
局面の評価値を**隠して**出題し、ユーザーがスライダーで形勢を予測 → エンジン値とのズレを採点。
ズレの方向（先手を高く/低く見るクセ）を戦法別・局面帯別・時系列で可視化する。

## 本番URL・所在

| 項目 | 値 |
|---|---|
| 本番 | https://taikyokukan-dojo.vercel.app |
| GitHub | https://github.com/shougihajime-eng/taikyokukan-dojo （main へ push で自動公開） |
| Vercel | shougihajime-3368s-projects/taikyokukan-dojo（regions: hnd1=東京） |
| DB | 共有 Supabase（eqkaaohdbqefuszxwqzr）スキーマ **`taikyokukan`** |
| ローカル | `C:\Users\shoug\アプリ本体\将棋\taikyokukan-dojo`（※日本語名への改名は保留中。下の「進捗」参照） |

## 進捗（いまここ）

- ✅ 済み: コアループ（出題→スライダー→判定→テンプレ解説→集計）／かんたんログイン／クセ分析ダッシュボード／先生ページ／インポート受け皿／かり局面12個投入／本番公開（hnd1確認済）／単体テスト33件・通しテスト22項目合格
- 🟡 進行中: エンジン（水匠10）での本番局面づくり — ためし生成は **ShogiHome使用中のため未実施**（安全ルールが正しく作動して中止）。ShogiHome を閉じてから `node scripts/generate-positions.mjs --games 2` で再開
- 🔜 次の一歩: ①ためし生成→本人確認→量産投入 ②フォルダ名を「大局観道場（形勢判断トレーニング）」に改名（何かが掴んでいて保留。改名後は はじめアプリ のショートカットも更新）

## 大事な約束（エンジン使用 2026-06-08 本人指示）

- エンジンは **問題を作る時だけ手動実行**。常駐・スケジュール登録・24時間稼働は禁止
- 起動前に他ソフト（ShogiHome等）がエンジン使用中なら**即中止**（scripts/generate-positions.mjs の preflight が自動チェック）
- 思考時間 2〜3秒／スレッド8まで／終わったら自動終了／windowsHide で黒い窓を出さない

## 検証コマンド

```
npm test                                 # 単体テスト（採点ロジック・かり局面の合法性）
npm run build                            # ビルド検証
npm run dev                              # ローカル起動 (3000)
node scripts/golden-path-test.mjs        # 通しテスト（ローカル）
node scripts/golden-path-test.mjs https://taikyokukan-dojo.vercel.app  # 通しテスト（本番）
```

## 局面データの増やし方（2段階）

1. **生成**（ShogiHome等を閉じてから）: `node scripts/generate-positions.mjs --games 12`
   → `scripts/out/positions-*.json` ができる
2. **投入**: `node scripts/import-positions.mjs scripts/out/positions-xxxx.json https://taikyokukan-dojo.vercel.app`
   → アプリ側 `/api/import` が全局面の合法性を再検証してから入れる（不正は弾いて報告）

かり局面の入れ直し: `/api/import` に `{pass, seedSamples: true}` を POST（既存のかり局面を消して12個入れ直す）

## 設計の要点（変更時は必ず守る）

- **評価値↔勝率の変換は `lib/eval.ts` の1箇所だけ**（`勝率=1/(1+exp(-cp/600))`・±2000クランプ）。スライダー・採点・集計すべてここを使う
- **スライダーは先手基準で固定**（手番で反転させない）
- 採点は `lib/scoring.ts` の純関数（互角±300cpは重み1.0、大差は0.3に減衰。加重スコア0-100）
- `guesses` テーブルは出題時の実際値をスナップショット保存（後から局面を編集しても記録が壊れない）
- **解説はテンプレのみ**（`lib/explain.ts`）。エンジンデータ（評価値・最善手・PV）以外を語らせない＝ハルシネーション禁止
- **SFENの手書き禁止**。局面は必ず core.js（`lib/shogi/core.js`）で検証してから使う
- RLSは有効化のみ（anon直アクセス禁止）。読み書きはサーバーAPI（service_role）だけ
- 出題API（/api/session/start）は評価値・最善手を**絶対に返さない**（/api/guess で開示）

## ログイン情報

- 生徒: なまえ＋あいことば（4文字以上）の かんたんログイン。初回は自動登録（一閃と同方式）
- 先生ページ（/teacher）の合言葉: **らら**（環境変数 TEACHER_PASSWORD。.env.local と Vercel 両方）

## 技術構成

Next.js 16 (App Router) + TypeScript + Tailwind v4 + 共有Supabase(スキーマ taikyokukan) + recharts + vitest。
将棋盤・ルールは一閃から移植した自作 core.js（完全ルール・依存なし）。
