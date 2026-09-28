<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

## プロジェクト概要

Creative Playground は、コードによる表現・実験を公開する個人プロジェクト。

テーマ：

- WebGL / GLSL Shader
- Generative Art
- Simulation
- Creative Coding
- Generative Music
- Audio Visualization

コンセプト：

> **Code × Graphics × Simulation × Sound**

作品を並べるだけではなく、**Webサイト自体もインタラクティブな作品として設計する**。

---

## 現在の技術構成

既存の `package.json` と実装を正とする。

基本構成：

- Next.js
- TypeScript
- Three.js
- GLSL
- GitHub Pages

以下は必要性が明確になるまで追加しない。

- React Three Fiber
- GSAP
- UIフレームワーク
- State管理ライブラリ
- その他の大きな依存ライブラリ

小さな機能は、Browser API・既存ライブラリ・小規模な自前実装を優先する。

---

## 開発方針

### MVPを優先する

原則：

```text
アイデア
↓
仮説
↓
最小実装
↓
動作・視覚確認
↓
改善
```

現在の仮説を検証できる最小構成から実装する。

将来必要になる可能性だけを理由に、機能・抽象化・ライブラリを追加しない。

---

## ビジュアル方針

基本方向：

- Full-screen Visual
- Minimal UI
- Strong Typography
- Shader-driven Graphics
- Interactive Transition
- Works as Navigation

TAO TAJIMAのポートフォリオは参考の一つだが、コピーはしない。

Creative Playground独自の表現を優先する。

視覚的に複雑にすること自体を目的にしない。

---

## 責務分離

基本構成：

```text
src/
├── app/
├── components/
├── data/
└── webgl/
    ├── scenes/
    └── shaders/
```

### `app/`

ページ構造・Layout・Global CSSなどを担当する。

WebGLの詳細実装を直接書かない。

### `components/`

UIを担当する。

例：

- Work title
- Navigation
- Scroll indicator
- Project metadata

可能な限りThree.jsの低レベル処理から分離する。

### `webgl/scenes/`

Three.js側の処理を担当する。

- Scene
- Camera
- Renderer
- Geometry
- Material
- Animation loop
- Resize
- Resource cleanup

### `webgl/shaders/`

GLSLを担当する。

Vertex / Fragment ShaderはReactコンポーネントやSceneへ大量にインライン記述しない。

### `data/`

作品情報・Metadataを管理する。

作品数が増えた場合もUIへ直接ハードコードせず、可能な範囲でData-drivenにする。

---

## WebGL / Shader

責務は基本的に以下とする。

```text
React / HTML
    ↓
Three.js Scene
    ↓
ShaderMaterial
    ↓
GLSL
    ↓
GPU
```

GLSL：

- UV操作
- Distortion
- Color
- Noise
- Texture合成
- Visual Transition

TypeScript：

- State
- Navigation
- Input
- Timing
- Work selection
- Application logic

アプリケーションロジックをGLSLへ持ち込まない。

Shader変更は、一度に多くのEffectを追加せず、小さく変更して視覚確認する。

---

## Performance

Graphics-heavyなサイトであるため、GPU / CPU負荷を意識する。

特に注意する：

- 過剰な `devicePixelRatio`
- 巨大Texture
- 不要なRender Target
- Animation loop内でのObject生成
- 重いFragment Shader loop
- Three.js Resourceのdispose漏れ

ただし、計測なしの過剰最適化はしない。

---

## Responsive / Accessibility

Desktopだけを前提にしない。

考慮する：

- Touch
- Mobile GPU
- Resize
- Orientation
- Device Pixel Ratio

`prefers-reduced-motion` を尊重する。

重要なNavigationや情報をShader・Animationだけに依存させない。

---

## GitHub Pages

GitHub PagesによるStatic Hostingを前提とする。

以下を変更する場合はStatic Exportへの影響を確認する。

- Next.js configuration
- Routing
- Asset path
- Image handling
- Public assets

明示的に方針変更するまでは、常時Serverを必要とする機能を導入しない。

---

## 現在のロードマップ

### Phase 1 — First Visual

- Full-screen Canvas
- Three.js
- GLSL Shader
- Minimal UI
- GitHub Pages

### Phase 2 — Works Navigation

- Multiple Works
- Scroll Navigation
- Shader Transition
- Continuous Browsing

### Phase 3 — Creative Playground

- Interactive Works
- Simulation
- Generative Music
- Audio Visualization

依頼されていない後続Phaseを先回りして実装しない。

---

## 判断基準

複数案がある場合は、以下を優先する。

1. シンプルさ
2. 視覚的な品質
3. Performance
4. 修正容易性
5. 実験速度

このRepositoryの目的は、複雑なArchitectureを示すことではない。

迷った場合は、

> **まず最小の「視覚的に確認できるもの」を作る。**

その結果を見てから次の複雑性を追加する。