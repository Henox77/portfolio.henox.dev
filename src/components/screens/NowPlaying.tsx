"use client";

import { useEffect, useState } from "react";

import type { NowPlaying as Playing, Track } from "@/app/api/spotify/route";
import { sceneNow } from "@/lib/clock";
import { istanbulHours } from "@/lib/daylight";
import { PROFILE } from "@/lib/profile";
import { useScene } from "@/lib/store";
import {
  formatDuration,
  livePosition,
  playedAgo,
  useSpotify,
} from "@/lib/useSpotify";

/**
 * A music player, not a card about music — the premise of this screen is that
 * you're looking at a real one, and nobody's actual screen shows a bespoke
 * summary widget.
 *
 * The library and track list are genuine recent plays and the progress bar
 * advances against the true position. The transport controls are deliberately
 * non-interactive and aria-hidden: this is a view of a player, not a remote.
 *
 * The empty state keeps the whole interface and empties only the middle — one
 * that throws away the layout reads as broken, where this reads as idle. It is
 * the state this screen is in most of the time.
 *
 * Copy is Turkish, matching the Turkish Spotify client word for word.
 */

const GREEN = "#1db954";
/** The wash behind the header when the artwork can't be sampled. */
const FALLBACK_TINT = "#2f4f4a";

export function NowPlaying({
  variant = "wide",
}: {
  /**
   * `wide` is the desktop client. `tall` is not a squeezed version of it — a
   * 618-pixel column can't hold a 236-pixel sidebar and a four-column track
   * list — so it gets the stacked layout a player uses in portrait.
   */
  variant?: "wide" | "tall";
} = {}) {
  const { track, measuredAt } = useSpotify();
  const [, tick] = useState(0);

  // Re-render for the progress bar. 500ms is imperceptibly coarse for a bar
  // that moves 1% every two seconds, and costs almost nothing.
  useEffect(() => {
    if (!track?.playing) return;
    const id = setInterval(() => tick((n) => n + 1), 500);
    return () => clearInterval(id);
  }, [track?.playing]);

  // The speakers in the room pump only while something is actually playing.
  const playing = !!track?.playing;
  useEffect(() => {
    useScene.getState().setMusicPlaying(playing);
  }, [playing]);

  const position = track ? livePosition(track, measuredAt.current) : 0;

  if (variant === "tall") {
    return <TallPlayer track={track} position={position} />;
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#000] font-sans text-[#b3b3b3] antialiased">
      <div className="flex min-h-0 flex-1 gap-2 p-2">
        <Sidebar recent={track?.recent} />
        <Main track={track} />
      </div>
      <Transport track={track} position={position} />
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Colour, greeting, status
 * ---------------------------------------------------------------------- */

/**
 * The header wash, pulled from the album art the way the real client does it.
 *
 * Spotify's image CDN sends `Access-Control-Allow-Origin: *`, so an anonymous
 * load can be drawn to a canvas without tainting it. Any failure — another
 * host, a blocked request — just leaves the fixed wash in place.
 */
function useArtTint(src?: string): string {
  const [sampled, setSampled] = useState<{ src: string; tint: string } | null>(
    null,
  );

  useEffect(() => {
    if (!src) return;
    let alive = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 8;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 8, 8);
        const px = ctx.getImageData(0, 0, 8, 8).data;
        let [r, g, b] = [0, 0, 0];
        for (let i = 0; i < px.length; i += 4) {
          r += px[i];
          g += px[i + 1];
          b += px[i + 2];
        }
        const n = px.length / 4;
        if (alive) setSampled({ src, tint: toWash(r / n, g / n, b / n) });
      } catch {
        // Tainted canvas: keep the fallback.
      }
    };
    img.src = src;
    return () => {
      alive = false;
    };
  }, [src]);

  return sampled && sampled.src === src ? sampled.tint : FALLBACK_TINT;
}

/**
 * An average colour is usually mud. Keep its hue, cap the saturation and pin
 * the lightness, so white text always sits on it and no cover turns the
 * header neon.
 */
function toWash(r: number, g: number, b: number): string {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
  }
  const l = (max + min) / 2;
  const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  const hue = Math.round((h * 60 + 360) % 360);
  return `hsl(${hue} ${Math.round(Math.min(sat * 1.15, 0.55) * 100)}% 30%)`;
}

