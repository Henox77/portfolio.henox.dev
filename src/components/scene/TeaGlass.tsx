"use client";

import { Billboard, useCursor } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DoubleSide,
  Plane,
  Vector3,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
} from "three";

import { useHeld } from "@/lib/held";

import * as M from "./materials";
import {
  EMPTY_LEVEL,
  GLASS,
  lathe,
  puffTexture,
  tea,
  TEA,
  teaFullness,
  teaRadius,
  tintTea,
} from "./teaShape";

/**
 * An ince belli çay bardağı on its saucer: the thin-waisted tulip glass every
 * Turkish desk has one of, tea the colour the phrase "tavşan kanı" means.
 *
 * Click it and it's in your hand (see Viewmodel); the saucer stays behind. The
 * tea level is shared state, so the glass comes back as empty as you left it —
 * and an empty glass set down is refilled from the çaydanlık (see Demlik).
 *
 * Scaled up by about a fifth: true to size, a 95 mm glass looks like a thimble
 * next to a 27-inch monitor.
 */

/**
 * Cuts the tea body off at the current level. Clipping planes are in world
 * space, so it tracks the glass's world height each frame. Module-level: there
 * is one glass on the saucer, and the plane is mutated every frame outside React.
 */
const TEA_CLIP = new Plane(new Vector3(0, -1, 0), 0);

const WISPS = 9;
/** Where the steam starts: just over the lip, so it never draws inside the glass. */
const STEAM_BASE = 0.108;
const STEAM_RISE = 0.15;

/**
 * Steam, as a handful of billboarded puffs on a loop: each rises, drifts,
 * swells and fades, staggered so there's always one leaving the lip. Thinner as
 * the glass empties, because a cooling half-glass barely steams.
 */
function Steam() {
  const texture = useMemo(() => puffTexture(), []);
  useEffect(() => () => texture.dispose(), [texture]);
  const wisps = useRef<(Group | null)[]>([]);
  const mats = useRef<(MeshBasicMaterial | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const full = Math.max(0, teaFullness());
    for (let i = 0; i < WISPS; i++) {
      const w = wisps.current[i];
      const m = mats.current[i];
      if (!w || !m) continue;
      const p = (t * 0.22 + i / WISPS) % 1;
      w.position.set(
        Math.sin(p * 5 + i * 1.7) * 0.007 * (1 + p * 2),
        STEAM_BASE + p * STEAM_RISE,
        Math.cos(p * 4 + i) * 0.004 * (1 + p),
      );
      w.scale.setScalar(0.026 + p * 0.07);
      m.opacity = Math.sin(p * Math.PI) * 0.34 * full;
    }
  });

  return (
    <group>
      {Array.from({ length: WISPS }, (_, i) => (
        <group key={i} ref={(g) => void (wisps.current[i] = g)}>
          <Billboard>
            <mesh raycast={() => null} renderOrder={2}>
              <planeGeometry args={[1, 1]} />
              <meshBasicMaterial
                ref={(m) => void (mats.current[i] = m)}
                map={texture}
                color="#f4f1ec"
                transparent
                opacity={0}
                depthWrite={false}
              />
            </mesh>
          </Billboard>
        </group>
      ))}
    </group>
  );
}

/**
 * Porcelain saucer: a foot ring, a shallow well the glass sits in, and a rim
 * that turns up. Closed underneath so it has thickness from the seat.
 */
const SAUCER: [number, number][] = [
  [0.0, 0.002],
  [0.035, 0.002],
  [0.037, 0.0],
  [0.042, 0.0],
  [0.05, 0.004],
  [0.062, 0.011],
  [0.064, 0.0125],
  [0.0625, 0.0135],
  [0.049, 0.0075],
  [0.034, 0.0055],
  [0.0, 0.0055],
];

/** Where the glass stands: the floor of the saucer's well. */
const WELL_Y = 0.0055;

