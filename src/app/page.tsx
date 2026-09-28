import { FirstVisual } from "@/components/first-visual";
import { FieldVisual } from "@/components/field-visual";
import { TransitionProgress } from "@/components/transition-progress";
import { TransitionEyebrow, TransitionTitle } from "@/components/transition-title";

export default function Home() {
  return (
    <TransitionProgress>
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
            <TransitionEyebrow id="liminal-eyebrow">
              001 <span>/</span> A STUDY OF LIGHT
            </TransitionEyebrow>
            <TransitionTitle id="liminal-title">Liminal</TransitionTitle>
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
        <section className="visual-stage field-stage" id="field-study" aria-labelledby="field-title">
          <FieldVisual />
          <header className="masthead">
            <h1>CREATIVE<br />PLAYGROUND</h1>
            <span className="edition" aria-label="Experiment 002">
              <span className="edition-dot" /> EXP. 002
            </span>
          </header>
          <div className="work-title">
            <TransitionEyebrow id="field-eyebrow">
              002 <span>/</span> INTERACTIVE STUDY
            </TransitionEyebrow>
            <TransitionTitle id="field-title">Field</TransitionTitle>
          </div>
          <p className="field-instruction">MOVE POINTER <span>/</span> TOUCH &amp; DRAG</p>
        </section>
      </main>
    </TransitionProgress>
  );
}
