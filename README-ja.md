# 64 Pad Games

物理デバイスの Novation Launchpad Pro MK3 で遊ぶために作られたゲーム集です。

ブラウザページは、ハードウェア向けの Web MIDI ホスト、表示ミラー、オーディオホスト、操作パネルとして動作します。ゲーム入力、ライト、フィードバックは Launchpad Pro MK3 の 8x8 パッド面を中心に設計されています。画面上のパッドは、デバイス状態のミラー表示と開発支援のためにあります。現時点で対応しているのは Launchpad Pro MK3 のみです。

公開版は https://64padgames.namaraii.com/ で遊べます。

## 動作要件

- USB 接続された Launchpad Pro MK3。
- Web MIDI に対応した Chrome、Edge、またはその他の Chromium ベースブラウザ。
- デプロイ時は HTTPS ホスティングが必要です。開発時は `localhost` で問題ありません。

Chrome または Edge でページを直接開き、アプリから Launchpad Pro MK3 に接続してください。埋め込みブラウザでは Web MIDI デバイス権限が表示されないことがあります。

ハードウェア接続時は、ブラウザの確認ダイアログで MIDI と SysEx の両方を許可してください。SysEx が拒否されても MIDI が許可されていれば接続はできますが、その場合は Launchpad を手動で Programmer Mode に切り替える必要があります。

## 開発

```bash
npm install
npm run dev
```

Vite が表示するローカル URL を開き、Launchpad Pro MK3 に接続してください。開発中にハードウェア状態を確認できるよう、ページには仮想 8x8 ミラーが含まれています。

便利なコマンド:

```bash
npm run build
npm run preview
npm run build:pages
npm run preview:pages
npm run deploy:pages
```

- `npm run build` は通常の Vite `dist/` 出力を作成します。
- `npm run build:pages` は本番モードでビルドし、生成された JavaScript を難読化します。
- `npm run preview:pages` は Pages 用の出力をビルドし、`wrangler pages dev dist` を実行します。
- `npm run deploy:pages` は Cloudflare Pages プロジェクト `launchpad-gamepad` に `dist/` をデプロイします。
- `npm run deploy` は `npm run deploy:pages` のエイリアスです。

URL に `?debug=1` を追加すると、結果アニメーションとカラーパレットを確認するためのデバッグパネルが表示されます。

## ハードウェア操作

特に断りがない限り、ゲームルール内の「グリッドパッド」は Launchpad Pro MK3 の 8x8 グリッド上の物理パッドを意味します。ブラウザ上のグリッドは同じ状態をミラー表示します。

グローバルなハードウェア操作はアプリ側が管理します。

| ハードウェアキー | 意味 |
| --- | --- |
| 左カーソル Up / Down | 前 / 次のゲームを選択 |
| 右 `Patterns >` | Level を変更。Peg Solitaire では Stage を変更 |
| 右 `Steps >` | 利用可能な場合、2つ目のオプションを変更 |
| 左 Play | 新規ゲーム |
| 下段 Record Arm | 利用可能な場合、Undo |
| 下段 Stop Clip | 利用可能な場合、Pass。Peg Solitaire では Solver |

右側の操作パネルにも同じ割り当てが表示され、利用できない操作は disabled として表示されます。2つ目のオプションは、Reversi、Connect 4、Checkers、Hasami Shogi では Player、Flood-It では Moves、Lights Out では Board です。

## Reversi

- グリッドパッド: ハイライトされた合法手にディスクを置きます。終了アニメーション後は、新規ゲームを開始します。
- 挟まれた CPU のディスクは自分の色に裏返ります。どちらも動けなくなった時点でディスク数が多い側の勝ちです。
- 現在のプレイヤーに合法手がない場合、Pass は自動で行われます。Stop Clip は手動 Pass が合法な場合だけ有効です。
- `Steps >` で First / Second player を切り替えます。
- `Patterns >` で CPU 難易度を変更します。
- Record Arm で直前のプレイヤー手番と CPU 応答を Undo します。

