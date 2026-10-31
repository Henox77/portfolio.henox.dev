"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  NormalBlending,
  ShaderMaterial,
  Vector3,
  type Points,
} from "three";

import { puffTexture } from "./teaShape";

/**
 * Every wisp of smoke in the room — the cigarette's own thread, an exhaled
 * cloud, a ring — is a particle in one pool, drawn as soft points in a single
 * draw call. Particles drift with their velocity, which decays like air drag,
 * rise like warm air, wander on a cheap turbulence, swell, and fade.
 *
 * The pool is module state: anything in the scene emits into it by calling
 * `emitSmoke`/`emitRing`, and `<SmokeField />` owns the update and the draw.
 */

const MAX = 600;

const pos = new Float32Array(MAX * 3);
const vel = new Float32Array(MAX * 3);
const age = new Float32Array(MAX).fill(1);
const life = new Float32Array(MAX).fill(1);
const size0 = new Float32Array(MAX);
const size1 = new Float32Array(MAX);
const alpha0 = new Float32Array(MAX);
const turb = new Float32Array(MAX);
const drag = new Float32Array(MAX);
const seed = new Float32Array(MAX).map(() => Math.random() * 100);
/** Per-draw attributes, refreshed every frame from the state above. */
const drawSize = new Float32Array(MAX);
const drawAlpha = new Float32Array(MAX);

let next = 0;

interface Puff {
  at: Vector3 | [number, number, number];
  velocity?: [number, number, number];
  /** Seconds. */
  life?: number;
  /** World-space diameter at birth and at death. */
  size?: [number, number];
  alpha?: number;
  /** How much the turbulence pushes it about. Low for rings, which must hold shape. */
  wander?: number;
  /** Per-second velocity decay. */
  drag?: number;
}

export function emitSmoke({
  at,
  velocity = [0, 0.03, 0],
  life: l = 3,
  size = [0.01, 0.06],
  alpha = 0.3,
  wander = 0.6,
  drag: d = 1.2,
}: Puff) {
  const i = next;
  next = (next + 1) % MAX;
  const [x, y, z] = Array.isArray(at) ? at : [at.x, at.y, at.z];
  pos[i * 3] = x;
  pos[i * 3 + 1] = y;
  pos[i * 3 + 2] = z;
  vel[i * 3] = velocity[0];
  vel[i * 3 + 1] = velocity[1];
  vel[i * 3 + 2] = velocity[2];
  age[i] = 0;
  life[i] = l;
  size0[i] = size[0];
  size1[i] = size[1];
  alpha0[i] = alpha;
  turb[i] = wander;
  drag[i] = d;
}

/**
 * A smoke ring: puffs set round a small circle facing `dir`, each moving off
 * along `dir` and slightly outward. Same speed and same drag keep them a ring
 * as it travels; the outward drift is the ring widening as it slows.
 */
export function emitRing(at: Vector3, dir: Vector3, strength = 1) {
  // Two axes across the direction of travel.
  const a = new Vector3(0, 1, 0).cross(dir);
  if (a.lengthSq() < 1e-6) a.set(1, 0, 0);
  a.normalize();
  const b = new Vector3().crossVectors(dir, a).normalize();
  const [ax, ay, az] = [a.x, a.y, a.z];
  const [bx, by, bz] = [b.x, b.y, b.z];

  const n = 22;
  const r = 0.012;
  const speed = 0.42 * strength;
  for (let k = 0; k < n; k++) {
    const t = (k / n) * Math.PI * 2;
    const ox = Math.cos(t) * ax + Math.sin(t) * bx;
    const oy = Math.cos(t) * ay + Math.sin(t) * by;
    const oz = Math.cos(t) * az + Math.sin(t) * bz;
    emitSmoke({
      at: [at.x + ox * r, at.y + oy * r, at.z + oz * r],
      velocity: [
        dir.x * speed + ox * 0.05,
        dir.y * speed + oy * 0.05 + 0.01,
        dir.z * speed + oz * 0.05,
      ],
      life: 4.2,
      size: [0.012, 0.034],
      alpha: 0.42,
      wander: 0.05,
      drag: 0.42,
    });
  }
}

export function SmokeField() {
  const size = useThree((s) => s.size);
  const camera = useThree((s) => s.camera);
  const dpr = useThree((s) => s.viewport.dpr);

  const { geometry, material } = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    g.setAttribute("aSize", new BufferAttribute(drawSize, 1));
    g.setAttribute("aAlpha", new BufferAttribute(drawAlpha, 1));
    const m = new ShaderMaterial({
      uniforms: {
        uMap: { value: puffTexture() },
        uScale: { value: 1 },
      },
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute float aAlpha;
        uniform float uScale;
        varying float vAlpha;
        void main() {
          vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aAlpha > 0.0 ? aSize * uScale / -mv.z : 0.0;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        varying float vAlpha;
        void main() {
          float a = texture2D(uMap, gl_PointCoord).a * vAlpha;
          if (a < 0.004) discard;
          // Bluish-grey, the colour of smoke against a dark room.
          gl_FragColor = vec4(vec3(0.8, 0.81, 0.85), a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
    });
    return { geometry: g, material: m };
  }, []);

  useEffect(
    () => () => {
      geometry.dispose();
      (material.uniforms.uMap.value as { dispose(): void }).dispose();
      material.dispose();
    },
    [geometry, material],
  );

  const points = useRef<Points>(null);

  useFrame(({ clock }, rawDt) => {
    const pts = points.current;
    if (!pts) return;
    const dt = Math.min(rawDt, 0.05);
    const t = clock.elapsedTime;
    // Pixels per world unit at distance 1, so sizes stay in metres.
    const fov = "fov" in camera ? (camera.fov as number) : 50;
    (pts.material as ShaderMaterial).uniforms.uScale.value =
      (size.height * dpr) / (2 * Math.tan((fov * Math.PI) / 360));

    for (let i = 0; i < MAX; i++) {
      if (age[i] >= life[i]) {
        drawAlpha[i] = 0;
        continue;
      }
      age[i] += dt;
      const p = age[i] / life[i];
      const k = Math.exp(-drag[i] * dt);
      const s = seed[i];
      const w = turb[i] * 0.02;
      vel[i * 3] = vel[i * 3] * k + Math.sin(t * 1.3 + s) * w * dt * 6;
      vel[i * 3 + 1] = vel[i * 3 + 1] * k + 0.012 * dt; // buoyancy
      vel[i * 3 + 2] =
        vel[i * 3 + 2] * k + Math.cos(t * 1.1 + s * 1.7) * w * dt * 6;
      pos[i * 3] += vel[i * 3] * dt;
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      drawSize[i] = size0[i] + (size1[i] - size0[i]) * Math.sqrt(p);
      // Quick to appear, slow to go.
      drawAlpha[i] = alpha0[i] * Math.min(1, p * 8) * (1 - p) * (1 - p);
    }
    const attrs = pts.geometry.attributes;
    attrs.position.needsUpdate = true;
    attrs.aSize.needsUpdate = true;
    attrs.aAlpha.needsUpdate = true;
  });

  return (
    <points
      ref={points}
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={5}
      raycast={() => null}
    />
  );
}
