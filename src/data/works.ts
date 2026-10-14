// Centralized metadata for every work on the site. Keeping this data-driven means new works
// (and their notes) do not require hardcoding strings across page.tsx / panels / export buttons.

export type WorkNote = {
  intent: string;
  controls: string;
  discoveries: string;
  /** Link to the primary source file(s) for this work on GitHub. */
  sourceUrl: string;
};

export type WorkMeta = {
  id: string;
  /** Section element id used for scroll targets and `?work=` deep links. */
  sectionId: string;
  number: string;
  eyebrow: string;
  title: string;
  note: WorkNote;
};

const REPO_BLOB = "https://github.com/rulers/creative-playground/blob/main";

export const works: WorkMeta[] = [
  {
    id: "liminal",
    sectionId: "first-visual",
    number: "001",
    eyebrow: "A STUDY OF LIGHT",
    title: "Liminal",
    note: {
      intent:
        "光の輪がゆっくりと変形するオリジナルのGLSL作品。1枚の平面と1つのShaderMaterialだけで、形になる手前の揺らぎを表現する。",
      controls:
        "PAUSE / PLAYに加え、EXPERIMENTパネルでSPEED・DENSITY・PALETTEを調整可能。ポインターやタッチにわずかに反応し、SOUNDで生成音（視覚も控えめに反応）、SAVE PNGで画像保存、COPY LINKで一時停止状態の共有リンクを作成できる。",
      discoveries:
        "等高線の本数（density）とアニメーション速度を分離したことで、静止画としても見栄えのする構図を保ちながら実験できることがわかった。",
      sourceUrl: `${REPO_BLOB}/src/webgl/scenes/liminal-scene.ts`,
    },
  },
  {
    id: "field",
    sectionId: "field-study",
    number: "002",
    eyebrow: "INTERACTIVE STUDY",
    title: "Field",
    note: {
      intent: "PointerやTouchの位置に波紋が広がり、地形のような等高線が歪む作品。",
      controls: "ポインター移動 / タッチ＆ドラッグで波紋を発生させる。",
      discoveries: "歪みをUV空間で計算することで、解像度に依存しない滑らかな波紋を維持できた。",
      sourceUrl: `${REPO_BLOB}/src/webgl/scenes/field-scene.ts`,
    },
  },
  {
    id: "life",
    sectionId: "life-study",
    number: "003",
    eyebrow: "CELLULAR AUTOMATON",
    title: "Life",
    note: {
      intent:
        "Conwayのライフゲームの実験。シミュレーションのルールをUI/描画から切り離し、決定的なシード付き初期パターンから始まる小さな世界を観察する。",
      controls:
        "盤面をクリック / タップ / ドラッグでセルを描画（キーボードでは矢印キーとSpace）。PLAY / PAUSE、STEPで1世代だけ進める、RESETで現在のシードの初期パターンに戻す、RESEEDで新しいシードを生成。SOUNDで世代ごとに鳴る音、SAVE PNGで画像保存、COPY LINKで現在の世代を再現する共有リンクを作成できる。",
      discoveries:
        "盤面の端をつなげた（toroidal）有限グリッドにすると、グライダーが画面外へ消えず、端の挙動もルールのテストで検証しやすくなった。盤面は最大96×96、更新は毎秒8世代までに制限している。",
      sourceUrl: `${REPO_BLOB}/src/webgl/life/life-engine.ts`,
    },
  },
];

export function getWorkBySection(sectionId: string): WorkMeta | undefined {
  return works.find((work) => work.sectionId === sectionId);
}

export function getWorkById(id: string): WorkMeta | undefined {
  return works.find((work) => work.id === id);
}
