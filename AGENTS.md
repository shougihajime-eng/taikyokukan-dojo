<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 大局観道場（たいきょくかんどうじょう）

> ⚠️ **未公開の直しあり（2026-06-17）**：`app/play/page.tsx` の「局面を読み込めませんでした」エラー画面に、戻る手段（`<AppHeader back="/" backLabel="ホーム" />`）が無く戻れなくなる穴があったので追加した。本人の指示で**まだ公開（デプロイ）していない**＝ほかの直しとまとめて公開する予定。次にこのアプリを公開する時に一緒に反映すること（GitHub `shougihajime-eng/taikyokukan-dojo` へ push で自動公開）。

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

- 🟡 進行中（2026-07-06・⚠ローカル改修のみ＝未公開）: **共通デザインシステム（Fable5・朝焼けの和紙）へ見た目を全面刷新（新デザイン適用ずみ）**。旧変数名（--sumi/--shu/--kin…）を新パレット（--asagi-sky/--ink/--ruri/--kaki/--wakaba/--yamabuki）へ var() で橋わたし＝既存クラス・振る舞い・ロジックは無変更。書体＝見出し Kaisei Decol＋本文 Zen Maru Gothic＋駒 Shippori Mincho。ホームに signature「駒文字タイトル」（「大局観道場」を1文字ずつ五角形の駒に乗せ時間差で「コトン…」と並ぶ＋朱の落款点＝`.koma-title`/`.kt-*`・reduced-motion対応）。起動画面（スプラッシュ）・きせかえシート・グラフ（TrendChart）・先生の表・クセのバーも明るい配色に統一。manifest/テーマ色も #FBEDDC に。⚠盤CSS（変更禁止セクション）は**バイト単位で無変更**を確認・きせかえ4色もそのまま。編集前の控え＝各ファイルの `.fablebak`（globals.css/layout/page/play/dashboard/teacher/manifest/EvalSlider/ResultReveal/TrendChart/ThemeSheet）。検証＝`npm run build` 成功・vitest 42件合格・Chromium/WebKit×iPhone/PC で はみ出し0・JSエラー0・盤9×9（駒40枚）正常。⚠**未公開**（下の 06-20 分とまとめて本人OKで公開）。
- 🟡 進行中（2026-06-20・⚠ローカル改修のみ＝未公開）: **詰将棋（ツメル）の高級デザインを移植＝暗い藍×金バージョン**（※2026-07-06 の新デザインで配色は「朝焼けの和紙×金」に置き換えずみ・起動画面/ハローの仕組み自体は温存）（本人「ツメルのデザインに全部寄せたい」）。本アプリは暗い宇宙テーマなので、ツメル本来の**暗い金の起動画面**で合わせた。①**起動画面（スプラッシュ）を新設**＝五角形の「局」エンブレム＋**金色グラデの筆ロゴ「大局観道場」**が書かれる＋朱の落款「道」＋金の光芒＋金粉＋キャッチ「盤上に、世界が広がる。」＋「このアプリについて」（序文が巻物のように開く）。`components/Splash.tsx`（**セッション1回**＝`sessionStorage` `taikyoku_splash_seen_v1`・音は無し）＋文章 `lib/text.ts` の `SPLASH`/`SPLASH_CHARS`。②**金の光のハロー**を題字の後ろで回転（`.title-halo`）。③**起動画面→使い方ガイドの順番**＝`Walkthrough` に `waitForSelector=".splash-screen"` を渡し、起動画面が消えてからガイドが出るように。CSSは `app/globals.css` の**盤セクション（変更禁止）より上**に `.splash-screen`/`.sp-*`/`.omoi-*`/`.title-halo`＋`@keyframes sprise/spwrite/…/omoi-rise` を追加（暗い藍背景・金ロゴ・朱ボタンに再配色）。書体は既存の筆文字（Yuji Syuku）を使用＝`layout.tsx` の `FUDE_CHARS` に `SPLASH_CHARS` を追加読込。**設定は既存の ThemeSheet（下からのシート）をそのまま活かす**（暗テーマで完成度が高いためドロワー化は見送り）。検証＝`tsc` 0・`next build` 成功・Playwright(実機Chrome)で起動画面の表示・金ロゴ「大局観道場」・ガイドの順番・はみ出し0・JSエラー0。⚠**未公開**（本人OKで `git push`＝自動公開）。
- ✅ 済み: コアループ（出題→スライダー→判定→テンプレ解説→集計）／かんたんログイン／クセ分析ダッシュボード／先生ページ／インポート受け皿／かり局面12個投入／本番公開（hnd1確認済）／単体テスト42件・通しテスト22項目合格／**解説の強化（2026-06-08）**: 駒の損得の機械数え（lib/material.ts）＋「形勢判断の4つのものさし」まめちしき（components/MasterTips.tsx・「やさしい／くわしい」切り替え付き＝選択を端末に保存）を答え合わせ画面に追加／**デザイン全面刷新（2026-06-08）**: 和×将棋の高級道場テーマ（和紙・金箔枠・明朝/筆文字）、iPhone/iPad最適化（セーフエリア・iPad横は盤と操作の2段組）、きせかえシート(components/ThemeSheet.tsx)・共通ヘッダー(components/AppHeader.tsx)追加。デザインシステムは globals.css に集約（.card/.btn-*/.chip/.keisei-* など。盤CSSは下半分＝変更禁止）。Edge+Playwrightで実機サイズの見た目を検証済み・拡大禁止を解除しアクセシビリティ改善／**世界観デザインへ全面刷新（2026-06-09・売り出し向け）**: テーマを「天・大局＝盤上に広がる世界」に変更＝深い藍の宇宙＋暁の地平の光＋金と朱、盤は舞台のように発光（board-stage）。本文Zen Kaku/題字Shippori明朝/筆Yuji。**光るモチベ演出**＝判定の瞬間に盤が光る(judge-burst)・ピタリで金の火花(Sparkles)＋画面ふちの金フラッシュ(edge-flash)・連続正解で炎オーラ(streak-aura)・結果点数のカウントアップ(useCountUp)・スライダーつまみが発光＋スマホ微振動。**縦横レスポンシブ**＝iPhone/iPad のたて＝縦積み、iPad横とスマホ横＝盤｜操作の2段組（.play-grid、横向きは board-stage を svh で頭打ち＋操作カードを詰めて判定ボタンを画面内に）。背景は body::before/after の固定レイヤー（スクロールで再描画しない＝軽量）。アイコンも宇宙テーマへ刷新・テーマカラー/manifestを暗色化・reduced-motion全対応。全画面をEdge DevToolsで実機サイズ実機描画して確認済み。⚠まだ**ローカルのみ（未公開）＝本人レビュー後に公開**
- ✅ **本番局面150問を生成・投入（2026-06-09夜・水匠10）**: 序盤50・中盤50・終盤50。「形勢がはっきりした局面（評価差おおむね600〜700点級・終盤は685〜1787）」を中心に、各フェーズに数問の互角（±100以内）を混ぜる方針。**作り方＝`scripts/generate-positions-v2.mjs`**（片側に "ありがちな緩手＝MultiPV上位手のうち落差60〜520の手" を入れて自然に差を作る／終盤は stopMistakePly まで差をつけ以降は両者最善で「勝勢を勝ちきる」長手数を作る／採用候補は思考2.5秒で評価を取り直し帯に残った物だけ採用）。150局面すべて一意・合法（/api/import がサーバー側で全数再検証＝0件弾き）・best＋PV付き。本番DBに投入し、**かり局面12個は削除済**（現在 positions=150・is_sample=0）。本番通しテスト22項目OK
- ✅ **解説に「なぜ？」の一言を追加（lib/explain.ts の whyText）**: 駒の損得の機械数え＋形勢の大きさ＋一般的なものさし（玉の堅さ/駒の働き/手番）だけから組み立てる安全文（ハルシネーション禁止を維持）。ResultReveal に朱の囲みで表示
- ✅ **2026-06-09 本番公開（main へ push・commit 4c2be2e）**: 世界観デザイン刷新（06-08/06-09）＋whyText＋generate-positions-v2＋/api/import の purgeSamples を一括公開。本番で新デザインのフォント（Shippori/Yuji）配信＝公開確認済み・hnd1（東京）配信・通しテスト22項目OK
- 🟡 進行中: なし（150問＋新デザインとも本番で稼働中）
- ✅ 2026-06-14 公開: **スマホ縦を1画面完結に**（盤は大きいまま・解説スクロール・ボタン固定。一閃/詰将棋/手筋/名人と統一）。`app/globals.css` の `@media (max-width:1023px) and (orientation:portrait)` だけ追加（page.tsx 無変更）。`main:has(.play-grid){flex:0 0 auto;height:100svh;overflow:hidden}`＋`.app-main/.wrap-wide/.play-grid` を縦フレックス段組み＋盤 `min(100%,30rem,calc(100svh-348px))`＋`.play-side>.card` だけスクロール＋「次の局面へ」固定＋「形勢を判定する」は `.play-side>.card>.btn{position:sticky;bottom:0}`。⚠**教訓：WebKit(実機含む)で `100dvh` が端末余白を含み 912px に伸びた→このアプリが元々盤で使う `svh` に揃えると844pxで正しく収まる。`main` は `flex-1` なので `flex:0 0 auto` 併用が必須**。PC幅・iPad横・よこ向きは無影響。WebKit実機サイズで iPhone/iPad たて 出題・答え合わせ両方 盤92%/59%・判定/次へ画面内・はみ出しゼロを撮影確認。本番反映済（live CSSに 100svh/play-grid 反映を確認）。
- 🔜 次の一歩: ①本人が問題をプレイして「これは出したくない」局面があれば外す（DBの positions から該当行を削除するだけ＝元データは scripts/out に保管） ②数を増やすときは `node scripts/generate-positions-v2.mjs`（ShogiHome等を閉じてから）→ `import-positions.mjs` で追加投入 ③帯や互角の数を変えたい時は generate-positions-v2.mjs の PHASE_CFG を調整

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

