"use client";

import { useCursor } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import {
  CatmullRomCurve3,
  TubeGeometry,
  Vector3,
  type Group,
  type Mesh,
} from "three";

import { useHeld } from "@/lib/held";

import * as M from "./materials";
import { emitSmoke } from "./Smoke";
import { EMPTY_LEVEL, GLASS_TOP, lathe, tea, TEA_LEVEL } from "./teaShape";

/**
 * A Turkish çaydanlık: the big kettle of hot water below, the small demlik of
 * brewed tea sitting on it. Stainless, the way most of them are.
 *
 * An empty glass set back on its saucer is refilled the way it's done at a
 * real table: dem from the demlik first, then hot water from the kettle.
 */

const KETTLE: [number, number][] = [
  [0, 0],
  [0.062, 0],
  [0.068, 0.004],
  [0.074, 0.03],
  [0.075, 0.06],
  [0.07, 0.09],
  [0.058, 0.108],
  [0.046, 0.116],
  [0.046, 0.122],
  [0, 0.122],
];

/** Where the demlik sits: on the kettle's neck. */
export const KETTLE_TOP = 0.122;

const POT: [number, number][] = [
  [0, 0],
  [0.036, 0],
  [0.04, 0.004],
  [0.05, 0.03],
  [0.05, 0.05],
  [0.042, 0.07],
  [0.032, 0.078],
  [0.032, 0.082],
  [0, 0.082],
];

/** The demlik's spout tip, in its own frame: where a pour leaves from. */
export const POT_SPOUT_TIP = new Vector3(0.083, 0.075, 0);

const tube = (points: [number, number, number][], radius: number) =>
  new TubeGeometry(
    new CatmullRomCurve3(points.map(([x, y, z]) => new Vector3(x, y, z))),
    24,
    radius,
    10,
    false,
  );

function useKettleGeometry() {
  const geo = useMemo(
    () => ({
      body: lathe(KETTLE, 48),
      spout: tube(
        [
          [0.064, 0.03, 0],
          [0.09, 0.058, 0],
          [0.104, 0.092, 0],
          [0.11, 0.11, 0],
        ],
        0.0068,
      ),
    }),
    [],
  );
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);
  return geo;
}

function usePotGeometry() {
  const geo = useMemo(
    () => ({
      body: lathe(POT, 40),
      spout: tube(
        [
          [0.046, 0.024, 0],
          [0.066, 0.04, 0],
          [0.078, 0.06, 0],
          [POT_SPOUT_TIP.x, POT_SPOUT_TIP.y, 0],
        ],
        0.0046,
      ),
    }),
    [],
  );
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);
  return geo;
}

/**
 * A handle: half a torus standing out on the -X side, opposite the spout, its
 * ends on the body at `x`. Rolled a quarter turn so the half sweeps from top
 * to bottom.
 */
function Handle({
  x,
  y,
  r,
  tube: t,
}: {
  x: number;
  y: number;
  r: number;
  tube: number;
}) {
  return (
    <mesh position={[x, y, 0]} rotation={[0, 0, Math.PI / 2]}>
      <torusGeometry args={[r, t, 8, 24, Math.PI]} />
      <meshStandardMaterial {...M.BAKELITE} />
    </mesh>
  );
}

/** The demlik: the small pot of brewed tea. Origin at its base. */
export const DemlikPot = forwardRef<
  Group,
  {
    /** Self-lit a little, for the hand, where no lamp reaches. */
    lift?: boolean;
  }
>(function DemlikPot({ lift = false }, ref) {
  const steel = lift ? M.STEEL_LIT : M.STEEL;
  const geo = usePotGeometry();
  return (
    <group ref={ref}>
      <mesh geometry={geo.body} castShadow>
        <meshStandardMaterial {...steel} />
      </mesh>
      <mesh geometry={geo.spout} castShadow>
        <meshStandardMaterial {...steel} />
      </mesh>
      {/* Lid seam and knob. */}
      <mesh position={[0, 0.079, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.031, 0.0012, 6, 40]} />
        <meshStandardMaterial {...M.BAKELITE} />
      </mesh>
      <mesh position={[0, 0.09, 0]} castShadow>
        <sphereGeometry args={[0.009, 16, 12]} />
        <meshStandardMaterial {...M.BAKELITE} />
      </mesh>
      <Handle x={-0.046} y={0.042} r={0.022} tube={0.004} />
    </group>
  );
});

function Kettle() {
  const geo = useKettleGeometry();
  return (
    <group>
      <mesh geometry={geo.body} castShadow receiveShadow>
        <meshStandardMaterial {...M.STEEL} />
      </mesh>
      <mesh geometry={geo.spout} castShadow>
        <meshStandardMaterial {...M.STEEL} />
      </mesh>
      <Handle x={-0.071} y={0.066} r={0.034} tube={0.0055} />
    </group>
  );
}

/* -------------------------------------------------------------------------
 * The pour
 * ---------------------------------------------------------------------- */

/** The kettle's spout tip, in its own frame. */
const KETTLE_SPOUT_TIP = new Vector3(0.11, 0.11, 0);