## Connect 4

- グリッドパッド: 7列のいずれかをタップして自分のディスクを落とします。
- 7x6 の盤面は下6行に表示されます。最上段はプレイ可能な列を示します。
- CPU より先に、縦、横、斜めのいずれかでディスクを4つつなげます。
- 満杯の列は無効で、警告表示として点滅します。
- `Steps >` で First / Second player を切り替えます。
- `Patterns >` で CPU 難易度を変更します。
- Record Arm で直前のプレイヤー手番と CPU 応答を Undo します。

## Minesweeper

- グリッドタップ: タイルを開きます。開いたタイルをタップすると、隣接する地雷数を点滅表示します。
- グリッド長押し: 黄色い旗を置く、または消します。
- 開いたタイルは暗く表示されます。隠れたタイルは消灯です。爆発後の地雷は赤で表示されます。
- 最初のタップは必ず安全です。
- 難易度で地雷数が決まります: Easy 8、Normal 10、Hard 14。
- `Patterns >` で難易度を変更します。
- 地雷爆発またはクリアアニメーション後は、任意のグリッドパッドで新規ゲームを開始します。

## Flood-It

- グリッドタップ: タップしたタイルの色を選び、左上から領域を広げます。
- 64タイルすべてを獲得すると勝ちです。Moves が Limited の場合は、手数制限内に盤面をクリアします。
- 難易度で色数と Limited 時の手数目標が決まります: Easy 4色 / 22手、Normal 5色 / 18手、Hard 6色 / 15手。
- `Steps >` で Moves を Limited / Unlimited に切り替えます。
- `Patterns >` で難易度を変更します。
- パレットには、パッド上で見分けやすい高コントラスト色の sky、amber、green、white、violet、vermilion を使います。

## Simon

- 8x8 グリッドは4つの 4x4 ブロックに分かれています。
- ライトとシンセ音のパターンを見て、同じ順番で同じブロックをタップします。
- Simon 選択後、任意のパッドをタップすると開始します。
- プレイヤー入力時のライトと音の長さは、再生パターンと同じです。
- 目標ラウンドを完了するとクリアです: Easy 10ラウンド、Normal 15、Hard 25。
- 難易度は目標ラウンド、再生速度、入力タイムアウト、ライフ数を変更します。
- `Patterns >` で難易度を変更します。
- `Steps >`、Record Arm、Stop Clip は無効です。

## SameGame

- グリッドタップ: 同じ色でつながった2個以上のブロックグループを消します。
- 単独ブロックと空きスペースは無効です。
- 消えたブロックの上は下に落ち、空になった列は左に詰められます。
- 生成された盤面は、プレイ開始前に全消し可能なルートがあるか確認されます。
- 難易度で色数とまとまり具合が決まります: Easy 4色、Normal 5色、Hard 6色。
- パレットには、パッド上で見分けやすい高コントラスト色の sky、amber、green、white、violet、vermilion を使います。
- スコアは `(消したブロック数 - 2)^2` です。全消し時は100点のクリアボーナスがあります。
- `Patterns >` で難易度を変更します。

## Checkers

- グリッドタップ: 動かせる自分の駒を選び、ハイライトされた移動先をタップします。
- 捕獲は必須です。ジャンプを続けられる場合は、選択中の駒でジャンプを継続します。
- First は下側から黒でプレイします。Second は CPU の初手後に白でプレイします。
- Men は前方に移動、ジャンプします。Kings は斜め4方向に移動、ジャンプできます。
- 難易度で CPU の探索深度が変わります。
- `Steps >` で First / Second player を切り替えます。
- `Patterns >` で難易度を変更します。
- Record Arm で直前のプレイヤー手番と CPU 応答を Undo します。

## Hasami Shogi

