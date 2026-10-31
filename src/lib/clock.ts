"use client";

/**
 * The instant the room is rendering.
 *
 * Normally just now. `?t=HH:MM` pins it to an Istanbul wall-clock time so both
 * halves of the design — the daylit room and the lamplit one — can be looked at
 * without waiting for the hour to come round.
 */
export function sceneNow(): Date {
  if (typeof window === "undefined") return new Date();

  const forced = new URLSearchParams(window.location.search).get("t");
  const match = forced && /^(\d{1,2}):(\d{2})$/.exec(forced);
  if (!match) return new Date();

  const [h, m] = [Number(match[1]), Number(match[2])];
  if (h > 23 || m > 59) return new Date();

  // Today's date in Istanbul at that wall-clock time (UTC+3, Turkey Time), so
  // the pinned hour gets this season's sunrise and sunset rather than January's.
  const TRT = 3 * 3_600_000;
  const local = Date.now() + TRT;
  const midnight = local - (local % 86_400_000);
  return new Date(midnight + (h * 60 + m) * 60_000 - TRT);
}

/** True when the clock is pinned, so the UI can stop ticking. */
export function isPinned(): boolean {
  if (typeof window === "undefined") return false;
  const forced = new URLSearchParams(window.location.search).get("t");
  return !!forced && /^\d{1,2}:\d{2}$/.test(forced);
}
