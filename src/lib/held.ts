"use client";

import { create } from "zustand";

/**
 * What's in the visitor's hand, first-person style.
 *
 * Picking something off the desk takes it out of the room and into the view;
 * the HUD then offers that item's actions. Actions are fired as events (a name
 * and a counter) rather than as state, because "sip" or "blow a ring" is a
 * moment, and the viewmodel plays each one once.
 */
export type HeldItem = "tea" | "cigarette";

export type HeldAction = "sip" | "exhale" | "ring";

interface HeldState {
  item: HeldItem | null;
  action: { name: HeldAction; id: number } | null;
  /** Drawing on the cigarette: held for as long as the button is. */
  inhaling: boolean;
  /** 0..1 — smoke taken in and not yet blown out. For the HUD's meter. */
  lungs: number;
  /** True while an animation owns the hand, so the HUD can wait. */
  busy: boolean;
  /** The glass is drained: nothing left to sip, so put it down for more. */
  teaEmpty: boolean;
  /** The çaydanlık is pouring into the glass on its saucer. */
  pouring: boolean;

  pick: (item: HeldItem) => void;
  drop: () => void;
  act: (name: HeldAction) => void;
  setInhaling: (v: boolean) => void;
  setLungs: (v: number) => void;
  setBusy: (v: boolean) => void;
  setTeaEmpty: (v: boolean) => void;
  setPouring: (v: boolean) => void;
}

export const useHeld = create<HeldState>((set) => ({
  item: null,
  action: null,
  inhaling: false,
  lungs: 0,
  busy: false,
  teaEmpty: false,
  pouring: false,

  pick: (item) => set({ item, inhaling: false }),
  drop: () => set({ item: null, inhaling: false, busy: false, pouring: false }),
  act: (name) =>
    set((s) => ({ action: { name, id: (s.action?.id ?? 0) + 1 } })),
  setInhaling: (inhaling) => set({ inhaling }),
  setLungs: (lungs) => set({ lungs }),
  setBusy: (busy) => set({ busy }),
  setTeaEmpty: (teaEmpty) => set({ teaEmpty }),
  setPouring: (pouring) => set({ pouring }),
}));

// For screenshot tooling, as with the scene store: drive the hand through the
// real store rather than clicking at guessed coordinates.
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  (window as unknown as { __held: typeof useHeld }).__held = useHeld;
}
