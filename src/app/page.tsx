import { FirstVisual } from "@/components/first-visual";

export default function Home() {
  return (
    <main>
      <section className="visual-stage" id="first-visual" aria-labelledby="site-title">
        <FirstVisual />
        <header className="masthead">
          <h1 id="site-title">CREATIVE<br />PLAYGROUND</h1>
          <span className="edition" aria-label="Experiment 001">
            <span className="edition-dot" /> EXP. 001
          </span>
        </header>
        <div className="work-title">
          <p className="eyebrow">001 <span>/</span> A STUDY OF LIGHT</p>
          <h2>Liminal</h2>
        </div>
        <a className="scroll-cue" href="#about-work">
          SCROLL <span aria-hidden="true">↓</span>
        </a>
      </section>
      <section className="work-note" id="about-work" aria-labelledby="note-title">
        <p className="eyebrow">BETWEEN FORM &amp; FEELING</p>
        <div>
          <h2 id="note-title">かたちになる、その手前。</h2>
          <p>光が重なり、ほどけ、またひとつになる。<br />
            コードから生まれる、終わりのない小さな実験。</p>
          <a className="back-link" href="#first-visual">BACK TO THE EXPERIMENT <span aria-hidden="true">↗</span></a>
        </div>
        <span className="note-index" aria-hidden="true">001 — ∞</span>
      </section>
    </main>
  );
}
