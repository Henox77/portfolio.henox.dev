/**
 * What you can see out of the window: the Bosphorus, with the 15 Temmuz
 * Şehitler Köprüsü crossing it — the near tower big on the right, the span
 * running away to the far tower and the Asian shore beyond, Üsküdar's hillside
 * houses and the Çamlıca tower on the ridge, a vapur on the water, and the
 * rooftops of this side of the city in front.
 *
 * Two textures. The day one is drawn in colour and multiplied by the daylight
 * colour at render time, so one texture covers dawn to midnight. The night one
 * is what's lit, and is redrawn every minute, because what's lit changes by the
 * minute: the bridge comes on at its own time each evening (see lib/bridge),
 * and every window in the city has its own hours.
 *
 * The goal is depth, not detail — anything sharp out there pulls the eye out of
 * the room, which is the opposite of what the window is for.
 */

import { CanvasTexture, LinearFilter, SRGBColorSpace } from "three";

import {
  bridgeColors,
  bridgeLit,
  bridgeOnHour,
  dayKey,
  seeded,
} from "@/lib/bridge";
import { istanbulHours, istanbulSun } from "@/lib/daylight";

const W = 512;
const H = 740;

function surface() {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  return { canvas, ctx: canvas.getContext("2d")! };
}

function texture(canvas: HTMLCanvasElement): CanvasTexture {
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  tex.minFilter = LinearFilter;
  return tex;
}

/* -------------------------------------------------------------------------
 * The view's geometry, shared by day and night so the lights sit on what
 * they light.
 * ---------------------------------------------------------------------- */

/** The far (Asian) shore's waterline, and where this side's rooftops begin. */
const FAR_SHORE = 472;
const NEAR_SHORE = 652;

/**
 * The whole bridge sits this far left of where it was first drawn, so the near
 * tower stands inside the part of the window the room doesn't hide.
 */
const SHIFT = -55;

/** The deck: a straight line falling away to the left, toward the far shore. */
const DECK = { x0: -30, x1: 540 };
const deckY = (x: number) => 458 + (-30 * (x - SHIFT + 20)) / 552;
/** Thicker as it comes nearer. */
const deckT = (x: number) => 2 + Math.min(1, Math.max(0, (x + 20) / 552)) * 5;

const NEAR_TOWER = { x: 411 + SHIFT, top: 262, base: 640, legGap: 13 };
const FAR_TOWER = { x: 110 + SHIFT, top: 395, base: 486, legGap: 5 };

type Pt = [number, number];
type Quad = [Pt, Pt, Pt];

/** Main span, and the two side spans to the anchorages, as quadratic curves. */
const MAIN: Quad = [
  [FAR_TOWER.x, FAR_TOWER.top],
  [259.5 + SHIFT, 547.5],
  [NEAR_TOWER.x, NEAR_TOWER.top],
];
/** Out to the anchorage, past the right edge of the view. */
const SIDE_NEAR: Quad = [
  [NEAR_TOWER.x, NEAR_TOWER.top],
  [450, 345],
  [560, 418],
];
const SIDE_FAR: Quad = [
  [FAR_TOWER.x, FAR_TOWER.top],
  [40 + SHIFT, 438],
  [-25 + SHIFT, 452],
];

const quadAt = ([a, c, b]: Quad, t: number): Pt => [
  (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0],
  (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1],
];

function strokeQuad(ctx: CanvasRenderingContext2D, [a, c, b]: Quad) {
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.quadraticCurveTo(c[0], c[1], b[0], b[1]);
  ctx.stroke();
}

/** The Asian ridge: Çamlıca's two hills, low toward the water at the left. */
function ridgeY(x: number) {
  return (
    FAR_SHORE -
    18 -
    Math.max(0, Math.sin(((x - 150) / 420) * Math.PI)) * 42 -
    Math.max(0, Math.sin(((x - 300) / 180) * Math.PI)) * 16 -
    Math.sin(x * 0.07) * 2
  );
}

/** Houses up the far hillside, fixed for all time. */
function hillHouses() {
  const r = seeded(4211);
  const out: { x: number; y: number; w: number; h: number }[] = [];
  for (let i = 0; i < 420; i++) {
    const x = r() * W;
    const top = ridgeY(x) + 2;
    const y = top + r() * (FAR_SHORE - top - 2);
    out.push({ x, y, w: 2 + r() * 3, h: 1.5 + r() * 2 });
  }
  return out;
}

