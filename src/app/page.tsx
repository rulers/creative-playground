import { FirstVisual } from "@/components/first-visual";
import { FieldVisual } from "@/components/field-visual";
import { LifeVisual } from "@/components/life-visual";
import { LiminalPanel } from "@/components/liminal-panel";
import { ShareScroll } from "@/components/share-scroll";
import { TransitionProgress } from "@/components/transition-progress";
import { TransitionEyebrow, TransitionTitle } from "@/components/transition-title";
import { WorkNotes } from "@/components/work-notes";
import { getWorkById } from "@/data/works";

export default function Home() {
  const liminalWork = getWorkById("liminal");
  const fieldWork = getWorkById("field");
  const lifeWork = getWorkById("life");

  return (
    <TransitionProgress>
      <ShareScroll />
      <main>
        <section className="visual-stage" id="first-visual" aria-labelledby="site-title">
          <FirstVisual />
          <header className="masthead">
            <h1 id="site-title">CREATIVE<br />PLAYGROUND</h1>
            <span className="edition" aria-label="Experiment 001">
              <span className="edition-dot" /> EXP. 001
            </span>
          </header>
          <LiminalPanel />
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
          {liminalWork && <WorkNotes work={liminalWork} />}
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
        <div className="notes-band">
          {fieldWork && <WorkNotes work={fieldWork} />}
        </div>
        <section className="visual-stage life-stage" id="life-study" aria-labelledby="life-title">
          <header className="masthead">
            <h1>CREATIVE<br />PLAYGROUND</h1>
            <span className="edition" aria-label="Experiment 003">
              <span className="edition-dot" /> EXP. 003
            </span>
          </header>
          <LifeVisual>
            <div className="work-title">
              <p className="eyebrow">
                003 <span>/</span> CELLULAR AUTOMATON
              </p>
              <h2 id="life-title">Life</h2>
            </div>
          </LifeVisual>
        </section>
        <div className="notes-band">
          {lifeWork && <WorkNotes work={lifeWork} />}
        </div>
      </main>
    </TransitionProgress>
  );
}
