"use client";

import { RoundedBox } from "@react-three/drei";
import { useMemo } from "react";
import { Quaternion, Vector3 } from "three";

import * as M from "./materials";
import { GLASS } from "./teaShape";

/**
 * The visitor's right hand, for the first-person view: capsules for the finger
 * bones, a rounded block for the palm, a forearm running off the bottom of the
 * frame into a dark sleeve. Two grips, each built in the frame of the thing
 * it holds so the fingers meet it where it actually is.
 */

/** One bone: a capsule from `a` to `b`. */
function Bone({
  a,
  b,
  r,
}: {
  a: [number, number, number];
  b: [number, number, number];
  r: number;
}) {
  const { position, quaternion, length } = useMemo(() => {
    const va = new Vector3(...a);
    const vb = new Vector3(...b);
    const dir = vb.clone().sub(va);
    const length = dir.length();
    return {
      position: va.clone().add(vb).multiplyScalar(0.5),
      quaternion: new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        dir.normalize(),
      ),
      length,
    };
  }, [a, b]);
  return (
    <mesh position={position} quaternion={quaternion}>
      <capsuleGeometry args={[r, length, 6, 12]} />
      <meshStandardMaterial {...M.SKIN} />
    </mesh>
  );
}

/** Forearm from the wrist off-screen, into a sleeve. `dir` need not be unit. */
function Forearm({
  wrist,
  dir,
}: {
  wrist: [number, number, number];
  dir: [number, number, number];
}) {
  const d = new Vector3(...dir).normalize();
  const at = (k: number): [number, number, number] => [
    wrist[0] + d.x * k,
    wrist[1] + d.y * k,
    wrist[2] + d.z * k,
  ];
  return (
    <>
      <Bone a={wrist} b={at(0.09)} r={0.021} />
      {/* The sleeve: a dark hoodie cuff, then the arm runs out of frame. */}
      <SleeveTube a={at(0.07)} b={at(0.42)} />
    </>
  );
}

function SleeveTube({
  a,
  b,
}: {
  a: [number, number, number];
  b: [number, number, number];
}) {
  const { position, quaternion, length } = useMemo(() => {
    const va = new Vector3(...a);
    const vb = new Vector3(...b);
    const dir = vb.clone().sub(va);
    return {
      position: va.clone().add(vb).multiplyScalar(0.5),
      quaternion: new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        dir.clone().normalize(),
      ),
      length: dir.length(),
    };
  }, [a, b]);
  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[0.034, 0.04, length, 16]} />
      <meshStandardMaterial {...M.SLEEVE} />
    </mesh>
  );
}

/* -------------------------------------------------------------------------
 * Round the tea glass
 * ---------------------------------------------------------------------- */

/** The glass's outside radius at height y, off the outward half of its profile. */
function glassRadius(y: number) {
  const outside = GLASS.slice(0, 12);
  for (let i = 1; i < outside.length; i++) {
    const [r0, y0] = outside[i - 1];
    const [r1, y1] = outside[i];
    if (y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0 || 1);
  }
  return outside[outside.length - 1][0];
}

/**
 * A point round the glass at angle `a` (radians, 0 = +X, increasing toward the
 * back, -Z), `out` beyond its surface.
 */
const around = (
  a: number,
  y: number,
  out: number,
): [number, number, number] => {
  const r = glassRadius(y) + out;
  return [r * Math.cos(a), y, -r * Math.sin(a)];
};

const deg = (d: number) => (d * Math.PI) / 180;

/** A finger wrapped round the glass: three bones following its curve. */
function WrapFinger({
  y,
  from,
  length,
  r,
}: {
  y: number;
  from: number;
  length: number;
  r: number;
}) {
  const span = length / (glassRadius(y) + r);
  const cuts = [0, 0.45, 0.77, 1].map((k) => from + span * k);
  const radii = [r, r * 0.94, r * 0.86];
  return (
    <>
      {radii.map((rr, i) => (
        <Bone
          key={i}
          a={around(cuts[i], y, rr * 0.92)}
          b={around(cuts[i + 1], y, rr * 0.92)}
          r={rr}
        />
      ))}
    </>
  );
}

/**
 * Holding the tea glass from the right: palm against its right side, four
 * fingers curled round the back, thumb across the front. Glass frame: base at
 * the origin, Y up, the viewer toward +Z.
 */
