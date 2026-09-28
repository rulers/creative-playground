# Creative Playground

A playground for experiments with code, graphics, simulation, and sound.

WebGL / Shader / Generative Art / Simulation / Creative Coding など、  
コードによる表現や実験的な作品を作り、公開するための個人プロジェクトです。

単なる作品一覧ではなく、**Webサイト自体もひとつのインタラクティブな作品として設計する**ことを目指します。

## Concept

**Code × Graphics × Simulation × Sound**

ソフトウェアエンジニアリングとCreative Codingを組み合わせ、ブラウザ上で動くインタラクティブな表現を実験します。

主なテーマ：

- WebGL / GLSL Shader
- Generative Art
- Simulation
- Creative Coding
- Generative Music
- Audio Visualization
- Interactive Web Experiences

## Inspiration

サイト体験の方向性として、TAO TAJIMAのポートフォリオサイトからインスピレーションを得ています。

ただし、デザインや実装を再現することを目的とはせず、

- Full-screen visual
- Minimal UI
- Scroll interaction
- Shader transition
- Works as navigation

といった考え方を参考にしながら、独自のCreative Playgroundとして構築します。

## Works

### 001 — Liminal

Phase 1のために制作した、光の輪がゆっくりと変形するオリジナルのGLSL作品。
1枚の平面と1つのShaderMaterialで描画し、画像・動画・外部フォントは使用しません。
ポインターにわずかに反応し、PAUSE / PLAYで停止・再開できます。

今後は、これまで制作・実験してきたものも掲載予定です。

### 01 — Shader / Game of Life

GPU / Shaderを利用したConway's Game of Lifeの実験。

### 02 — Behavioral Economics Simulation

行動経済学のモデルとShader / Simulationを組み合わせた実験。

### 03 — Generative Music / Visualizer

Strudelなどを利用したGenerative MusicとAudio Visualizationの実験。

作品は今後追加していきます。

## MVP

最初から完成したポートフォリオを作るのではなく、小さく構築します。

### Phase 1 — First Visual

- Full-screen Canvas
- Three.js
- GLSL Shader
- Minimal UI
- GitHub Pages deployment

まずは「1つのShader作品がブラウザ全面で動く」状態まで作ります。

### Phase 2 — Works Navigation

- 複数作品
- Scroll navigation
- Shader transition
- Infinite / continuous browsing

### Phase 3 — Creative Playground

- Interactive works
- Simulation
- Audio / Strudel integration
- Visualizer
- Experiments

サイトそのものを作品を探索するインターフェースへ発展させます。

## Tech Stack

初期構成：

- Next.js
- TypeScript
- Three.js
- GLSL
- GitHub Actions
- GitHub Pages

React Three Fiberなどの追加ライブラリは、必要性が明確になった段階で検討します。

## Architecture

```text
creative-playground
├── src/
│   ├── app/
│   ├── components/
│   ├── webgl/
│   │   ├── shaders/
│   │   └── scenes/
│   └── data/
├── public/
│   └── works/
├── .github/
│   └── workflows/
│       └── deploy-pages.yml
├── README.md
└── next.config.ts
```

WebGL / Shader固有の処理とUIを分離し、作品が増えても各Experimentを独立して追加できる構成を目指します。

## Deployment

GitHub Pagesのプロジェクトサイト `/creative-playground/` 向けに静的出力します。
GitHubの **Settings → Pages → Source: GitHub Actions** を選択してください。
`main` へのpushとPRでlint・buildを実行し、静的ファイルをartifactとして保存します。
公開はPagesのSource設定後、Actionsの **Build and deploy GitHub Pages → Run workflow → main** から実行します。
初期設定前のpushではdeployをスキップするため、Pages未設定でもCIを実行できます。

```text
main
  ↓
GitHub Actions
  ↓
Next.js Static Export
  ↓
Run workflow（公開時）
  ↓
GitHub Pages
```

## Local development

Node.js 22.13以上（22系）、または24以上を使用します。

```sh
npm install
npm run dev
```

```sh
npm run lint
npm run build
```

`npm run build` で `out/` に静的ファイルを出力します。
静的出力のため `next start` は使わず、任意の静的HTTPサーバーで `out/` を配信します。
GitHub Pagesと同じサブパスを検証する場合：

```sh
NEXT_PUBLIC_BASE_PATH=/creative-playground npm run build
# out/ を /creative-playground/ にマウントして配信
```

### Phase 1 implementation

- `src/components/first-visual.tsx`: Canvasと再生UI、OSのモーション設定との同期。
- `src/webgl/scenes/liminal-scene.ts`: Three.jsの初期化、描画、リサイズ、停止・破棄。
- `src/webgl/shaders/liminal.ts`: 頂点・フラグメントGLSL。追加ローダー不要の文字列として管理。
- `src/app/page.tsx` / `globals.css`: ページ構造、レスポンシブUI、静止フォールバック。

描画解像度はDPR 1.5・200万画素を上限とし、タブ非表示時と画面外では描画を停止します。
`prefers-reduced-motion: reduce` では1フレームのみ描画し、ポインター反応も停止します。
WebGL非対応・コンテキスト喪失時はCSSによる静止作品を表示します。
リサイズや復帰に必要なフレームは、停止中でも描画します。

ブラウザ確認項目：PC / モバイル縦横、PAUSE / PLAY、SCROLLと戻るリンク、
OSのモーション設定変更、WebGL非対応、コンテキスト喪失・復帰、タブ切替。

## Status

🚧 Experimental / Work in Progress

Phase 1 — First Visualを実装済み。複数作品のナビゲーションはPhase 2で追加予定です。

## Philosophy

**Build small. Experiment often. Keep it playful.**

完成品だけを置く場所ではなく、試行錯誤や技術的な実験そのものを残していく場所にします。