- Hasami Shogi を 8x8 パッド向けに調整したゲームです。
- グリッドタップ: 自分の駒を選び、ハイライトされた移動先をタップします。
- 駒は、縦または横に空いているマスを任意の数だけ移動できます。
- 移動後、相手の駒が移動した駒と別の自分の駒に挟まれると捕獲されます。
- プレイヤー駒は Checkers と同じ青、CPU 駒は Checkers と同じ赤を使います。
- どちらかの駒が1個以下になるか、現在のプレイヤーに合法手がなくなるとゲーム終了です。
- 難易度で CPU の探索深度が変わります。
- `Steps >` で First / Second player を切り替えます。
- `Patterns >` で難易度を変更します。
- Record Arm で直前のプレイヤー手番と CPU 応答を Undo します。

## Lights Out

- グリッドタップ: タップしたライトと上下左右のライトを切り替えます。
- すべてのライトを消すとクリアです。
- Board では 2x2、3x3、4x4、5x5、6x6、7x7、8x8 の7種類から盤面を選べます。
- 8x8 より小さい盤面は、パッド中央に配置されます。
- 難易度はスクランブルの深さを制御します。Easy は少なめ、Normal は中程度、Hard は密度の高いスクランブルです。
- すべての盤面は解けた状態から有効なタップを適用して生成されるため、必ず解けます。
- `Steps >` で盤面サイズを変更します。
- `Patterns >` で難易度を変更します。
- Record Arm で1手 Undo します。

## Peg Solitaire

- グリッドタップ: Peg を選び、隣接する Peg を飛び越えて2パッド先の空き穴に移動します。
- 飛び越えられた Peg は取り除かれます。Peg が1つ残るとステージクリアです。
- 盤面はクラシックな 7x7 十字形で、Launchpad グリッドの左上 7x7 領域に配置されます。
- 準備済みステージは20個あります。ステージをクリアすると自動的に次へ進みます。
- 最終ステージは、中央が空いたクラシック盤面です。
- `Patterns >` で Stage を変更します。Peg Solitaire は Level を使いません。
- Stop Clip は、利用可能な場合に現在のステージパスから Solver を実行します。
- Record Arm で1ジャンプ Undo します。

## Match 3

- グリッドタップ: パネルを選択し、上下左右に隣接するパネルをタップして入れ替えます。
- 選択中のパネルをタップすると選択解除します。隣接していないパネルをタップすると選択を変更します。
- 同色パネルが縦または横に3つ以上並ぶとマッチします。斜めはカウントしません。
- 無効な入れ替えは赤く点滅して元に戻り、手数を消費しません。
- マッチしたパネルは白く点滅して消え、上のパネルが落ち、上部から補充されます。連鎖は自動で解決されます。
- ゲーム開始時、ランダムに選ばれたターゲット色とターゲット数がパッド数字として点滅します。
- 手数が尽きる前に、ターゲット数を消すとステージクリアです。
- 難易度でターゲット数と手数が決まります: Easy 18ターゲット / 28手、Normal 24 / 24、Hard 32 / 22。
- 手数制限が0になるか、有効な入れ替えがなくなるとゲーム終了です。
- パレットには、パッド上で見分けやすい5色の sky、amber、green、white、violet を使います。
- `Patterns >` で難易度を変更します。
- Record Arm で有効な1手を Undo します。

## Block Line

- グリッドタップ: 横長ブロックを選び、ハイライトされた隙間をタップして左または右にスライドします。
- 空き隙間に移動できるブロックが1つだけの場合、その隙間をタップすると直接移動します。
- ブロック幅は1から3パッドです。
- 各手の後に重力が解決され、埋まった行は消えます。連鎖消しはより高いスコアになります。
- 各ターン後に新しい行が下からせり上がります。ブロックが上端を越えるか、合法手がなくなるとゲーム終了です。
- 難易度で生成行の圧力とブロック幅の構成が変わります。
- `Patterns >` で難易度を変更します。
- Record Arm で1ターン Undo します。

