"use client";

import { useCursor } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import {
  DoubleSide,
  Vector3,
  type Group,
  type Mesh,
  type MeshStandardMaterial,
} from "three";

import { useHeld } from "@/lib/held";

import * as M from "./materials";
import { emitSmoke } from "./Smoke";
import { lathe } from "./teaShape";

/**
 * A short Parliament: white paper, the white filter with the recess at the
 * mouth end that the brand is known for, a hairline silver band where filter
 * meets paper. It burns down as you smoke it, an ember at the end that flares
 * when you draw, ash ahead of it.
 *
 * Scaled up a sixth, like everything small on the desk.
 */

const S = 1.16;
export const CIG_R = 0.0039 * S;
const FILTER = 0.027 * S;
/** Paper from the band to the tip, unburnt. 84 mm overall. */
const PAPER = 0.057 * S;
/** How much paper is left when it's smoked down to the filter. */
const STUB = 0.008 * S;
const ASH_LEN = 0.0035 * S;
const EMBER_LEN = 0.0022 * S;

/**
 * The cigarette, outside React: how far it has burnt (0..1), what's in the
 * lungs, and how hard the ember is glowing — read by the one on the ashtray
 * and the one in the hand.
 */
export const cig = { burn: 0, lungs: 0, glow: 1 };

/** Distance from the filter's mouth end to the burning tip, for the current burn. */
export const cigLength = () =>
  FILTER + STUB + (PAPER - STUB) * (1 - cig.burn) + EMBER_LEN + ASH_LEN;

/**
 * The model, lying along +X with the filter's mouth end at the origin. Keeps
 * itself in step with `cig` every frame; `emberRef` is where smoke leaves.
 */
export const CigaretteModel = forwardRef<
  Group,
  {
    /** Self-lit a little: in the hand there's no lamp near enough to light it. */
    lift?: boolean;
  }
