"use client";

import { useId, useState } from "react";
import { useTransitionProgress } from "@/components/transition-progress";
import { shareLocation } from "@/components/use-share-init";
import { useGenerativeAudio } from "@/components/use-generative-audio";
import { downloadDataUrlPng } from "@/lib/canvas-capture";
import {
  LIMINAL_DENSITY_MAX,
  LIMINAL_DENSITY_MIN,
  LIMINAL_SPEED_MAX,
  LIMINAL_SPEED_MIN,
  buildShareUrl,
  liminalShareUpdates,
} from "@/lib/url-state";

const PALETTES = ["AURORA", "EMBER", "MONO"];

export function LiminalPanel() {
  const { liminal, available, reducedMotion } = useTransitionProgress();
  const { settings } = liminal;
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const bodyId = useId();
  const hintId = useId();
  const audio = useGenerativeAudio({ autonomous: true, sectionId: "first-visual", onNote: liminal.pulse });

  const describe = (time: number) =>
    `Liminal · speed ${settings.speed.toFixed(2)} · density ${settings.density.toFixed(2)} · palette ${PALETTES[settings.palette]} · t ${time.toFixed(1)}s`;

  function savePng() {
    const time = liminal.getTime();
    const filename = `creative-playground-liminal-s${settings.speed.toFixed(2)}-d${settings.density.toFixed(2)}-p${settings.palette}-t${time.toFixed(1)}.png`;
    if (downloadDataUrlPng(liminal.capturePng(), filename)) {
      setStatus(`Saved ${filename} (${describe(time)})`);
    } else {
      setStatus("Could not capture the image: graphics are unavailable.");
    }
  }

  async function copyLink() {
    const time = Math.round(liminal.getTime() * 100) / 100;
    const pointer = liminal.getPointer();
    const path = buildShareUrl(
      shareLocation(),
      liminalShareUpdates({ ...settings, time, pointerX: pointer.x, pointerY: pointer.y }),
    );
    const url = new URL(path, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Link copied. It opens paused at this exact state, with sound off.");
    } catch {
      window.history.replaceState(null, "", url);
      setStatus("Copy was blocked. The shareable link is now in the address bar.");
    }
  }

  return (
    <div className="exp-panel" data-open={open}>
      <button
        className="exp-toggle"
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((current) => !current)}
      >
        EXPERIMENT <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      <div id={bodyId} className="exp-body" hidden={!open}>
        <label className="exp-field">
          <span>SPEED <output>{settings.speed.toFixed(2)}</output></span>
          <input
            type="range"
            min={LIMINAL_SPEED_MIN}
            max={LIMINAL_SPEED_MAX}
            step={0.05}
            value={settings.speed}
            onChange={(event) => liminal.update({ speed: Number(event.target.value) })}
          />
        </label>
        <label className="exp-field">
          <span>DENSITY <output>{settings.density.toFixed(2)}</output></span>
          <input
            type="range"
            min={LIMINAL_DENSITY_MIN}
            max={LIMINAL_DENSITY_MAX}
            step={0.05}
            value={settings.density}
            onChange={(event) => liminal.update({ density: Number(event.target.value) })}
          />
        </label>
        <fieldset className="exp-palette">
          <legend>PALETTE</legend>
          {PALETTES.map((name, index) => (
            <label key={name} className="exp-chip">
              <input
                type="radio"
                name="liminal-palette"
                checked={settings.palette === index}
                onChange={() => liminal.update({ palette: index })}
              />
              <span>{name}</span>
            </label>
          ))}
        </fieldset>
        <div className="exp-actions">
          <button className="exp-button" type="button" onClick={liminal.reset}>RESET</button>
          <button
            className="exp-button"
            type="button"
            aria-pressed={audio.playing}
            disabled={!audio.supported}
            onClick={audio.toggle}
          >
            {audio.supported ? (audio.playing ? "SOUND ON" : "SOUND OFF") : "NO AUDIO"}
          </button>
          <button className="exp-button" type="button" disabled={!available} aria-describedby={hintId} onClick={savePng}>
            SAVE PNG
          </button>
          <button className="exp-button" type="button" onClick={copyLink}>COPY LINK</button>
        </div>
        <p className="exp-status" id={hintId} role="status">
          {!available
            ? "Graphics unavailable: PNG export is disabled."
            : audio.error ?? status}
        </p>
        {reducedMotion && <p className="exp-hint">Reduced motion: the artwork stays still; speed applies when motion is allowed.</p>}
      </div>
    </div>
  );
}
