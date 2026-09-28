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

初期段階では、これまで制作・実験してきたものを中心に掲載予定です。

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

GitHub Pagesで公開予定です。

```text
main
  ↓
GitHub Actions
  ↓
Next.js Static Export
  ↓
GitHub Pages
```

## Status

🚧 Experimental / Work in Progress

現在はコンセプト設計およびMVP構築段階です。

## Philosophy

**Build small. Experiment often. Keep it playful.**

完成品だけを置く場所ではなく、試行錯誤や技術的な実験そのものを残していく場所にします。