/** The saucer's well and the glass's lip, above the desk. */
const WELL_Y = 0.0055;
const LIP_Y = WELL_Y + GLASS_TOP;

/** How far each tips to pour, and where its spout ends up once it has. */
const POT_TILT = -0.95;
const KETTLE_TILT = -0.85;
const tipAfterTilt = (tip: Vector3, a: number) => ({
  x: tip.x * Math.cos(a) - tip.y * Math.sin(a),
  y: tip.x * Math.sin(a) + tip.y * Math.cos(a),
});

const ease = (t: number) => t * t * (3 - 2 * t);
/** 0 before `a`, 1 after `b`, eased between. */
const seg = (t: number, a: number, b: number) =>
  ease(Math.min(1, Math.max(0, (t - a) / (b - a))));
const mix = (a: number, b: number, k: number) => a + (b - a) * k;

/**
 * The order tea is made in a glass: dem first, from the demlik, about two
 * fifths of the way; the demlik set aside; then hot water from the kettle to
 * the top, which takes the colour from near-black to red. Then everything
 * goes back where it lives. Times in seconds.
 */
const T = {
  potUp: [0, 0.5],
  potOver: [0.5, 1.1],
  potTilt: [1.1, 1.5],
  dem: [1.5, 3.0],
  potUntilt: [3.0, 3.4],
  potPark: [3.4, 4.2],
  kettleUp: [4.2, 4.8],
  kettleOver: [4.8, 5.4],
  kettleTilt: [5.4, 5.8],
  water: [5.8, 7.6],
  kettleUntilt: [7.6, 8.0],
  kettleHome: [8.0, 8.8],
  potHome: [8.8, 9.6],
} as const;
const END = 9.6;

/** Where the demlik waits while the kettle pours: on the desk beside it. */
const PARK = { x: -0.02, z: 0.17 };

/**
 * On the desk, beside the glass. Set an empty glass down and it makes you
 * another; click it to top up a glass that's on its saucer.
 */