## Debug Colors

`?debug=1` を付けると、Debug パネルで次の操作ができます。

- Win、Lose、Draw の結果アニメーション。
- Colors。選択中ゲームのパレットを最上段に表示します。
- Colors モードでは、点灯したカラーパッドをタップするとラベルと値を画面に表示します。
- 消灯している任意のパッドをタップするとゲームに戻ります。

## 結果フィードバック

ゲームは結果フィードバックにパッドアニメーションとサウンドを使います。多くのボードゲームでは、結果アニメーション後に最終盤面へ戻り、任意のグリッドパッドで新規ゲームを開始できます。一部のゲームには、Reversi のスコア点滅、Connect 4 の勝利ライン点滅、Minesweeper の爆発、Peg Solitaire のステージクリア表示、Block Line のスコア表示など、専用フィードバックがあります。

## ビルド

```bash
npm run build
```

生成された `dist/` ディレクトリには Web MIDI ブリッジとミラー UI が含まれます。ブラウザが Launchpad Pro MK3 の MIDI アクセスを要求できるよう、HTTPS 対応の静的ホストから配信する必要があります。

Cloudflare Pages 向けのデプロイ経路では、次を使います。

```bash
npm run build:pages
npm run deploy:pages
```

## アーキテクチャ

- `src/pad/` はコントローラー抽象化と具体的なアダプターを含みます。
- `src/pad/LaunchpadProMk3Adapter.js` は Web MIDI、Programmer Mode、パッドノート対応、ハードウェア操作、LED 更新を扱います。
- `src/pad/VirtualPadAdapter.js` はブラウザビュー内でハードウェア API をミラーします。
- `src/pad/PadAnimationPlayer.js` は共通の結果アニメーションとユーティリティアニメーションを含みます。
- `src/audio/GameAudio.js` は共通の Web Audio サウンドエンジンを含みます。
- `src/ui/App.js` はゲーム選択、ブラウザ UI、グローバルなハードウェア操作、ゲーム状態表示を管理します。
- `src/games/registry.js` はゲーム一覧のエントリーポイントです。
- `src/games/reversi/` は Reversi のルール、CPU 探索、ゲーム進行を含みます。
- `src/games/connect4/` は Connect 4 のルール、CPU 探索、パッドフィードバックを含みます。
- `src/games/minesweeper/` は Minesweeper のルールとパッドフィードバックを含みます。
- `src/games/floodit/` は Flood-It のルールとパッドフィードバックを含みます。
- `src/games/simon/` は Simon のルールと4ブロックのパッドフィードバックを含みます。
- `src/games/samegame/` は SameGame の生成、スコアリング、パッドフィードバックを含みます。
- `src/games/checkers/` は Checkers のルール、CPU 探索、パッドフィードバックを含みます。
- `src/games/hasami/` は Hasami Shogi のルール、CPU 探索、パッドフィードバックを含みます。
- `src/games/lightsout/` は Lights Out のパズル生成とパッドフィードバックを含みます。
- `src/games/pegsolitaire/` は Peg Solitaire の準備済みステージ、Solver 再生、パッドフィードバックを含みます。
- `src/games/match3/` は Match 3 の盤面生成、連鎖ロジック、パッドフィードバックを含みます。
- `src/games/blockline/` は Block Line の行生成、重力、スコアリング、パッドフィードバックを含みます。
- `scripts/obfuscate-dist.mjs` は Vite ビルド後の本番 Pages 出力を難読化します。
- `wrangler.jsonc` は `dist/` からの Cloudflare Pages 出力を設定します。

ゲーム層は `PadHub` だけと通信するため、他の Launchpad モデルや Ableton Push など将来のハードウェアアダプターを、ゲームを書き換えずに追加できます。

新しいゲームを追加するときの実装規約と注意点は、[docs/adding-games.md](docs/adding-games.md) を参照してください。
