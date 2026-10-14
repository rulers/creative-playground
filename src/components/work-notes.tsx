import type { WorkMeta } from "@/data/works";

export function WorkNotes({ work }: { work: WorkMeta }) {
  const headingId = `${work.id}-notes-title`;
  return (
    <section className="exp-notes" aria-labelledby={headingId}>
      <h3 id={headingId} className="eyebrow">
        {work.number} <span>/</span> {work.title.toUpperCase()} — EXPERIMENT NOTES
      </h3>
      <dl>
        <div>
          <dt>INTENT</dt>
          <dd>{work.note.intent}</dd>
        </div>
        <div>
          <dt>CONTROLS</dt>
          <dd>{work.note.controls}</dd>
        </div>
        <div>
          <dt>DISCOVERIES</dt>
          <dd>{work.note.discoveries}</dd>
        </div>
      </dl>
      <a className="back-link" href={work.note.sourceUrl} target="_blank" rel="noopener noreferrer">
        VIEW SOURCE ON GITHUB <span aria-hidden="true">↗</span>
      </a>
    </section>
  );
}