export function GlassHand() {
  // Knuckles just right of the glass's right side; fingers fan slightly.
  const fingers = [
    { y: 0.066, from: deg(-14), length: 0.066, r: 0.0076 },
    { y: 0.049, from: deg(-10), length: 0.073, r: 0.008 },
    { y: 0.032, from: deg(-8), length: 0.068, r: 0.0076 },
    { y: 0.017, from: deg(-6), length: 0.054, r: 0.0069 },
  ];

  // The palm runs from the knuckles toward the viewer along the glass's side.
  const a = deg(-10);
  const knuckle = around(a, 0.045, 0.012);
  const tangent: [number, number, number] = [Math.sin(a), 0, Math.cos(a)];
  const radial: [number, number, number] = [Math.cos(a), 0, -Math.sin(a)];
  const palm: [number, number, number] = [
    knuckle[0] + tangent[0] * 0.038 + radial[0] * 0.004,
    knuckle[1],
    knuckle[2] + tangent[2] * 0.038 + radial[2] * 0.004,
  ];
  const wrist: [number, number, number] = [
    knuckle[0] + tangent[0] * 0.08 + radial[0] * 0.01,
    0.035,
    knuckle[2] + tangent[2] * 0.08 + radial[2] * 0.01,
  ];

  return (
    <group>
      {fingers.map((f) => (
        <WrapFinger key={f.y} {...f} />
      ))}
      <RoundedBox
        args={[0.07, 0.07, 0.022]}
        radius={0.011}
        smoothness={3}
        position={palm}
        rotation={[0, a - Math.PI / 2, 0]}
      >
        <meshStandardMaterial {...M.SKIN} />
      </RoundedBox>
      {/* Thumb: the pad of muscle at its root, then across the front. */}
      <Bone
        a={[palm[0] - 0.004, 0.03, palm[2] + 0.01]}
        b={around(deg(-62), 0.062, 0.011)}
        r={0.0125}
      />
      <Bone
        a={around(deg(-62), 0.062, 0.011)}
        b={around(deg(-92), 0.066, 0.0095)}
        r={0.0102}
      />
      <Bone
        a={around(deg(-92), 0.066, 0.0095)}
        b={around(deg(-112), 0.068, 0.0088)}
        r={0.0094}
      />
      <Forearm wrist={wrist} dir={[0.35, -0.5, 0.8]} />
    </group>
  );
}

/* -------------------------------------------------------------------------
 * Round the cigarette
 * ---------------------------------------------------------------------- */

/** One finger as a chain: up +Y, each joint bending toward the palm (+Z). */
function ChainFinger({
  at,
  rot,
  lengths,
  r,
  curl,
}: {
  at: [number, number, number];
  rot: [number, number, number];
  lengths: [number, number, number];
  r: number;
  curl: [number, number, number];
}) {
  const [l1, l2, l3] = lengths;
  const seg = (l: number, rr: number) => (
    <mesh position={[0, l / 2, 0]}>
      <capsuleGeometry args={[rr, l, 6, 12]} />
      <meshStandardMaterial {...M.SKIN} />
    </mesh>
  );
  return (
    <group position={at} rotation={[rot[0] + curl[0], rot[1], rot[2]]}>
      {seg(l1, r)}
      <group position={[0, l1, 0]} rotation={[curl[1], 0, 0]}>
        {seg(l2, r * 0.94)}
        <group position={[0, l2, 0]} rotation={[curl[2], 0, 0]}>
          {seg(l3, r * 0.86)}
        </group>
      </group>
    </group>
  );
}

/**
 * Holding a cigarette between the index and middle fingers. Built in a hand
 * frame — fingers up +Y, palm facing +Z, index toward -X — then turned so the
 * cigarette (lying along +X, filter at the origin) passes through the gap
 * between those two fingers, filter on the palm side.
 */
export function CigaretteHand() {
  return (
    // Drawn at 0.85: the gap between index and middle finger, at (-0.017,
    // 0.05) in the hand's frame, lands on the filter at x = 0.016.
    <group
      position={[0.016, -0.0425, 0.0145]}
      rotation={[0, -Math.PI / 2, 0]}
      scale={0.85}
    >
      <ChainFinger
        at={[-0.027, 0, 0]}
        rot={[0, 0, 0.08]}
        lengths={[0.042, 0.026, 0.02]}
        r={0.0088}
        curl={[0.12, 0.22, 0.18]}
      />
      <ChainFinger
        at={[-0.008, 0.002, 0]}
        rot={[0, 0, -0.04]}
        lengths={[0.046, 0.028, 0.021]}
        r={0.0092}
        curl={[0.1, 0.2, 0.16]}
      />
      <ChainFinger
        at={[0.011, 0, 0]}
        rot={[0, 0, -0.08]}
        lengths={[0.043, 0.027, 0.02]}
        r={0.0087}
        curl={[1.1, 1.35, 0.9]}
      />
      <ChainFinger
        at={[0.027, -0.004, 0]}
        rot={[0, 0, -0.14]}
        lengths={[0.034, 0.021, 0.018]}
        r={0.0078}
        curl={[1.15, 1.35, 0.9]}
      />
      {/* Thumb, from the heel of the palm, resting toward the curled fingers. */}
      <ChainFinger
        at={[-0.036, -0.055, 0.012]}
        rot={[0.4, 0.2, -0.75]}
        lengths={[0.032, 0.028, 0.024]}
        r={0.0108}
        curl={[0.2, 0.3, 0.25]}
      />
      <RoundedBox
        args={[0.082, 0.088, 0.026]}
        radius={0.011}
        smoothness={3}
        position={[0, -0.046, 0]}
      >
        <meshStandardMaterial {...M.SKIN} />
      </RoundedBox>
      <Forearm wrist={[0.004, -0.085, -0.004]} dir={[0.1, -1, -0.35]} />
    </group>
  );
}