export function Demlik({
  position,
  yaw,
  glass,
}: {
  position: [number, number, number];
  yaw: number;
  /** The tea glass's saucer, in world space, so the pour can find it. */
  glass: [number, number, number];
}) {
  const pouring = useHeld((s) => s.pouring);
  const item = useHeld((s) => s.item);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered && !pouring && item !== "tea");

  // The glass in this group's own frame: undo the yaw on the offset.
  const at = useMemo(() => {
    const dx = glass[0] - position[0];
    const dz = glass[2] - position[2];
    const c = Math.cos(-yaw);
    const s = Math.sin(-yaw);
    return { x: dx * c + dz * s, z: -dx * s + dz * c };
  }, [glass, position, yaw]);

  const pot = useRef<Group>(null);
  const kettle = useRef<Group>(null);
  const potTip = useRef<Group>(null);
  const kettleTip = useRef<Group>(null);
  const root = useRef<Group>(null);
  const demStream = useRef<Mesh>(null);
  const waterStream = useRef<Mesh>(null);
  const seq = useRef<{
    t: number;
    l0: number;
    tint0: number;
    demLevel: number;
    started: { dem: boolean; water: boolean };
    steam: number;
  } | null>(null);

  const start = () => {
    if (seq.current) return;
    seq.current = {
      t: 0,
      l0: tea.level,
      tint0: tea.tint,
      demLevel: tea.level,
      started: { dem: false, water: false },
      steam: 0,
    };
    useHeld.getState().setPouring(true);
  };

  // An empty glass set back on its saucer: make another, after a beat.
  const prevItem = useRef(item);
  useEffect(() => {
    const was = prevItem.current;
    prevItem.current = item;
    if (was === "tea" && item === null && tea.target <= EMPTY_LEVEL + 1e-4) {
      const id = setTimeout(start, 500);
      return () => clearTimeout(id);
    }
  });

  useFrame((_, rawDt) => {
    const s = seq.current;
    const p = pot.current;
    const k = kettle.current;
    const r = root.current;
    if (!s || !p || !k || !r) return;
    const dt = Math.min(rawDt, 0.05);
    s.t += dt;
    const t = s.t;

    // The demlik: up, over the glass, tip, pour, back, set down, home.
    const potTipped = tipAfterTilt(POT_SPOUT_TIP, POT_TILT);
    const pOver = { x: at.x - potTipped.x, y: LIP_Y + 0.05 - potTipped.y };
    const up = seg(t, ...T.potUp);
    const over = seg(t, ...T.potOver);
    const park = seg(t, ...T.potPark);
    const home = seg(t, ...T.potHome);
    let px = mix(0, pOver.x, over);
    let py = mix(KETTLE_TOP, 0.24, up);
    py = mix(py, pOver.y, over);
    let pz = mix(0, at.z, over);
    px = mix(px, PARK.x, park);
    pz = mix(pz, PARK.z, park);
    py = mix(py, 0, park) + Math.sin(park * Math.PI) * 0.08;
    px = mix(px, 0, home);
    pz = mix(pz, 0, home);
    py = mix(py, KETTLE_TOP, home) + Math.sin(home * Math.PI) * 0.1;
    p.position.set(px, py, pz);
    p.rotation.z = POT_TILT * (seg(t, ...T.potTilt) - seg(t, ...T.potUntilt));

    // The kettle: up, over, tip, pour, back down home.
    const kTipped = tipAfterTilt(KETTLE_SPOUT_TIP, KETTLE_TILT);
    const kOver = { x: at.x - kTipped.x, y: LIP_Y + 0.05 - kTipped.y };
    const kUp = seg(t, ...T.kettleUp);
    const kOv = seg(t, ...T.kettleOver);
    const kHome = seg(t, ...T.kettleHome);
    let kx = mix(0, kOver.x, kOv);
    let ky = mix(0, 0.2, kUp);
    ky = mix(ky, kOver.y, kOv);
    let kz = mix(0, at.z, kOv);
    kx = mix(kx, 0, kHome);
    kz = mix(kz, 0, kHome);
    ky = mix(ky, 0, kHome) + Math.sin(kHome * Math.PI) * 0.06;
    k.position.set(kx, ky, kz);
    k.rotation.z =
      KETTLE_TILT * (seg(t, ...T.kettleTilt) - seg(t, ...T.kettleUntilt));

    // The tea: dem to two fifths of what's missing, then water to the top.
    const demOn = t > T.dem[0] && t < T.dem[1];
    const waterOn = t > T.water[0] && t < T.water[1];
    if (demOn && !s.started.dem) {
      s.started.dem = true;
      s.l0 = tea.level;
      s.tint0 = tea.tint;
      tea.target = s.l0 + (TEA_LEVEL - s.l0) * 0.4;
    }
    if (s.started.dem && !s.started.water) {
      const span = Math.max(1e-4, tea.target - s.l0);
      tea.tint = mix(s.tint0, 0, Math.min(1, (tea.level - s.l0) / span));
    }
    if (waterOn && !s.started.water) {
      s.started.water = true;
      s.demLevel = tea.level;
      tea.target = TEA_LEVEL;
    }
    if (s.started.water) {
      const span = Math.max(1e-4, TEA_LEVEL - s.demLevel);
      tea.tint = Math.min(1, (tea.level - s.demLevel) / span);
    }

    // The streams, from each spout's tip down to the surface of the tea.
    stream(r, demStream.current, potTip.current, demOn, at);
    stream(r, waterStream.current, kettleTip.current, waterOn, at);

    // Hot water steams on the way down.
    if (waterOn && kettleTip.current) {
      s.steam += dt;
      if (s.steam > 0.05) {
        s.steam = 0;
        kettleTip.current.getWorldPosition(scratch.a);
        emitSmoke({
          at: scratch.a,
          velocity: [0, 0.05, 0],
          life: 1.8,
          size: [0.01, 0.07],
          alpha: 0.22,
          wander: 0.6,
          drag: 0.8,
        });
      }
    }

    if (t >= END) {
      seq.current = null;
      tea.tint = 1;
      useHeld.getState().setPouring(false);
    }
  });

  return (
    <group
      ref={root}
      position={position}
      rotation={[0, yaw, 0]}
      onClick={(e) => {
        e.stopPropagation();
        // Only into a glass that's on its saucer and wants it.
        if (useHeld.getState().item === "tea") return;
        if (tea.target < TEA_LEVEL - 0.004) start();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <group ref={kettle}>
        <Kettle />
        <group ref={kettleTip} position={KETTLE_SPOUT_TIP.toArray()} />
      </group>
      <group ref={pot} position={[0, KETTLE_TOP, 0]}>
        <DemlikPot />
        <group ref={potTip} position={POT_SPOUT_TIP.toArray()} />
      </group>

      <mesh ref={demStream} visible={false}>
        <cylinderGeometry args={[0.0017, 0.0022, 1, 10, 1, true]} />
        <meshStandardMaterial {...M.DEM_STREAM} />
      </mesh>
      <mesh ref={waterStream} visible={false}>
        <cylinderGeometry args={[0.0022, 0.0028, 1, 10, 1, true]} />
        <meshStandardMaterial {...M.WATER_STREAM} />
      </mesh>
    </group>
  );
}

const scratch = {
  a: new Vector3(),
  b: new Vector3(),
  dir: new Vector3(),
  up: new Vector3(0, 1, 0),
};

/** Stretches a unit cylinder from a spout's tip to the tea's surface. */
function stream(
  root: Group,
  mesh: Mesh | null,
  tip: Group | null,
  on: boolean,
  at: { x: number; z: number },
) {
  if (!mesh || !tip) return;
  mesh.visible = on;
  if (!on) return;
  tip.getWorldPosition(scratch.a);
  root.worldToLocal(scratch.a);
  scratch.b.set(at.x, WELL_Y + Math.max(tea.level, 0.012), at.z);
  scratch.dir.subVectors(scratch.b, scratch.a);
  const len = scratch.dir.length();
  mesh.position.addVectors(scratch.a, scratch.b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(scratch.up, scratch.dir.normalize());
  mesh.scale.set(1, len, 1);
}