/** This side's buildings, nearest the window. */
function nearBlocks() {
  const r = seeded(7717);
  const out: { x: number; top: number; w: number }[] = [];
  let x = -10;
  while (x < W + 10) {
    const w = 34 + r() * 52;
    out.push({ x, top: NEAR_SHORE - 6 + r() * 26 - (r() < 0.3 ? 30 : 0), w });
    x += w * (0.8 + r() * 0.3);
  }
  return out;
}

const VAPUR = { x: 176, y: 566, len: 48 };

/* -------------------------------------------------------------------------
 * Day
 * ---------------------------------------------------------------------- */

export function outsideTexture(): CanvasTexture {
  const { canvas, ctx } = surface();

  // Sky: deepest overhead, washing out to the horizon.
  const sky = ctx.createLinearGradient(0, 0, 0, FAR_SHORE);
  sky.addColorStop(0, "#9fc6ea");
  sky.addColorStop(0.6, "#cfe2f3");
  sky.addColorStop(1, "#e8ece8");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, FAR_SHORE);

  // Soft clouds, barely lighter than the sky.
  const clouds = seeded(2207);
  for (let i = 0; i < 6; i++) {
    const cx = clouds() * W;
    const cy = 40 + clouds() * 220;
    const scale = 26 + clouds() * 40;
    ctx.fillStyle = `rgba(255,255,255,${0.28 + clouds() * 0.3})`;
    ctx.beginPath();
    for (let j = 0; j < 5; j++) {
      const r = scale * (0.5 + clouds() * 0.6);
      const x = cx + (j - 2) * scale * 0.62;
      const y = cy - clouds() * scale * 0.3;
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  // The Asian shore: a hazy green ridge, houses packed up its face.
  ctx.fillStyle = "#93a594";
  ctx.beginPath();
  ctx.moveTo(0, FAR_SHORE);
  for (let x = 0; x <= W; x += 4) ctx.lineTo(x, ridgeY(x));
  ctx.lineTo(W, FAR_SHORE);
  ctx.fill();
  for (const h of hillHouses()) {
    ctx.fillStyle = h.x % 3 < 1 ? "#d9d2c4" : h.x % 3 < 2 ? "#e9e4da" : "#c7b9a6";
    ctx.fillRect(h.x, h.y, h.w, h.h);
  }
  // Çamlıca TV tower on the ridge: a needle with a pod.
  const cx = 368;
  const ct = ridgeY(cx);
  ctx.fillStyle = "#7d8a8f";
  ctx.fillRect(cx - 1.5, ct - 74, 3, 74);
  ctx.fillRect(cx - 4, ct - 60, 8, 7);
  ctx.fillRect(cx - 0.6, ct - 96, 1.2, 22);
  // Haze over the far shore: it's two kilometres away.
  ctx.fillStyle = "rgba(220,230,236,0.35)";
  ctx.fillRect(0, ridgeY(W / 2) - 70, W, FAR_SHORE - ridgeY(W / 2) + 70);

  // The Bosphorus.
  const water = ctx.createLinearGradient(0, FAR_SHORE, 0, NEAR_SHORE);
  water.addColorStop(0, "#6f9ab6");
  water.addColorStop(1, "#2f5f80");
  ctx.fillStyle = water;
  ctx.fillRect(0, FAR_SHORE, W, NEAR_SHORE - FAR_SHORE);
  const chop = seeded(911);
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  for (let i = 0; i < 160; i++) {
    const y = FAR_SHORE + 4 + chop() * (NEAR_SHORE - FAR_SHORE - 8);
    const near = (y - FAR_SHORE) / (NEAR_SHORE - FAR_SHORE);
    ctx.fillRect(chop() * W, y, 4 + near * 14, 0.8 + near);
  }

  // A vapur crossing: white hull, a dark band of windows, the yellow funnel.
  ctx.fillStyle = "#f2f0ea";
  ctx.fillRect(VAPUR.x, VAPUR.y, VAPUR.len, 7);
  ctx.fillRect(VAPUR.x + 6, VAPUR.y - 6, VAPUR.len - 14, 6);
  ctx.fillStyle = "#3a4650";
  ctx.fillRect(VAPUR.x + 8, VAPUR.y - 4.5, VAPUR.len - 18, 2.5);
  ctx.fillStyle = "#e0b43a";
  ctx.fillRect(VAPUR.x + VAPUR.len / 2 - 2, VAPUR.y - 12, 4, 6);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(VAPUR.x + VAPUR.len, VAPUR.y + 6, 26, 1.5);

  drawBridge(ctx, "#c9cfd4", "#aeb6bc");

  // This side: rooftops close under the window, and a few trees.
  for (const b of nearBlocks()) {
    ctx.fillStyle = "#a4978a";
    ctx.fillRect(b.x, b.top, b.w, H - b.top);
    // Tiled roof edge.
    ctx.fillStyle = "#9a5a44";
    ctx.fillRect(b.x - 2, b.top - 5, b.w + 4, 6);
    ctx.fillStyle = "rgba(60,70,80,0.35)";
    for (let y = b.top + 12; y < H; y += 16) {
      for (let x = b.x + 6; x < b.x + b.w - 8; x += 13) ctx.fillRect(x, y, 6, 8);
    }
  }
  const trees = seeded(5501);
  ctx.fillStyle = "rgba(58,86,52,0.85)";
  ctx.beginPath();
  for (let x = -10; x < W + 10; x += 20 + trees() * 40) {
    const y = NEAR_SHORE + 14 + trees() * 30;
    const r = 12 + trees() * 12;
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  ctx.fill();

  return texture(canvas);
}

/** The bridge in silhouette: towers, deck, the cables and the hangers. */
function drawBridge(ctx: CanvasRenderingContext2D, steel: string, shade: string) {
  ctx.lineCap = "round";

  // Towers: two legs each, tapering toward the top, with their cross-beams.
  for (const t of [FAR_TOWER, NEAR_TOWER]) {
    const h = t.base - t.top;
    const legW = t === NEAR_TOWER ? 7 : 2.5;
    ctx.fillStyle = steel;
    for (const side of [-1, 1]) {
      const x = t.x + (side * t.legGap) / 2;
      ctx.beginPath();
      ctx.moveTo(x - legW / 2, t.top);
      ctx.lineTo(x + legW / 2, t.top);
      ctx.lineTo(x + legW * 0.7 + side * h * 0.012, t.base);
      ctx.lineTo(x - legW * 0.7 + side * h * 0.012, t.base);
      ctx.fill();
    }
    ctx.fillStyle = shade;
    for (const k of [0, 0.42, 0.78]) {
      const y = t.top + h * k * 0.6;
      ctx.fillRect(t.x - t.legGap / 2 - legW / 2, y, t.legGap + legW, legW * 0.8);
    }
  }

  // Deck.
  ctx.fillStyle = shade;
  ctx.beginPath();
  for (let x = DECK.x0; x <= DECK.x1; x += 8) ctx.lineTo(x, deckY(x));
  for (let x = DECK.x1; x >= DECK.x0; x -= 8) ctx.lineTo(x, deckY(x) + deckT(x));
  ctx.fill();

  // Hangers, from the main cable straight down to the deck.
  ctx.strokeStyle = shade;
  ctx.lineWidth = 0.7;
  for (let i = 1; i < 40; i++) {
    const [x, y] = quadAt(MAIN, i / 40);
    if (deckY(x) - y < 3) continue;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, deckY(x));
    ctx.stroke();
  }

  // Main cables: a pair, a hair apart.
  ctx.strokeStyle = steel;
  for (const [q, w] of [
    [MAIN, 2.2],
    [SIDE_NEAR, 2.6],
    [SIDE_FAR, 1.3],
  ] as [Quad, number][]) {
    ctx.lineWidth = w;
    strokeQuad(ctx, q);
  }
}

/* -------------------------------------------------------------------------
 * Night
 * ---------------------------------------------------------------------- */

/** Is `h` inside [on, off), with `off` allowed to be past midnight? */
function within(h: number, on: number, off: number) {
  return on <= off ? h >= on && h < off : h >= on || h < off;
}

/**
 * Everything lit at `now`. Drawn transparent, faded in over the day layer —
 * that one is multiplied by the sky colour, so anything drawn into it can only
 * be darker than the sky; lit windows have to be laid over the top.
 */
export function nightLightsTexture(now: Date): CanvasTexture {
  const { canvas, ctx } = surface();
  const h = istanbulHours(now);
  const { sunrise } = istanbulSun(now);
  // After midnight, an evening's lights belong to the evening before.
  const hh = h < sunrise ? h + 24 : h;
  const cityOn = bridgeOnHour(now) - 0.5;

  // Each window gets tonight's hours from tonight's seed: when it comes on
  // after dusk, and when it goes off — most by half past three, a few never.
  const today = seeded(dayKey(new Date(now.getTime() - (h < sunrise ? 86_400_000 : 0))));
  const lit = (stays: number) => {
    const on = cityOn + today() * 2.2;
    const off = today() < stays ? 30 : 23 + today() * 4.5;
    return within(hh, on, off) && today() < 0.72;
  };

  // The far hillside: a scatter of warm and cool points.
  for (const p of hillHouses()) {
    if (!lit(0.12)) continue;
    ctx.globalAlpha = 0.5 + today() * 0.5;
    ctx.fillStyle = today() > 0.7 ? "#fff1d6" : "#ffcf8a";
    ctx.fillRect(p.x, p.y, 1.6, 1.4);
  }
  // Streetlights along the far shore road, a dotted line at the water.
  for (let x = 2; x < W; x += 7) {
    if (hh < cityOn) break;
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = "#ffc477";
    ctx.fillRect(x, FAR_SHORE - 2, 1.6, 1.6);
  }
  // Çamlıca tower: aircraft-warning red, and the pod lit.
  if (hh >= cityOn) {
    const ct = ridgeY(368);
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = "#ff4a3d";
    ctx.fillRect(366.5, ct - 98, 3, 3);
    ctx.fillStyle = "#cfe6ff";
    ctx.fillRect(364, ct - 60, 8, 6);
  }

  // The bridge: LEDs on the cables, the deck edge and the towers, in
  // tonight's colours, and their reflection in the water.
  if (bridgeLit(now)) {
    const [a, b] = bridgeColors(now);
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, a);
    grad.addColorStop(1, b);
    ctx.globalAlpha = 1;
    ctx.shadowColor = b;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = grad;
    ctx.lineCap = "round";
    for (const [q, w] of [
      [MAIN, 2.4],
      [SIDE_NEAR, 2.8],
      [SIDE_FAR, 1.5],
    ] as [Quad, number][]) {
      ctx.lineWidth = w;
      strokeQuad(ctx, q);
    }
    // Hangers faint, deck edge bright.
    ctx.lineWidth = 0.6;
    ctx.globalAlpha = 0.5;
    for (let i = 1; i < 40; i++) {
      const [x, y] = quadAt(MAIN, i / 40);
      if (deckY(x) - y < 3) continue;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, deckY(x));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(DECK.x0, deckY(DECK.x0) + 1);
    ctx.lineTo(DECK.x1, deckY(DECK.x1) + 1);
    ctx.stroke();
    // Tower uplights.
    for (const t of [FAR_TOWER, NEAR_TOWER]) {
      ctx.lineWidth = t === NEAR_TOWER ? 3 : 1.2;
      for (const side of [-1, 1]) {
        const x = t.x + (side * t.legGap) / 2;
        ctx.beginPath();
        ctx.moveTo(x, t.top);
        ctx.lineTo(x, deckY(t.x));
        ctx.stroke();
      }
    }
    ctx.shadowBlur = 0;

    // Reflection: broken vertical streaks under the span.
    const ripple = seeded(dayKey(now) + Math.floor(h * 60));
    for (let x = 30; x < W; x += 3) {
      const top = Math.max(FAR_SHORE + 2, deckY(x) + 24);
      for (let y = top; y < NEAR_SHORE; y += 3) {
        if (ripple() > 0.35) continue;
        ctx.globalAlpha = 0.22 * (1 - (y - top) / (NEAR_SHORE - top));
        ctx.fillStyle = ripple() > 0.5 ? a : b;
        ctx.fillRect(x, y, 2 + ripple() * 4, 1);
      }
    }
  }

  // Red aviation lights on the tower tops, whenever it's dark enough to need them.
  if (hh >= cityOn) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ff3b30";
    ctx.fillRect(NEAR_TOWER.x - 2, NEAR_TOWER.top - 3, 4, 3);
    ctx.fillRect(FAR_TOWER.x - 1, FAR_TOWER.top - 2, 2, 2);

    // The vapur's running lights and lit saloon.
    ctx.fillStyle = "#ffe2a8";
    ctx.globalAlpha = 0.9;
    for (let x = VAPUR.x + 9; x < VAPUR.x + VAPUR.len - 10; x += 4) {
      ctx.fillRect(x, VAPUR.y - 4, 2, 2);
    }
  }

  // This side's windows: bigger and warmer, being close.
  for (const blk of nearBlocks()) {
    for (let y = blk.top + 12; y < H; y += 16) {
      for (let x = blk.x + 6; x < blk.x + blk.w - 8; x += 13) {
        if (!lit(0.08)) continue;
        ctx.globalAlpha = 0.55 + today() * 0.4;
        ctx.fillStyle = today() > 0.75 ? "#fff3dc" : "#ffc983";
        ctx.fillRect(x, y, 6, 8);
      }
    }
  }

  ctx.globalAlpha = 1;
  return texture(canvas);
}

/** Whether the night layer needs to be shown even before full dark. */
export const nightLayerForced = bridgeLit;