>(function CigaretteModel({ lift = false }, emberRef) {
  const paperMat = lift ? M.CIG_PAPER_LIT : M.CIG_PAPER;
  const filterMat = lift ? M.CIG_FILTER_LIT : M.CIG_FILTER;
  const paper = useRef<Mesh>(null);
  const tip = useRef<Group>(null);
  const ember = useRef<MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    const len = (PAPER - STUB) * (1 - cig.burn) + STUB;
    if (paper.current) {
      paper.current.scale.y = len;
      paper.current.position.x = FILTER + len / 2;
    }
    if (tip.current) tip.current.position.x = FILTER + len;
    if (ember.current) {
      // A coal never glows evenly: a slow breathing plus a fast crackle.
      const t = clock.elapsedTime;
      const flicker =
        0.85 + Math.sin(t * 2.3) * 0.08 + Math.sin(t * 17.1) * 0.07;
      ember.current.emissiveIntensity = cig.glow * flicker;
    }
  });

  return (
    <group>
      {/* Filter: white tube, and the recess sunk into its mouth end. */}
      <mesh position={[FILTER / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[CIG_R, CIG_R, FILTER, 20]} />
        <meshStandardMaterial {...filterMat} />
      </mesh>
      <mesh position={[0.0025, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry
          args={[CIG_R * 0.72, CIG_R * 0.72, 0.005, 20, 1, true]}
        />
        <meshStandardMaterial {...M.CIG_RECESS} side={DoubleSide} />
      </mesh>
      <mesh position={[-0.0002, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <ringGeometry args={[CIG_R * 0.72, CIG_R, 24]} />
        <meshStandardMaterial {...filterMat} side={DoubleSide} />
      </mesh>
      <mesh position={[0.005, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <circleGeometry args={[CIG_R * 0.72, 20]} />
        <meshStandardMaterial {...M.CIG_RECESS} />
      </mesh>
      {/* The hairline band where filter meets paper. */}
      <mesh position={[FILTER, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[CIG_R * 1.01, CIG_R * 1.01, 0.0009, 20]} />
        <meshStandardMaterial {...M.CIG_BAND} />
      </mesh>
      {/* Paper: a unit-length cylinder, stretched to what's left of it. */}
      <mesh ref={paper} rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[CIG_R, CIG_R, 1, 20]} />
        <meshStandardMaterial {...paperMat} />
      </mesh>
      {/* The burning end: the coal, then the ash it leaves. */}
      <group ref={tip}>
        <mesh position={[EMBER_LEN / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[CIG_R * 0.97, CIG_R, EMBER_LEN, 20]} />
          <meshStandardMaterial ref={ember} {...M.EMBER} />
        </mesh>
        <mesh
          position={[EMBER_LEN + ASH_LEN / 2, 0, 0]}
          rotation={[0, 0, -Math.PI / 2]}
        >
          <cylinderGeometry args={[CIG_R * 0.8, CIG_R * 0.95, ASH_LEN, 16]} />
          <meshStandardMaterial {...M.ASH} />
        </mesh>
        <group ref={emberRef} position={[EMBER_LEN + ASH_LEN, 0, 0]} />
      </group>
    </group>
  );
});

/** A heavy round glass ashtray with three rests cut into the rim. */
const ASHTRAY: [number, number][] = [
  [0, 0],
  [0.05, 0],
  [0.056, 0.004],
  [0.058, 0.02],
  [0.056, 0.026],
  [0.046, 0.026],
  [0.042, 0.01],
  [0, 0.009],
];

/**
 * On the desk: the ashtray, two old butts, and the cigarette resting in a notch
 * with a thread of smoke going up from it. Click it to pick it up.
 */
export function Ashtray({
  position,
  yaw = 0,
}: {
  position: [number, number, number];
  yaw?: number;
}) {
  const geo = useMemo(() => lathe(ASHTRAY, 40), []);
  useEffect(() => () => geo.dispose(), [geo]);

  const inHand = useHeld((s) => s.item === "cigarette");
  const [hovered, setHovered] = useState(false);
  useCursor(hovered && !inHand);

  const ember = useRef<Group>(null);
  const at = useMemo(() => new Vector3(), []);
  const since = useRef(0);

  useFrame((_, dt) => {
    if (inHand) return;
    // Left in the ashtray it smoulders slowly on its own.
    cig.burn = Math.min(0.92, cig.burn + dt * 0.0008);
    cig.glow += (1.1 - cig.glow) * Math.min(1, dt * 2);
    since.current += dt;
    if (since.current > 0.11 && ember.current) {
      since.current = 0;
      ember.current.getWorldPosition(at);
      emitSmoke({
        at,
        velocity: [0, 0.035, 0],
        life: 4,
        size: [0.004, 0.035],
        alpha: 0.22,
        wander: 0.5,
        drag: 0.6,
      });
    }
  });

  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial {...M.ASHTRAY_GLASS} side={DoubleSide} />
      </mesh>
      {/* Ash in the well. */}
      <mesh position={[0, 0.0095, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.034, 24]} />
        <meshStandardMaterial {...M.ASH} />
      </mesh>
      {/* Two butts from earlier, filters up. */}
      {[
        [0.012, -0.014, 0.6],
        [-0.016, 0.01, 2.4],
      ].map(([x, z, r]) => (
        <group key={r} position={[x, 0.0125, z]} rotation={[0, r, 0.08]}>
          <mesh rotation={[0, 0, -Math.PI / 2]}>
            <cylinderGeometry args={[CIG_R, CIG_R, FILTER + 0.006, 16]} />
            <meshStandardMaterial {...M.CIG_FILTER} />
          </mesh>
        </group>
      ))}

      {/* The cigarette in a rest: filter out past the rim, burning end over
          the well, dipping slightly toward it. */}
      <group
        visible={!inHand}
        position={[0.072, 0.029, 0]}
        rotation={[0, Math.PI, -0.12]}
        onClick={(e) => {
          e.stopPropagation();
          if (!inHand) useHeld.getState().pick("cigarette");
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <CigaretteModel ref={ember} />
      </group>
    </group>
  );
}