1. **生成**（ShogiHome等を閉じてから）:
   - 🟢 **推奨＝形勢がはっきりした出題向け**: `node scripts/generate-positions-v2.mjs`（序盤50・中盤50・終盤50。各フェーズの帯・互角の数・緩手の強さは PHASE_CFG で調整。`--only middle`／`--smoke`／`--quota N`／`--wall 秒` でしぼり込み可）
   - 旧: `node scripts/generate-positions.mjs --games 12`（評価値の付いた自己対局そのまま＝差は小さめ）
   → どちらも `scripts/out/positions-*.json` ができる
2. **投入**: `node scripts/import-positions.mjs scripts/out/positions-xxxx.json https://taikyokukan-dojo.vercel.app`
   → アプリ側 `/api/import` が全局面の合法性を再検証してから入れる（不正は弾いて報告）

かり局面の入れ直し: `/api/import` に `{pass, seedSamples: true}` を POST（既存のかり局面を消して12個入れ直す）
かり局面の削除のみ: `/api/import` に `{pass, purgeSamples: true}` を POST（is_sample=true を全削除。※本番反映は未公開コードのデプロイ後）

## 設計の要点（変更時は必ず守る）

- **評価値↔勝率の変換は `lib/eval.ts` の1箇所だけ**（`勝率=1/(1+exp(-cp/600))`・±2000クランプ）。スライダー・採点・集計すべてここを使う
- **スライダーは先手基準で固定**（手番で反転させない）
- 採点は `lib/scoring.ts` の純関数（互角±300cpは重み1.0、大差は0.3に減衰。加重スコア0-100）
- `guesses` テーブルは出題時の実際値をスナップショット保存（後から局面を編集しても記録が壊れない）
- **解説はテンプレのみ**（`lib/explain.ts`）。エンジンデータ（評価値・最善手・PV）以外を語らせない＝ハルシネーション禁止
  - 例外として許される追加: ①**枚数の機械数えだけ**で作る駒の損得（`lib/material.ts`・成駒は元の駒として数える）②**固定文の一般知識**（`components/MasterTips.tsx` の4つのものさし）。どちらも「局面固有の内容をAIが創作しない」原則を満たす
- **SFENの手書き禁止**。局面は必ず core.js（`lib/shogi/core.js`）で検証してから使う
- RLSは有効化のみ（anon直アクセス禁止）。読み書きはサーバーAPI（service_role）だけ
- 出題API（/api/session/start）は評価値・最善手を**絶対に返さない**（/api/guess で開示）

## ログイン情報

- 生徒: なまえ＋あいことば（4文字以上）の かんたんログイン。初回は自動登録（一閃と同方式）
- 先生ページ（/teacher）の合言葉: **らら**（環境変数 TEACHER_PASSWORD。.env.local と Vercel 両方）

## 技術構成

Next.js 16 (App Router) + TypeScript + Tailwind v4 + 共有Supabase(スキーマ taikyokukan) + recharts + vitest。
将棋盤・ルールは一閃から移植した自作 core.js（完全ルール・依存なし）。
