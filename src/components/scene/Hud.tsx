"use client";

import { useEffect, useState } from "react";

import { isPinned, sceneNow } from "@/lib/clock";
import { daylight } from "@/lib/daylight";
import type { ScreenId } from "@/lib/layout";
import { useScene } from "@/lib/store";
import { useHeld } from "@/lib/held";
import { useWeather } from "@/lib/useWeather";

import { HeldControls } from "./HeldControls";

/** Labelled by what each screen shows now, not by its id: the ids predate the
 *  layout, and "commits" is the bio while "about" is the R10 profile (see
 *  `ScreenContent` in Room.tsx). */
const SCREEN_LABELS: { id: ScreenId; label: string }[] = [
  { id: "commits", label: "Hakkında ve iletişime git" },
  { id: "about", label: "R10 profiline git" },
  { id: "music", label: "Şimdi Çalıyor'a git" },
];

/**
 * The only chrome over the room, and the scene fails without it: a 3D room gives
 * no affordance a flat page gives for free — no underlines, no cursor change
 * until you're already hovering the right thing — so without a line of text
 * people look at a nice render and leave. It also offers the way out.
 */
export function Hud() {
  const focus = useScene((s) => s.focus);
  const hasInteracted = useScene((s) => s.hasInteracted);
  const clearFocus = useScene((s) => s.clearFocus);
  const focusScreen = useScene((s) => s.focusScreen);
  const setForceFlat = useScene((s) => s.setForceFlat);
  const holding = useHeld((s) => s.item !== null);

  const weather = useWeather();
  const [clock, setClock] = useState<{ label: string; night: boolean } | null>(
    null,
  );

  useEffect(() => {
    const tick = () => {
      const d = daylight(sceneNow());
      setClock({ label: d.label, night: d.night });
    };
    tick();
    if (isPinned()) return;
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const focused = focus.kind !== "none";

  return (
    <>
      {/* First focusable thing on the page: a keyboard user landing in a 3D
          room needs the way out before anything else. */}
      <button
        type="button"
        onClick={() => setForceFlat(true)}
        className="sr-only z-50 focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:rounded-full focus:bg-accent focus:px-5 focus:py-2.5 focus:font-mono focus:text-[13px] focus:text-graphite"
      >
        Odayı geç, sayfa olarak oku
      </button>

      {/* Hidden until focused: the room already says "click a screen" to anyone
          using a mouse. */}
      <nav
        aria-label="Ekranlar"
        className="fixed left-4 top-16 z-50 flex flex-col gap-2"
      >
        {SCREEN_LABELS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => focusScreen(id)}
            className="sr-only focus:not-sr-only focus:rounded-full focus:bg-screen-raised focus:px-5 focus:py-2.5 focus:font-mono focus:text-[13px] focus:text-ink"
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex items-end justify-between gap-6 p-5 sm:p-7">
        <p className="font-mono text-[12px] leading-relaxed text-ink-faint">
          {clock && (
            <span className="text-ink-dim tabular-nums">
              {clock.label} İstanbul
              {weather && (
                <span className="text-ink-faint"> · {weather.label}</span>
              )}
              {clock.night && (
                <span className="text-ink-faint"> · muhtemelen uyuyor</span>
              )}
            </span>
          )}
          <br />
          <span
            className={`transition-opacity duration-700 ${
              focused || !hasInteracted || holding ? "opacity-100" : "opacity-0"
            }`}
          >
            {holding
              ? "Elindekini bırakmak için Q"
              : focused
                ? "Geri çekilmek için ESC veya boşluğa tıkla"
                : "Bir ekrana tıkla"}
          </span>
        </p>

        <button
          type="button"
          onClick={() => setForceFlat(true)}
          className="pointer-events-auto shrink-0 rounded-full bg-screen-raised/80 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-ink-dim backdrop-blur-sm transition-colors duration-150 hover:bg-screen-hi hover:text-ink focus-visible:bg-screen-hi focus-visible:text-ink focus-visible:outline-none"
        >
          Sayfa Olarak Oku
        </button>
      </div>

      {/* A real control for Escape, so it isn't an undiscoverable key. */}
      {focused && (
        <button
          type="button"
          onClick={clearFocus}
          className="fixed left-1/2 top-4 z-50 -translate-x-1/2 -translate-y-24 rounded-full bg-screen-raised px-5 py-2.5 font-mono text-[12px] text-ink transition-transform focus-visible:translate-y-0 focus-visible:outline-none"
        >
          Geri Çekil
        </button>
      )}
      <HeldControls />
    </>
  );
}
