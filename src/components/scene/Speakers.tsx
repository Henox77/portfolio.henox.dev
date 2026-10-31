"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  CanvasTexture,
  DoubleSide,
  ExtrudeGeometry,
  LatheGeometry,
  Shape,
  ShapeGeometry,
  Vector2,
  type Group,
  type MeshStandardMaterial,
  type PointLight,
} from "three";

import { DESK, SHELF } from "@/lib/layout";
import { useScene } from "@/lib/store";

import * as M from "./materials";

/**
 * Car-audio speakers, modelled on the owner's own builds.
 *
 * On the shelf: a slim panel leaning back against the wall — four equal mids in
 * a row with a tweeter at each end, its top edge swelling into a lobe over each
 * driver. On the desk: a carpeted sub box with a square woofer and a red-lined
 * slot port, front-firing so it's seen from the seat.
 *
 * While Spotify reports a track playing, the cones pump and the amber light
 * flashes on the beat. Spotify no longer gives third-party apps a track's
 * tempo, so the beat is a steady kick at a typical tempo rather than the
 * song's own.
 */

/** A kick drum at 118 BPM, which sits under most of what anyone plays. */
const BPM = 118;

/** 1 on the kick, falling away fast — the shape of a woofer's punch. */
function kick(t: number): number {
  const phase = (t * BPM) / 60;
  const f = phase - Math.floor(phase);
  // Every fourth beat lands softer, so it isn't a metronome.
  const accent = Math.floor(phase) % 4 === 3 ? 0.55 : 1;
  return Math.exp(-f * 7) * accent;
}

/**
 * Drives a set of cones, LEDs and one light from the shared kick, and hands
 * back ref callbacks to attach them by. `travel` is how far the cones move in
 * their parent's units; `idle` and `flash` the LEDs' resting and on-beat levels.
 */
function usePump({
  travel,
  idle,
  flash,
  lightIdle,
  lightFlash,
}: Record<string, number>) {
  const playing = useScene((s) => s.musicPlaying);
  const level = useRef(0);
  const cones = useRef<(Group | null)[]>([]);
  const leds = useRef<(MeshStandardMaterial | null)[]>([]);
  const light = useRef<PointLight>(null);

  useFrame(({ clock }, dt) => {
    // Eased in and out, so pausing the music doesn't stop the room dead.
    level.current += ((playing ? 1 : 0) - level.current) * Math.min(1, dt * 3);
    const k = kick(clock.elapsedTime) * level.current;

    for (const c of cones.current) if (c) c.position.y = k * travel;
    for (const m of leds.current) if (m) m.emissiveIntensity = idle + k * flash;
    if (light.current) light.current.intensity = lightIdle + k * lightFlash;
  });

  // Ref callbacks built here rather than in the caller, which may not write
  // into a hook's refs during render.
  const cone = (i: number) => (g: Group | null) => void (cones.current[i] = g);
  const led = (i: number) => (m: MeshStandardMaterial | null) =>
    void (leds.current[i] = m);

  return { cone, led, light };
}

/** Revolved about Y and turned to face +Z, so a point's y is how far it stands proud. */
const lathe = (points: [number, number][], segments = 48) =>
  new LatheGeometry(
    points.map(([r, y]) => new Vector2(r, y)),
    segments,
  );

/** A rounded rectangle, centred on the origin. */
function roundedRect(w: number, h: number, r: number): Shape {
  const s = new Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/* -------------------------------------------------------------------------
 * The shelf panel
 * ---------------------------------------------------------------------- */

/** Unit-radius driver parts, scaled per speaker. */
function useDriverGeometry() {
  const geo = useMemo(
    () => ({
      // A slim polished trim ring — a bright outline round a black cone.
      ring: lathe([
        [0.86, 0],
        [0.88, 0.04],
        [0.95, 0.055],
        [0.99, 0.045],
        [1, 0.02],
        [1, 0],
      ]),
      // Wide machined ring for the tweeters.
      wideRing: lathe([
        [0.62, 0],
        [0.65, 0.05],
        [0.8, 0.07],
        [0.95, 0.08],
        [1, 0.04],
        [1, 0],
      ]),
      // The cone, dished back from just inside the surround.
      cone: lathe([
        [0.82, 0.0],
        [0.7, -0.05],
        [0.45, -0.12],
        [0.27, -0.16],
      ]),
      cap: lathe(
        [
          [0.28, -0.16],
          [0.26, -0.09],
          [0.19, -0.04],
          [0.09, -0.015],
          [0, -0.01],
        ],
        32,
      ),
      dome: lathe(
        [
          [0.62, 0.01],
          [0.5, 0.12],
          [0.28, 0.2],
          [0, 0.23],
        ],
        32,
      ),
      bullet: lathe(
        [
          [0.22, 0.18],
          [0.18, 0.45],
          [0.08, 0.6],
          [0, 0.64],
        ],
        24,
      ),
    }),
    [],
  );
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);
  return geo;
}

