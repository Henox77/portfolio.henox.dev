/**
 * One picture, three frames. What makes three frames a triptych rather than
 * three pictures is the subject running *through* the gaps, so it's sliced by
 * texture offsets off a single canvas and the alignment is exact by
 * construction.
 *
 * Source: a still from Scarface (1983) — Al Pacino as Tony Montana — chosen by
 * the site's owner. See public/art/CREDITS.md.
 */

import { CanvasTexture, LinearFilter, SRGBColorSpace } from "three";

export const PANELS = 3;

/** Matches the asset exactly, so the picture is never resampled twice. */
const W = 600;
const H = 389;

const SRC = "/art/scarface.jpg";

/** The frames are sized from this, so the picture is never stretched. */
export const PANEL_ASPECT = W / PANELS / H;

/** A caption and a vignette, and no more. */
function overlay(ctx: CanvasRenderingContext2D) {
  // Bottom left, over the dark of his sleeve, inside the left panel rather
  // than straddling a gap.
  const size = H * 0.03;
  ctx.fillStyle = "rgba(239,230,212,0.85)";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `600 ${size}px ui-sans-serif, system-ui, sans-serif`;
  ctx.letterSpacing = `${size * 0.34}px`;
  ctx.fillText("SCARFACE · 1983", W * 0.03, H * 0.95);
  ctx.letterSpacing = "0px";

  // Darkens the corners a touch, the way a print under a lamp falls off.
  const vign = ctx.createRadialGradient(
    W / 2,
    H / 2,
    H * 0.3,
    W / 2,
    H / 2,
    W * 0.62,
  );
  vign.addColorStop(0, "rgba(10,8,6,0)");
  vign.addColorStop(1, "rgba(10,8,6,0.3)");
  ctx.fillStyle = vign;
  ctx.fillRect(0, 0, W, H);
}

/**
 * Drawn twice, because the picture arrives asynchronously: once dark with the
 * caption, again when the image lands. Awaiting it instead leaves three black
 * rectangles on the wall for the length of the decode.
 */
function triptychCanvas(onReady: () => void): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#121112";
  ctx.fillRect(0, 0, W, H);
  overlay(ctx);

  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0, W, H);
    overlay(ctx);
    onReady();
  };
  img.src = SRC;

  return canvas;
}

/** One texture per frame, each showing its own third of the artwork. */
export function triptychPanels(): CanvasTexture[] {
  const textures: CanvasTexture[] = [];

  const canvas = triptychCanvas(() => {
    // All three share one canvas, and a CanvasTexture caches its upload.
    for (const t of textures) t.needsUpdate = true;
  });

  for (let i = 0; i < PANELS; i++) {
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 8;
    tex.minFilter = LinearFilter;
    tex.repeat.set(1 / PANELS, 1);
    tex.offset.set(i / PANELS, 0);
    textures.push(tex);
  }

  return textures;
}