export function TeaGlass({ position }: { position: [number, number, number] }) {
  const geo = useMemo(
    () => ({
      glass: lathe(GLASS, 64),
      tea: lathe(TEA, 48),
      saucer: lathe(SAUCER, 56),
    }),
    [],
  );
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);

  const inHand = useHeld((s) => s.item === "tea");
  const [hovered, setHovered] = useState(false);
  useCursor(hovered && !inHand);

  const base = useRef<Group>(null);
  const surface = useRef<Mesh>(null);
  const body = useRef<Mesh>(null);
  const world = useMemo(() => new Vector3(), []);

  // Local clipping is off by default on the renderer. Through the store rather
  // than the hook's return value, which React treats as frozen.
  const get = useThree((s) => s.get);
  useEffect(() => {
    get().gl.localClippingEnabled = true;
  }, [get]);

  useFrame((_, dt) => {
    // The one place the level eases toward its target, for both glasses.
    // Sipping is quick, pouring is slower and fuller.
    const rate = tea.target > tea.level ? 1.6 : 6;
    tea.level +=
      (tea.target - tea.level) * (1 - Math.exp(-rate * Math.min(dt, 0.1)));

    base.current?.getWorldPosition(world);
    TEA_CLIP.constant = world.y + tea.level;
    tintTea(body.current, surface.current);

    const visible = tea.level > EMPTY_LEVEL + 0.0008;
    if (body.current) body.current.visible = visible;
    if (surface.current) {
      surface.current.visible = visible;
      surface.current.position.y = tea.level;
      surface.current.scale.setScalar(teaRadius(tea.level));
    }
  });

  return (
    <group position={position}>
      <mesh geometry={geo.saucer} castShadow receiveShadow>
        <meshStandardMaterial {...M.CERAMIC} side={DoubleSide} />
      </mesh>
      {/* The red band round the rim that makes it this saucer and not any saucer. */}
      <mesh position={[0, 0.0118, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.0598, 0.0011, 8, 64]} />
        <meshStandardMaterial {...M.RED_GLAZE} />
      </mesh>

      <group
        ref={base}
        position={[0, WELL_Y, 0]}
        visible={!inHand}
        onClick={(e) => {
          e.stopPropagation();
          // Not mid-pour: you don't take a glass from under the spout.
          const held = useHeld.getState();
          if (!inHand && !held.pouring) held.pick("tea");
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        {/*
          The tea goes down first so it draws before the see-through glass.
          Not shadow-casting: a glass that throws an opaque shadow of its
          contents is the fastest way to make glass look like paint.
        */}
        <mesh ref={body} geometry={geo.tea}>
          <meshStandardMaterial {...M.TEA} clippingPlanes={[TEA_CLIP]} />
        </mesh>
        <mesh ref={surface} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1, 40]} />
          <meshStandardMaterial {...M.TEA_SURFACE} />
        </mesh>
        <mesh geometry={geo.glass} castShadow>
          <meshPhysicalMaterial {...M.GLASS} />
        </mesh>
        <Steam />
      </group>

      {/* Teaspoon resting across the saucer, bowl toward the glass. */}
      <group position={[0.012, 0.0105, 0.046]} rotation={[0, -0.5, 0.06]}>
        <mesh
          position={[0.024, 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <cylinderGeometry args={[0.0011, 0.0016, 0.05, 8]} />
          <meshStandardMaterial {...M.ALUMINIUM} />
        </mesh>
        <mesh position={[-0.006, 0.0005, 0]} scale={[1.4, 0.35, 1]} castShadow>
          <sphereGeometry args={[0.0055, 16, 10]} />
          <meshStandardMaterial {...M.ALUMINIUM} />
        </mesh>
      </group>

      {/* One sugar cube, because nobody takes it plain at a desk. */}
      <mesh
        position={[-0.044, 0.0122, -0.012]}
        rotation={[0, 0.4, 0]}
        castShadow
      >
        <boxGeometry args={[0.011, 0.011, 0.011]} />
        <meshStandardMaterial {...M.SUGAR} />
      </mesh>
    </group>
  );
}