type DriverGeometry = ReturnType<typeof useDriverGeometry>;

/**
 * How far a driver sits proud of its baffle, in driver radii, so the deepest
 * point of the cone is still in front of the panel. The panel is solid with no
 * hole cut in it; a flush cone would be drawn inside it and hidden.
 */
const PROUD = 0.18;

/** A mid: slim chrome ring, black cone, emblem on the dust cap. */
function Mid({
  geo,
  coneRef,
}: {
  geo: DriverGeometry;
  coneRef: React.Ref<Group>;
}) {
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh geometry={geo.ring}>
        <meshStandardMaterial {...M.CHROME} side={DoubleSide} />
      </mesh>
      <group ref={coneRef}>
        <mesh position={[0, 0.005, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.84, 0.035, 10, 56]} />
          <meshStandardMaterial {...M.RUBBER} />
        </mesh>
        <mesh geometry={geo.cone}>
          <meshStandardMaterial {...M.SPEAKER_CONE} side={DoubleSide} />
        </mesh>
        <mesh geometry={geo.cap}>
          <meshStandardMaterial {...M.DUST_CAP} side={DoubleSide} />
        </mesh>
        {/* The small white maker's emblem on the cap, as in the build. */}
        <mesh position={[0, -0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.13, 0.08]} />
          <meshStandardMaterial {...M.EMBLEM} />
        </mesh>
      </group>
    </group>
  );
}

function Tweeter({ geo }: { geo: DriverGeometry }) {
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh geometry={geo.wideRing}>
        <meshStandardMaterial {...M.CHROME} side={DoubleSide} />
      </mesh>
      <mesh geometry={geo.dome}>
        <meshStandardMaterial {...M.DUST_CAP} side={DoubleSide} />
      </mesh>
      <mesh geometry={geo.bullet}>
        <meshStandardMaterial {...M.CHROME} side={DoubleSide} />
      </mesh>
    </group>
  );
}

/** Height of every driver's centre above the panel's bottom edge. */
const CY = 0.085;
/** Four equal mids, nearly touching, as in the build. */
const MIDS = [-0.228, -0.076, 0.076, 0.228].map((x) => ({ x, r: 0.072 }));
/** The left tweeter is the bigger of the two. */
const TWEETERS = [
  { x: -0.357, r: 0.04 },
  { x: 0.342, r: 0.031 },
];
/** How far the panel's edge stands out round each driver. */
const LOBE = 0.012;

const PANEL_DEPTH = 0.05;
const PANEL_BEVEL = 0.008;
/** Leaning back against the wall, the way the build stands on its seat. */
const PANEL_LEAN = 0.45;

/**
 * The panel's outline: a straight bottom, and a top that swells into a lobe
 * over every driver, dipping between them. Each lobe is an arc round its
 * driver; Shape joins one arc's end to the next one's start.
 */
function panelShape(): Shape {
  const drivers = [...TWEETERS, ...MIDS].sort((a, b) => b.x - a.x);
  const first = drivers[0];
  const last = drivers[drivers.length - 1];
  const rad = (d: number) => (d * Math.PI) / 180;

  const s = new Shape();
  const lastR = last.r + LOBE;
  const firstR = first.r + LOBE;
  s.moveTo(last.x - lastR * 0.5, 0);
  s.lineTo(first.x + firstR * 0.5, 0);
  drivers.forEach((d, i) => {
    const R = d.r + LOBE;
    const start = i === 0 ? -60 : 25;
    const end = i === drivers.length - 1 ? 240 : 155;
    s.absarc(d.x, CY, R, rad(start), rad(end), false);
  });
  s.closePath();
  return s;
}

