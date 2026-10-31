import {
  CanvasTexture,
  Color,
  LatheGeometry,
  Vector2,
  type Mesh,
  type MeshStandardMaterial,
} from "three";

/**
 * The tea glass's shape and the tea in it, shared by the glass on the saucer
 * and the one in the visitor's hand — they are the same glass, so they read
 * one level.
 */

/**
 * Revolved about Y; X is radius. Up the outside, over the rim, back down the
 * inside — a closed profile with a real wall, and the heavy base a tea glass
 * actually has.
 */
export const GLASS: [number, number][] = [
  [0.0, 0.0],
  [0.026, 0.0],
  [0.028, 0.004],
  [0.0285, 0.012],
  [0.031, 0.026], // the belly
  [0.03, 0.04],
  [0.025, 0.052],
  [0.0225, 0.06], // the waist
  [0.0245, 0.07],
  [0.03, 0.088],
  [0.034, 0.104],
  [0.0355, 0.112], // flared lip
  [0.0345, 0.1125], // over the rim
  [0.0335, 0.111],
  [0.0325, 0.103],
  [0.0285, 0.087],
  [0.0225, 0.069],
  [0.0205, 0.06],
  [0.023, 0.051],
  [0.028, 0.039],
  [0.029, 0.026],
  [0.0265, 0.014],
  [0.02, 0.009],
  [0.0, 0.0085], // floor of the cavity
];

/** Filled to a finger below the lip, the way it's poured. */
export const TEA_LEVEL = 0.095;
/** The lip, where a pour aims. */
export const GLASS_TOP = 0.112;

/**
 * A hair inside the glass all the way up, so the tea never z-fights the wall
 * it sits behind.
 */
export const TEA: [number, number][] = [
  [0.0, 0.0092],
  [0.0195, 0.0097],
  [0.0257, 0.014],
  [0.0282, 0.026],
  [0.0272, 0.039],
  [0.0222, 0.051],
  [0.0197, 0.06],
  [0.0217, 0.069],
  [0.0277, 0.087],
  [0.0297, TEA_LEVEL],
];

/** Below this the glass reads as empty: what's left is the film on the base. */
export const EMPTY_LEVEL = 0.0115;
/** Four sips to the bottom, which is about what a tea glass is. */
export const SIP = (TEA_LEVEL - EMPTY_LEVEL) / 4;

/**
 * The tea, outside React: read and written every frame by both glasses.
 * `level` eases toward `target`, which sips and pours move.
 */
export const tea = {
  level: TEA_LEVEL,
  target: TEA_LEVEL,
  /**
   * How far the glass has been let down with water: 0 is neat dem, nearly
   * black; 1 is tea as drunk, the red of "tavşan kanı".
   */
  tint: 1,
};

/** Neat dem and finished tea, for the body and its top surface. */
export const TEA_COLORS = {
  body: { dem: "#240602", tea: "#7c1d08" },
  surface: { dem: "#3a1105", tea: "#a8411a" },
} as const;

const BODY = [new Color(TEA_COLORS.body.dem), new Color(TEA_COLORS.body.tea)];
const SURFACE = [
  new Color(TEA_COLORS.surface.dem),
  new Color(TEA_COLORS.surface.tea),
];

/** Colours a glass's tea by how far it's been let down with water. */
export function tintTea(body: Mesh | null, surface: Mesh | null) {
  const t = Math.min(1, Math.max(0, tea.tint));
  if (body)
    (body.material as MeshStandardMaterial).color.lerpColors(
      BODY[0],
      BODY[1],
      t,
    );
  if (surface)
    (surface.material as MeshStandardMaterial).color.lerpColors(
      SURFACE[0],
      SURFACE[1],
      t,
    );
}

/** 0..1, how full the glass is right now. */
export const teaFullness = () =>
  (tea.level - EMPTY_LEVEL) / (TEA_LEVEL - EMPTY_LEVEL);

/** The tea's radius at height y, read off its own profile. */
export function teaRadius(y: number): number {
  for (let i = 1; i < TEA.length; i++) {
    const [r0, y0] = TEA[i - 1];
    const [r1, y1] = TEA[i];
    if (y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0 || 1);
  }
  return TEA[TEA.length - 1][0];
}

export const lathe = (points: [number, number][], segments: number) =>
  new LatheGeometry(
    points.map(([x, y]) => new Vector2(x, y)),
    segments,
  );

/** A soft round puff, shared by steam and smoke. */
export function puffTexture(): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(0.45, "rgba(255,255,255,0.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new CanvasTexture(c);
}
