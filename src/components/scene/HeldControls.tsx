"use client";

import { useEffect } from "react";

import { useHeld } from "@/lib/held";

/**
 * The actions for whatever's in hand, as buttons along the bottom of the view
 * and as keys, the way a game lists them: E to use, F and R for the
 * cigarette's other two, Q to put it down.
 *
 * Drawing on the cigarette is press-and-hold, on the button and on E alike.
 */
export function HeldControls() {
  const item = useHeld((s) => s.item);
  const busy = useHeld((s) => s.busy);
  const teaEmpty = useHeld((s) => s.teaEmpty);
  const lungs = useHeld((s) => s.lungs);
  const inhaling = useHeld((s) => s.inhaling);

  useEffect(() => {
    if (!item) return;
    const typing = (e: KeyboardEvent) =>
      e.target instanceof HTMLElement &&
      (e.target.isContentEditable ||
        /^(INPUT|TEXTAREA)$/.test(e.target.tagName));

    const down = (e: KeyboardEvent) => {
      if (typing(e) || e.repeat) return;
      const h = useHeld.getState();
      const key = e.key.toLowerCase();
      if (key === "q") h.drop();
      if (item === "tea") {
        if (key === "e" && !h.busy && !h.teaEmpty) h.act("sip");
      } else {
        if (key === "e") h.setInhaling(true);
        if (key === "f") h.act("exhale");
        if (key === "r") h.act("ring");
      }
    };
    const up = (e: KeyboardEvent) => {
      if (item === "cigarette" && e.key.toLowerCase() === "e") {
        useHeld.getState().setInhaling(false);
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [item]);

  if (!item) return null;
  const h = useHeld.getState;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4">
      <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-full bg-screen-raised/85 px-3 py-2 font-mono text-[12px] text-ink-dim shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-sm">
        {item === "tea" ? (
          teaEmpty ? (
            <span className="px-3 text-ink-faint">
              Çay bitti — bırak, demlikten doldurulsun
            </span>
          ) : (
            <Key
              label="Yudum al"
              hint="E"
              disabled={busy}
              onClick={() => h().act("sip")}
            />
          )
        ) : (
          <>
            <button
              type="button"
              onPointerDown={() => h().setInhaling(true)}
              onPointerUp={() => h().setInhaling(false)}
              onPointerLeave={() => h().setInhaling(false)}
              className={`flex select-none items-center gap-2 rounded-full px-4 py-2 transition-colors ${
                inhaling
                  ? "bg-[#ff8a1f] text-black"
                  : "bg-screen-hi text-ink hover:bg-screen-hi/80"
              }`}
            >
              <Hint>E</Hint> Çek (basılı tut)
            </button>
            <Key
              label="Üfle"
              hint="F"
              disabled={lungs < 0.04}
              onClick={() => h().act("exhale")}
            />
            <Key
              label="Halka at"
              hint="R"
              disabled={lungs < 0.08}
              onClick={() => h().act("ring")}
            />
            {/* How much smoke is in: what there is to blow out. */}
            <span
              className="flex items-center gap-2 px-2"
              aria-label="Ciğerdeki duman"
            >
              <span className="text-[10px] uppercase tracking-wider text-ink-faint">
                Duman
              </span>
              <span className="h-[5px] w-16 overflow-hidden rounded-full bg-screen-line">
                <span
                  className="block h-full rounded-full bg-[#ff8a1f] transition-[width] duration-100"
                  style={{ width: `${Math.round(lungs * 100)}%` }}
                />
              </span>
            </span>
          </>
        )}
        <Key label="Bırak" hint="Q" onClick={() => h().drop()} />
      </div>
    </div>
  );
}

function Key({
  label,
  hint,
  disabled,
  onClick,
}: {
  label: string;
  hint: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex select-none items-center gap-2 rounded-full bg-screen-hi px-4 py-2 text-ink transition-colors hover:bg-screen-hi/80 disabled:cursor-default disabled:opacity-40"
    >
      <Hint>{hint}</Hint> {label}
    </button>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-[5px] border border-white/15 px-1.5 py-[1px] text-[10px] text-ink-faint">
      {children}
    </kbd>
  );
}