export function Speakers() {
  const geo = useDriverGeometry();
  const { cone, light } = usePump({
    travel: 0.035,
    idle: 0,
    flash: 0,
    lightIdle: 0.9,
    lightFlash: 1.4,
  });

  const panel = useMemo(() => {
    const inner = PANEL_DEPTH - PANEL_BEVEL * 2;
    const g = new ExtrudeGeometry(panelShape(), {
      depth: inner,
      bevelEnabled: true,
      bevelThickness: PANEL_BEVEL,
      bevelSize: PANEL_BEVEL,
      bevelSegments: 3,
      curveSegments: 20,
    });
    // Centred front to back, so the face is at +PANEL_DEPTH / 2.
    g.translate(0, PANEL_BEVEL, -inner / 2);
    return g;
  }, []);
  useEffect(() => () => panel.dispose(), [panel]);

  // Standing at the back of the shelf, top resting against the wall.
  const y = SHELF.y + SHELF.thickness / 2;
  const z = SHELF.z - 0.03;
  const face = PANEL_DEPTH / 2 + 0.001;

  return (
    <group position={[SHELF.x, y, z]} rotation={[-PANEL_LEAN, 0, 0]}>
      <mesh geometry={panel} castShadow receiveShadow>
        <meshStandardMaterial {...M.SPEAKER_PANEL} />
      </mesh>

      <group position={[0, PANEL_BEVEL, face]}>
        {MIDS.map(({ x, r }, i) => (
          <group key={x} position={[x, CY, PROUD * r]} scale={r}>
            <Mid geo={geo} coneRef={cone(i)} />
          </group>
        ))}
        {TWEETERS.map(({ x, r }) => (
          <group key={x} position={[x, CY, PROUD * r]} scale={r}>
            <Tweeter geo={geo} />
          </group>
        ))}
      </group>

      {/* The backlight: an LED strip behind the panel, washing the wall amber.
          One light — every light is paid for on every pixel of the room. */}
      <pointLight
        ref={light}
        // At the top edge, a few centimetres off the wall: a halo on the wall,
        // with the cones turned away from it. Leaning back, anything further
        // "behind" in the panel's own frame ends up behind the wall.
        position={[0, 0.2, 0.02]}
        color={M.AMBER_HEX}
        distance={1.1}
        decay={2}
        intensity={0.9}
      />
    </group>
  );
}

/* -------------------------------------------------------------------------
 * The subwoofer
 * ---------------------------------------------------------------------- */

const SUB_BOX = { w: 0.46, h: 0.34, d: 0.38 } as const;
/** The square woofer's frame, and where it sits on the front baffle. */
const WOOFER = { size: 0.27, x: -0.045, y: 0 } as const;
/** The slot port down the right of the baffle, lined in red. */
const PORT = { w: 0.06, h: 0.27, x: 0.172 } as const;

/** Desk, back right, turned toward the seat. */
const SUB_POS = { x: 0.96, z: -0.07, yaw: -0.32 } as const;

/** The silver centre cap with the "S" on it. */
function capTexture(): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(54, 50, 6, 64, 64, 64);
  g.addColorStop(0, "#f2f4f6");
  g.addColorStop(1, "#9aa1a8");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(64, 64, 64, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#26292d";
  ctx.font = "italic 900 92px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("S", 66, 70);
  return new CanvasTexture(c);
}

function useSubGeometry() {
  const geo = useMemo(() => {
    const surroundShape = roundedRect(0.245, 0.245, 0.04);
    surroundShape.holes.push(roundedRect(0.205, 0.205, 0.028));
    const ledShape = roundedRect(
      WOOFER.size + 0.022,
      WOOFER.size + 0.022,
      0.03,
    );
    ledShape.holes.push(
      roundedRect(WOOFER.size + 0.008, WOOFER.size + 0.008, 0.024),
    );
    return {
      frame: new ExtrudeGeometry(roundedRect(WOOFER.size, WOOFER.size, 0.026), {
        depth: 0.008,
        bevelEnabled: true,
        bevelThickness: 0.003,
        bevelSize: 0.003,
        bevelSegments: 2,
      }),
      surround: new ExtrudeGeometry(surroundShape, {
        depth: 0.006,
        bevelEnabled: true,
        bevelThickness: 0.006,
        bevelSize: 0.004,
        bevelSegments: 4,
      }),
      cone: new ShapeGeometry(roundedRect(0.206, 0.206, 0.028), 8),
      led: new ShapeGeometry(ledShape, 8),
    };
  }, []);
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);
  return geo;
}

/** The ribs moulded into the cone, radiating from the cap like a star. */
const RIBS = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2);