/** Spotify's home-screen greeting, on Istanbul time rather than the viewer's. */
function greeting(): string {
  const h = istanbulHours(sceneNow());
  if (h < 5) return "İyi geceler";
  if (h < 12) return "Günaydın";
  if (h < 18) return "İyi günler";
  if (h < 22) return "İyi akşamlar";
  return "İyi geceler";
}

/** "Şimdi çalıyor", or when it was last heard. */
function statusLabel(track: Playing): string {
  if (track.playing) return "Şimdi çalıyor";
  const ago = playedAgo(track.playedAt);
  return ago ? `Son çalınan · ${ago}` : "Son çalınan";
}

/* -------------------------------------------------------------------------
 * Portrait
 * ---------------------------------------------------------------------- */

function TallPlayer({
  track,
  position,
}: {
  track: Playing | null;
  position: number;
}) {
  const pct = track?.durationMs ? (position / track.durationMs) * 100 : 0;
  const tint = useArtTint(track?.albumArt);

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden px-7 pb-6 pt-7 font-sans text-[#b3b3b3] antialiased"
      style={{
        background: `linear-gradient(to bottom, ${tint} 0%, #141414 55%, #0a0a0a 100%)`,
      }}
    >
      <header className="flex items-center justify-between">
        <span
          suppressHydrationWarning
          className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white"
        >
          <SpotifyMark />
          {track?.title ? statusLabel(track) : "Spotify"}
        </span>
        <Bars playing={!!track?.playing} />
      </header>

      {!track?.title ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <span className="flex size-[180px] items-center justify-center rounded-2xl bg-[#1c1c1c] text-[#3a3a3a]">
            <NoteIcon />
          </span>
          <p
            suppressHydrationWarning
            className="text-[22px] font-bold tracking-tight text-white"
          >
            {greeting()}
          </p>
          <p
            className={`text-[15px] text-[#8a8a8a] ${track ? "" : "animate-pulse"}`}
          >
            {track ? "Şu an bir şey çalmıyor" : "Bağlanıyor…"}
          </p>
        </div>
      ) : (
        <>
          <a
            href={track.url}
            target="_blank"
            rel="noreferrer"
            aria-label={`${track.title} şarkısını Spotify'da aç`}
            className="mt-5 block transition-transform duration-300 hover:scale-[1.01] focus-visible:outline-none"
          >
            <Art
              src={track.albumArt}
              size={510}
              radius="rounded-2xl"
              shadow
              fluid
            />
          </a>

          <div className="mt-6 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-[31px] font-black leading-[1.08] tracking-tight text-white">
                {track.title}
              </h2>
              <p className="mt-2 truncate text-[18px]">{track.artist}</p>
            </div>
            <span className="mt-2 shrink-0 text-[#1db954]">
              <HeartIcon size={24} />
            </span>
          </div>

          <div className="mt-5">
            <span className="block h-[5px] w-full overflow-hidden rounded-full bg-[#ffffff33]">
              <span
                className="block h-full rounded-full bg-white transition-[width] duration-500 ease-linear"
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </span>
            <div className="mt-2.5 flex justify-between text-[12px] tabular-nums">
              <span>{track.durationMs ? formatDuration(position) : "0:00"}</span>
              <span>
                {track.durationMs ? formatDuration(track.durationMs) : "0:00"}
              </span>
            </div>
          </div>

          {/* Chrome, and hidden from assistive tech: none of it does anything. */}
          <div
            aria-hidden
            className="mt-5 flex items-center justify-between px-1 text-white"
          >
            <ShuffleIcon />
            <PrevIcon />
            <span className="flex size-[62px] items-center justify-center rounded-full bg-white text-black shadow-[0_6px_24px_rgba(0,0,0,0.45)]">
              {track.playing ? <PauseIcon size={24} /> : <PlayIcon size={24} />}
            </span>
            <NextIcon />
            <RepeatIcon />
          </div>
        </>
      )}

      {track?.recent?.length ? (
        <section className="mt-6 flex min-h-0 flex-1 flex-col">
          <h3 className="mb-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[#8a8a8a]">
            Son çalınanlar
          </h3>
          <ol className="min-h-0 flex-1 overflow-y-auto">
            {track.recent.map((t, i) => (
              <li key={`${t.title}-${i}`}>
                <a
                  href={t.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3.5 rounded-lg px-2 py-2 transition-colors hover:bg-[#ffffff12] focus-visible:bg-[#ffffff12] focus-visible:outline-none"
                >
                  <Art src={t.albumArt} size={46} radius="rounded-md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] text-white">
                      {t.title}
                    </span>
                    <span className="block truncate text-[13px]">
                      {t.artist}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-[12px] tabular-nums">
                    <span className="block">
                      {t.durationMs ? formatDuration(t.durationMs) : ""}
                    </span>
                    <span
                      suppressHydrationWarning
                      className="block text-[11px] text-[#6a6a6a]"
                    >
                      {playedAgo(t.playedAt)}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <p className="mt-4 flex shrink-0 items-center gap-1.5 text-[11px] text-[#6a6a6a]">
        <SpotifyMark size={11} />
        Spotify&apos;dan canlı
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Sidebar
 * ---------------------------------------------------------------------- */

function Sidebar({ recent }: { recent?: Track[] }) {
  // Artists rather than the tracks the main pane already lists, which made the
  // panel look like it was padding itself out. Same data, no extra call.
  const artists = Array.from(
    new Map(
      (recent ?? []).flatMap((t) =>
        t.artist
          .split(", ")
          .map(
            (name) =>
              [name, { name, albumArt: t.albumArt, url: t.url }] as const,
          ),
      ),
    ).values(),
  ).slice(0, 5);

  return (
    <nav
      aria-label="Kitaplık"
      // Dropped on narrow viewports: the 3D surface is authored at a fixed
      // 1100px, but the flat page renders this on a phone.
      className="hidden w-[236px] shrink-0 flex-col gap-2 sm:flex"
    >
      <div className="rounded-lg bg-[#121212] px-3 py-3">
        <NavItem icon={<HomeIcon />} label="Ana sayfa" active />
        <NavItem icon={<SearchIcon />} label="Ara" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-lg bg-[#121212]">
        <header className="flex items-center gap-2 px-4 pb-2 pt-3">
          <LibraryIcon />
          <span className="text-[13px] font-bold text-[#b3b3b3]">
            Kitaplığın
          </span>
        </header>

        {/*
          Filter pills. Purely chrome, and worth the space: they're one of the
          two or three shapes that make this layout instantly recognisable.
        */}
        <div className="flex gap-2 px-3 pb-2">
          {["Çalma listeleri", "Sanatçılar"].map((f) => (
            <span
              key={f}
              className="whitespace-nowrap rounded-full bg-[#232323] px-3 py-[3px] text-[11px] text-white"
            >
              {f}
            </span>
          ))}
        </div>

        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-2">
          {/* The pinned row every real library has at the top of it. */}
          <li className="flex items-center gap-3 rounded-md px-2 py-[6px]">
            <span className="flex size-10 shrink-0 items-center justify-center rounded bg-gradient-to-br from-[#4a24c4] to-[#b4a6f0] text-white">
              <HeartIcon size={14} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] text-white">
                Beğenilen Şarkılar
              </span>
              <span className="flex items-center gap-1 truncate text-[11px]">
                <span className="text-[#1db954]">
                  <PinIcon />
                </span>
                Çalma listesi · {PROFILE.name}
              </span>
            </span>
          </li>

          {artists.map((a) => (
            <li key={a.name}>
              <a
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-md px-2 py-[6px] transition-colors hover:bg-[#1a1a1a] focus-visible:bg-[#1a1a1a] focus-visible:outline-none"
              >
                {/* Artists are round in a library list; songs are square. */}
                <Art src={a.albumArt} size={40} radius="rounded-full" />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] text-white">
                    {a.name}
                  </span>
                  <span className="block truncate text-[11px]">Sanatçı</span>
                </span>
              </a>
            </li>
          ))}

          {!recent?.length && (
            <li className="px-2 py-3 text-[12px] text-[#6a6a6a]">
              Burada henüz bir şey yok.
            </li>
          )}
        </ul>

        {/* Spotify's developer terms ask for this wherever their data shows. */}
        <p className="flex items-center gap-1.5 px-4 pb-3 pt-1 text-[10px] text-[#6a6a6a]">
          <SpotifyMark size={11} />
          Spotify&apos;dan canlı
        </p>
      </div>
    </nav>
  );
}

function NavItem({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-4 py-[7px] text-[14px] font-bold ${
        active ? "text-white" : "text-[#b3b3b3]"
      }`}
    >
      {icon}
      {label}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Main pane
 * ---------------------------------------------------------------------- */

function Main({ track }: { track: Playing | null }) {
  const tint = useArtTint(track?.albumArt);

  if (!track?.title) {
    return (
      <Pane>
        <div
          className="flex flex-1 flex-col items-center justify-center gap-3"
          style={{
            background: `linear-gradient(to bottom, ${FALLBACK_TINT}80, #121212 65%)`,
          }}
        >
          <p
            suppressHydrationWarning
            className="text-[28px] font-bold tracking-tight text-white"
          >
            {greeting()}
          </p>
          <span className="flex items-center gap-2.5">
            <Bars playing={false} />
            <span
              className={`text-[14px] text-[#8a8a8a] ${track ? "" : "animate-pulse"}`}
            >
              {track ? "Şu an bir şey çalmıyor" : "Bağlanıyor…"}
            </span>
          </span>
        </div>
      </Pane>
    );
  }

  return (
    <Pane>
      {/* Sampled from the artwork, as the real client does; see useArtTint. */}
      <div
        className="relative shrink-0 px-6 pb-5 pt-6"
        style={{ background: `linear-gradient(to bottom, ${tint}, #121212)` }}
      >
        <div className="flex items-end gap-5">
          <Art src={track.albumArt} size={148} radius="rounded-md" shadow />
          <div className="min-w-0 pb-1">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-white">
              <span suppressHydrationWarning>{statusLabel(track)}</span>
              <span
                suppressHydrationWarning
                className="font-normal normal-case tracking-normal text-white/60"
              >
                · {greeting()}
              </span>
            </p>
            <h2 className="mt-1 truncate text-[40px] font-black leading-[1.05] tracking-tight text-white">
              {track.title}
            </h2>
            <p className="mt-3 truncate text-[12px] text-white">
              <span className="font-bold">{track.artist}</span>
              {track.album && ` · ${track.album}`}
              {track.durationMs
                ? ` · ${formatDuration(track.durationMs)}`
                : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-5 px-6 py-3">
        <a
          href={track.url}
          target="_blank"
          rel="noreferrer"
          className="flex size-[46px] items-center justify-center rounded-full text-black shadow-[0_6px_20px_rgba(0,0,0,0.4)] transition-transform hover:scale-105 focus-visible:scale-105 focus-visible:outline-none"
          style={{ background: GREEN }}
          aria-label={`${track.title} şarkısını Spotify'da aç`}
        >
          <PlayIcon size={20} />
        </a>
        <span className="text-[#1db954]">
          <HeartIcon />
        </span>
        <Bars playing={!!track.playing} />
        <a
          href={track.url}
          target="_blank"
          rel="noreferrer"
          className="ml-auto rounded-full border border-[#ffffff33] px-3.5 py-[5px] text-[11px] font-bold text-white transition-colors hover:border-white focus-visible:border-white focus-visible:outline-none"
        >
          Spotify&apos;da dinle
        </a>
      </div>

      <TrackList recent={track.recent} />
    </Pane>
  );
}

function Pane({ children }: { children: React.ReactNode }) {
  return (
    <section className="@container flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-[#121212]">
      {children}
    </section>
  );
}

/**
 * One template for the header and every row, so the columns can't drift.
 * Container query, not media: in the room this sits at a fixed design width.
 */
const COLS =
  "grid grid-cols-[24px_1fr_140px_84px_44px] gap-3 @max-[620px]:grid-cols-[24px_1fr_44px]";

function TrackList({ recent }: { recent?: Track[] }) {
  if (!recent?.length) return null;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
      <h3 className="px-2 pb-2 text-[15px] font-bold text-white">
        Son çalınanlar
      </h3>
      <div
        className={`${COLS} border-b border-[#ffffff1a] px-2 pb-1 text-[11px] uppercase tracking-wide`}
      >
        <span>#</span>
        <span>Başlık</span>
        <span className="@max-[620px]:hidden">Albüm</span>
        <span className="@max-[620px]:hidden">Dinlenme</span>
        <span className="text-right">
          <ClockIcon />
        </span>
      </div>
      <ol className="mt-1">
        {recent.map((t, i) => (
          <li key={`${t.title}-${i}`}>
            <a
              href={t.url}
              target="_blank"
              rel="noreferrer"
              className={`${COLS} group items-center rounded-md px-2 py-[7px] transition-colors hover:bg-[#ffffff12] focus-visible:bg-[#ffffff12] focus-visible:outline-none`}
            >
              {/* The number turns into a play glyph on hover, as in the client. */}
              <span className="text-[12px] tabular-nums">
                <span className="group-hover:hidden">{i + 1}</span>
                <span className="hidden text-white group-hover:inline">
                  <PlayIcon size={12} />
                </span>
              </span>
              <span className="flex min-w-0 items-center gap-3">
                <Art src={t.albumArt} size={32} radius="rounded-[3px]" />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] text-white">
                    {t.title}
                  </span>
                  <span className="block truncate text-[11px]">{t.artist}</span>
                </span>
              </span>
              <span className="truncate text-[12px] @max-[620px]:hidden">
                {t.album}
              </span>
              <span
                suppressHydrationWarning
                className="truncate text-[12px] @max-[620px]:hidden"
              >
                {playedAgo(t.playedAt)}
              </span>
              <span className="text-right text-[12px] tabular-nums">
                {t.durationMs ? formatDuration(t.durationMs) : "—"}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Transport
 * ---------------------------------------------------------------------- */

function Transport({
  track,
  position,
}: {
  track: Playing | null;
  position: number;
}) {
  const pct = track?.durationMs ? (position / track.durationMs) * 100 : 0;

  return (
    <footer className="flex h-[72px] shrink-0 items-center gap-4 px-4">
      <div className="flex w-[150px] min-w-0 items-center gap-3 sm:w-[236px]">
        {track?.title ? (
          <>
            <Art src={track.albumArt} size={48} radius="rounded" />
            <span className="min-w-0">
              <span className="block truncate text-[13px] text-white">
                {track.title}
              </span>
              <span className="block truncate text-[11px]">{track.artist}</span>
            </span>
            <span className="hidden shrink-0 text-[#1db954] sm:block">
              <HeartIcon size={14} />
            </span>
          </>
        ) : (
          <span className="text-[12px] text-[#6a6a6a]">—</span>
        )}
      </div>

      {/* Chrome, and aria-hidden: a screen reader offered a play button that
          cannot play is worse served than one told the controls aren't there. */}
      <div className="flex min-w-0 flex-1 flex-col items-center gap-[6px]">
        <div aria-hidden className="flex items-center gap-5 text-[#b3b3b3]">
          <ShuffleIcon />
          <PrevIcon />
          <span className="flex size-8 items-center justify-center rounded-full bg-white text-black">
            {track?.playing ? <PauseIcon size={13} /> : <PlayIcon size={13} />}
          </span>
          <NextIcon />
          <RepeatIcon />
        </div>

        <div className="flex w-full max-w-[420px] items-center gap-2">
          <span className="w-[34px] text-right text-[10px] tabular-nums">
            {track?.durationMs ? formatDuration(position) : "0:00"}
          </span>
          <span className="h-[4px] flex-1 overflow-hidden rounded-full bg-[#4d4d4d]">
            <span
              className="block h-full rounded-full transition-[width] duration-500 ease-linear"
              style={{
                width: `${Math.min(100, pct)}%`,
                // Green while it's actually moving, white when paused.
                background: track?.playing ? GREEN : "#fff",
              }}
            />
          </span>
          <span className="w-[34px] text-[10px] tabular-nums">
            {track?.durationMs ? formatDuration(track.durationMs) : "0:00"}
          </span>
        </div>
      </div>

      <div
        aria-hidden
        className="hidden w-[236px] items-center justify-end gap-3 text-[#b3b3b3] sm:flex"
      >
        <QueueIcon />
        <VolumeIcon />
        <span className="h-[4px] w-[76px] overflow-hidden rounded-full bg-[#4d4d4d]">
          <span className="block h-full w-[68%] rounded-full bg-white" />
        </span>
      </div>
    </footer>
  );
}

/* -------------------------------------------------------------------------
 * Bits
 * ---------------------------------------------------------------------- */

function Art({
  src,
  size,
  radius,
  shadow,
  fluid,
}: {
  src?: string;
  size: number;
  radius: string;
  shadow?: boolean;
  /** Fill the column and stay square, rather than sitting at a fixed size. */
  fluid?: boolean;
}) {
  const className = `${radius} shrink-0 object-cover ${
    shadow ? "shadow-[0_10px_40px_rgba(0,0,0,0.65)]" : ""
  } ${fluid ? "mx-auto block aspect-square w-[80%]" : ""}`;
  const box = fluid ? undefined : { width: size, height: size };

  if (!src) {
    return <span className={`${className} block bg-[#282828]`} style={box} />;
  }

  return (
    // Deliberately not next/image: this is a remote host with a short-lived
    // URL, and the optimiser would cache a link that expires.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={className}
      style={box}
    />
  );
}

/** Four bars that bounce while playing and rest flat when not. */
function Bars({ playing }: { playing: boolean }) {
  return (
    <span className="flex h-4 items-end gap-[3px]" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="w-[3px] rounded-full"
          style={
            playing
              ? {
                  background: GREEN,
                  animation: `eq ${780 + i * 90}ms ease-in-out ${i * 130}ms infinite alternate`,
                  height: "40%",
                }
              : { background: "#535353", height: "18%" }
          }
        />
      ))}
      <style>{`@keyframes eq { from { height: 18% } to { height: 100% } }`}</style>
    </span>
  );
}

// Inline rather than a library: a dozen paths that never change would cost more
// as a dependency than the rest of this screen. All inherit currentColor.
const svg = (d: string, size = 16) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden
  >
    <path d={d} />
  </svg>
);

const HomeIcon = () => svg("M12 3 2 11h3v9h6v-6h2v6h6v-9h3L12 3Z", 18);
const SearchIcon = () =>
  svg(
    "M10 2a8 8 0 1 0 4.9 14.32l5.39 5.39 1.42-1.42-5.39-5.39A8 8 0 0 0 10 2Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z",
    18,
  );
const LibraryIcon = () =>
  svg("M3 3h2v18H3V3Zm4 0h2v18H7V3Zm5.4.5 1.9-.5 4.7 17.4-1.9.5L12.4 3.5Z", 18);
const PlayIcon = ({ size = 16 }: { size?: number }) =>
  svg("M8 5v14l11-7L8 5Z", size);
const PauseIcon = ({ size = 16 }: { size?: number }) =>
  svg("M7 4h4v16H7V4Zm6 0h4v16h-4V4Z", size);
const PrevIcon = () => svg("M7 5h2v14H7V5Zm3 7 8-7v14l-8-7Z", 16);
const NextIcon = () => svg("M15 5h2v14h-2V5Zm-1 7L6 19V5l8 7Z", 16);
const ShuffleIcon = () =>
  svg(
    "M17 3v2h1.6l-3.3 3.3 1.4 1.4L20 6.4V8h2V3h-5ZM2 5h4l3 3 1.4-1.4L6.8 3H2v2Zm15.7 9.3-1.4 1.4L18.6 18H17v2h5v-5h-2v1.6l-2.3-2.3ZM2 17h4.8l9-9H20V6h-4.2l-9 9H2v2Z",
    15,
  );
const RepeatIcon = () =>
  svg(
    "M7 7h10v3l4-4-4-4v3H5v6h2V7Zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4Z",
    15,
  );
const HeartIcon = ({ size = 17 }: { size?: number }) =>
  svg(
    "M12 21s-8-4.9-8-10.2A4.8 4.8 0 0 1 12 7a4.8 4.8 0 0 1 8 3.8C20 16.1 12 21 12 21Z",
    size,
  );
const PinIcon = () => svg("M14 3l7 7-3 1-4 4 1 5-2 1-4-5-5 5-1-1 5-5-5-4 1-2 5 1 4-4 1-3Z", 10);
const QueueIcon = () => svg("M3 5h18v2H3V5Zm0 6h12v2H3v-2Zm0 6h12v2H3v-2Z", 15);
const VolumeIcon = () =>
  svg("M4 9v6h4l5 4V5L8 9H4Zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4Z", 15);
const NoteIcon = () => svg("M9 3v11.55A4 4 0 1 0 11 18V7h8V3H9Z", 64);
const ClockIcon = () =>
  svg(
    // A ring with hands. Filled at this size the disc swallows the cut-outs and
    // the whole glyph renders as a dot.
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm1 3h-2v6h5v-2h-3V7Z",
    13,
  );

/** Spotify's mark, which their developer terms ask for alongside their data. */
const SpotifyMark = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <circle cx="12" cy="12" r="12" fill={GREEN} />
    <path
      d="M6.2 9.4c3.9-1.2 8.4-.8 11.6 1.2M6.8 12.6c3.2-.9 6.8-.6 9.6 1M7.4 15.6c2.6-.7 5.2-.5 7.4.8"
      stroke="#000"
      strokeWidth="1.6"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);
