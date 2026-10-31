"use client";

import { useEffect, useRef, useState } from "react";

import type { NowPlaying } from "@/app/api/spotify/route";

/**
 * Poll now-playing.
 *
 * Polls rather than streams because Spotify has no push API for this, and the
 * route caches for 20s anyway so a tighter interval would only re-read the same
 * CDN response.
 *
 * The progress bar is advanced locally between polls, so it moves smoothly at
 * 60fps instead of jumping every fifteen seconds.
 */
export function useSpotify(intervalMs = 15000) {
  const [track, setTrack] = useState<NowPlaying | null>(null);
  /** When the current `track.progressMs` was measured. */
  const measuredAt = useRef(0);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const res = await fetch("/api/spotify");
        if (res.ok && alive) {
          setTrack(await res.json());
          measuredAt.current = Date.now();
        }
      } catch {
        // Offline or rate-limited. The screen keeps showing the last track,
        // which is a better failure than blanking.
      }
      if (alive) timer = setTimeout(poll, intervalMs);
    };

    poll();

    // Polling a hidden tab burns a request every 15s for nobody.
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        poll();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      alive = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs]);

  return { track, measuredAt };
}

/** Interpolated playback position, in ms. */
export function livePosition(track: NowPlaying | null, measuredAt: number): number {
  if (!track?.playing || track.progressMs === undefined) return track?.progressMs ?? 0;
  const elapsed = Date.now() - measuredAt;
  return Math.min(track.progressMs + elapsed, track.durationMs ?? Infinity);
}

export function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** "az önce", "12 dk önce", "3 sa önce", "2 gün önce" — the Turkish client's own. */
export function playedAgo(iso: string | undefined, now = Date.now()): string {
  if (!iso) return "";
  const minutes = Math.max(0, (now - Date.parse(iso)) / 60_000);
  if (minutes < 2) return "az önce";
  if (minutes < 60) return `${Math.round(minutes)} dk önce`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)} sa önce`;
  return `${Math.round(hours / 24)} gün önce`;
}