export function Subwoofer() {
  const geo = useSubGeometry();
  const cap = useMemo(() => capTexture(), []);
  useEffect(() => () => cap.dispose(), [cap]);
  // No light of its own: a second point light cost a quarter of the frame
  // rate on integrated graphics. The LED frame and the cone carry it.
  const { cone, led } = usePump({
    travel: 0.012,
    idle: 1.4,
    flash: 3.2,
    lightIdle: 0,
    lightFlash: 0,
  });

  const front = SUB_BOX.d / 2 + 0.001;

  return (
    <group
      position={[SUB_POS.x, DESK.surfaceY + SUB_BOX.h / 2 + 0.012, SUB_POS.z]}
      rotation={[0, SUB_POS.yaw, 0]}
    >
      <RoundedBox
        args={[SUB_BOX.w, SUB_BOX.h, SUB_BOX.d]}
        radius={0.014}
        smoothness={4}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial {...M.SPEAKER_PANEL} />
      </RoundedBox>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh
            key={`${sx}${sz}`}
            position={[
              sx * (SUB_BOX.w / 2 - 0.04),
              -SUB_BOX.h / 2 - 0.006,
              sz * (SUB_BOX.d / 2 - 0.04),
            ]}
          >
            <cylinderGeometry args={[0.018, 0.02, 0.012, 16]} />
            <meshStandardMaterial {...M.RUBBER} />
          </mesh>
        )),
      )}

      {/* The woofer, on the baffle. */}
      <group position={[WOOFER.x, WOOFER.y, front]}>
        <mesh geometry={geo.led} position={[0, 0, 0.001]}>
          <meshStandardMaterial ref={led(0)} {...M.AMBER_LED} />
        </mesh>
        <mesh geometry={geo.frame} castShadow>
          <meshStandardMaterial {...M.BOLT} />
        </mesh>
        {/* Bolts at the corners and mid-sides of the frame. */}
        {[-1, 0, 1].flatMap((ix) =>
          [-1, 0, 1]
            .filter((iy) => ix !== 0 || iy !== 0)
            .map((iy) => (
              <mesh
                key={`${ix}${iy}`}
                position={[ix * 0.121, iy * 0.121, 0.013]}
                rotation={[Math.PI / 2, 0, 0]}
              >
                <cylinderGeometry args={[0.0045, 0.0045, 0.004, 8]} />
                <meshStandardMaterial {...M.CHROME} />
              </mesh>
            )),
        )}

        {/* Everything that moves, in one group the kick drives. Its "y" is
            along the woofer's axis, so it's turned to face +Z. */}
        <group rotation={[Math.PI / 2, 0, 0]}>
          <group ref={cone(0)}>
            <group rotation={[-Math.PI / 2, 0, 0]}>
              <mesh geometry={geo.surround} position={[0, 0, 0.012]}>
                <meshStandardMaterial {...M.RUBBER} />
              </mesh>
              <mesh geometry={geo.cone} position={[0, 0, 0.013]}>
                <meshStandardMaterial {...M.SUB_CONE} side={DoubleSide} />
              </mesh>
              {RIBS.map((a) => (
                <mesh
                  key={a}
                  position={[Math.cos(a) * 0.056, Math.sin(a) * 0.056, 0.016]}
                  rotation={[0, 0, a]}
                >
                  <boxGeometry args={[0.07, 0.007, 0.006]} />
                  <meshStandardMaterial {...M.RUBBER} />
                </mesh>
              ))}
              <mesh position={[0, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.03, 0.032, 0.012, 40]} />
                <meshStandardMaterial {...M.CHROME} />
              </mesh>
              <mesh position={[0, 0, 0.0262]}>
                <circleGeometry args={[0.03, 40]} />
                <meshStandardMaterial
                  map={cap}
                  roughness={0.35}
                  metalness={0.1}
                />
              </mesh>
            </group>
          </group>
        </group>
      </group>

      {/* The slot port: a red-lined opening down the right of the baffle. */}
      <group position={[PORT.x, 0, front]}>
        <mesh position={[0, 0, 0.0005]}>
          <planeGeometry args={[PORT.w - 0.012, PORT.h - 0.012]} />
          <meshStandardMaterial color="#020203" roughness={1} />
        </mesh>
        {[
          [0, PORT.h / 2 - 0.003, PORT.w, 0.006],
          [0, -PORT.h / 2 + 0.003, PORT.w, 0.006],
          [PORT.w / 2 - 0.003, 0, 0.006, PORT.h],
          [-PORT.w / 2 + 0.003, 0, 0.006, PORT.h],
        ].map(([x, y, w, h]) => (
          <mesh key={`${x}${y}`} position={[x, y, 0.004]}>
            <boxGeometry args={[w, h, 0.008]} />
            <meshStandardMaterial {...M.PORT_RED} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
