"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  DoubleSide,
  MathUtils,
  Plane,
  Vector3,
  type Group,
  type Mesh,
} from "three";

import { useHeld } from "@/lib/held";

import { cig, CigaretteModel } from "./Cigarette";
import { CigaretteHand, GlassHand } from "./Hand";
import * as M from "./materials";
import { emitRing, emitSmoke } from "./Smoke";
import {
  EMPTY_LEVEL,
  GLASS,
  lathe,
  SIP,
  tea,
  TEA,
  teaRadius,
  tintTea,
} from "./teaShape";

/**
 * Whatever's in the visitor's hand, drawn first-person: pinned to the camera,
 * low in the frame, the way a game shows what you're holding.
 *
 * Everything here is in camera space — x right, y up, -z ahead — and is copied
 * onto the camera every frame. The props on the desk hide while their twin is
 * held here, and both read the same shared state (`tea`, `cig`).
 */

type Pose = { p: [number, number, number]; r: [number, number, number] };

const ease = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** Blends two poses into an object, `k` from 0 (a) to 1 (b). */
function applyPose(o: Group, a: Pose, b: Pose, k: number) {
  o.position.set(
    MathUtils.lerp(a.p[0], b.p[0], k),
    MathUtils.lerp(a.p[1], b.p[1], k),
    MathUtils.lerp(a.p[2], b.p[2], k),
  );
  o.rotation.set(
    MathUtils.lerp(a.r[0], b.r[0], k),
    MathUtils.lerp(a.r[1], b.r[1], k),
    MathUtils.lerp(a.r[2], b.r[2], k),
  );
}

/**
 * The last action this hand has played. Module-level, so an action fired
 * before the item was picked up isn't replayed when it mounts.
 */
const handled = { id: 0 };

/** Scratch vectors. One hand, one of each item, so module-level is safe. */
const tv = { world: new Vector3() };
const cv = {
  at: new Vector3(),
  fwd: new Vector3(),
  mouth: new Vector3(),
  down: new Vector3(),
};

/* -------------------------------------------------------------------------
 * The tea glass
 * ---------------------------------------------------------------------- */

/** Turned so the hand is on the glass's right and the tea faces you. */
const GLASS_REST: Pose = { p: [0.12, -0.108, -0.34], r: [0.04, 0.5, 0] };
const GLASS_SIP: Pose = { p: [0.03, -0.095, -0.27], r: [0.85, 0.35, 0] };

const SIP_TIME = 1.4;

/** The glass in the hand's own clipping plane: the tea surface stays level. */
const HAND_CLIP = new Plane(new Vector3(0, -1, 0), 0);

/**
 * The glass in your hand. You drink it here and put it down to have it
 * refilled — the çaydanlık on the desk does that (see Demlik), the way you'd
 * set your glass down for someone to pour.
 */
function TeaInHand() {
  const geo = useMemo(
    () => ({ glass: lathe(GLASS, 64), tea: lathe(TEA, 48) }),
    [],
  );
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);

  const glass = useRef<Group>(null);
  const base = useRef<Group>(null);
  const body = useRef<Mesh>(null);
  const surface = useRef<Mesh>(null);
  const anim = useRef<{ t: number; sipped: boolean } | null>(null);

  const action = useHeld((s) => s.action);
  useEffect(() => {
    if (!action || action.id <= handled.id) return;
    handled.id = action.id;
    if (anim.current) return;
    if (action.name === "sip" && tea.target > EMPTY_LEVEL + 1e-4) {
      anim.current = { t: 0, sipped: false };
      useHeld.getState().setBusy(true);
    }
  }, [action]);

  useEffect(() => {
    useHeld.getState().setTeaEmpty(tea.target <= EMPTY_LEVEL + 1e-4);
  }, []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const g = glass.current;
    if (!g) return;
    const a = anim.current;

    let sipK = 0;
    if (a) {
      a.t += dt;
      const t = a.t;
      sipK =
        t < 0.45
          ? ease(t / 0.45)
          : t < 0.8
            ? 1
            : ease(1 - (t - 0.8) / (SIP_TIME - 0.8));
      if (!a.sipped && t > 0.55) {
        a.sipped = true;
        tea.target = Math.max(EMPTY_LEVEL, tea.target - SIP);
      }
      if (t >= SIP_TIME) {
        anim.current = null;
        const held = useHeld.getState();
        held.setBusy(false);
        held.setTeaEmpty(tea.target <= EMPTY_LEVEL + 1e-4);
      }
    }
    applyPose(g, GLASS_REST, GLASS_SIP, sipK);

    // A level surface in a tilting glass: clip in world space, and drop the
    // flat top disc while it's tipped, since it would tip with the glass.
    base.current?.getWorldPosition(tv.world);
    HAND_CLIP.constant = tv.world.y + tea.level * Math.cos(g.rotation.x);
    const has = tea.level > EMPTY_LEVEL + 0.0008;
    if (body.current) body.current.visible = has;
    if (surface.current) {
      surface.current.visible = has && g.rotation.x < 0.12;
      surface.current.position.y = tea.level;
      surface.current.scale.setScalar(teaRadius(tea.level));
    }
    tintTea(body.current, surface.current);
  });

  return (
    <group ref={glass}>
      <group ref={base}>
        <mesh ref={body} geometry={geo.tea}>
          <meshStandardMaterial
            {...M.TEA}
            side={DoubleSide}
            clippingPlanes={[HAND_CLIP]}
          />
        </mesh>
        <mesh ref={surface} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1, 40]} />
          <meshStandardMaterial {...M.TEA_SURFACE} />
        </mesh>
        <mesh geometry={geo.glass}>
          <meshPhysicalMaterial {...M.GLASS_LIT} />
        </mesh>
        <GlassHand />
      </group>
    </group>
  );
}

/* -------------------------------------------------------------------------
 * The cigarette
 * ---------------------------------------------------------------------- */

/** Held low and to the right, burning end forward and to the left. */
const CIG_REST: Pose = { p: [0.11, -0.1, -0.3], r: [0, 2.3, 0.2] };
/** At the lips: filter toward you, burning end straight out. */
const CIG_MOUTH: Pose = { p: [0.02, -0.08, -0.13], r: [0, Math.PI / 2, 0.12] };
/**
 * At the lips the hand rolls about the cigarette's own axis, so the fingers
 * lie off to the right below the eye line; upright, two fingers fill the view.
 * A separate group, because a pose's Euler angles turn about the camera's axes.
 */
const CIG_ROLL = 1.2;

function CigaretteInHand() {
  const holder = useRef<Group>(null);
  const roller = useRef<Group>(null);
  const ember = useRef<Group>(null);
  const draw = useRef(0);
  const sinceWisp = useRef(0);
  const sinceHud = useRef(0);
  const exhale = useRef({ left: 0, strength: 0 });
  const camera = useThree((s) => s.camera);

  const action = useHeld((s) => s.action);
  useEffect(() => {
    if (!action || action.id <= handled.id) return;
    handled.id = action.id;
    if (action.name === "exhale" && cig.lungs > 0.04) {
      exhale.current = { left: 1.2, strength: cig.lungs };
      cig.lungs = 0;
      useHeld.getState().setLungs(0);
    }
    if (action.name === "ring" && cig.lungs >= 0.08) {
      camera.getWorldDirection(cv.fwd);
      cv.down.set(0, -1, 0);
      cv.mouth
        .copy(camera.position)
        .addScaledVector(cv.fwd, 0.09)
        .addScaledVector(cv.down, 0.035);
      cv.fwd.y += 0.06;
      emitRing(cv.mouth, cv.fwd.normalize(), 0.9 + cig.lungs * 0.3);
      cig.lungs = Math.max(0, cig.lungs - 0.1);
      useHeld.getState().setLungs(cig.lungs);
    }
  }, [action, camera]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const held = useHeld.getState();
    const o = holder.current;
    if (!o) return;

    // To the lips while drawing, back down after.
    draw.current +=
      ((held.inhaling ? 1 : 0) - draw.current) * Math.min(1, dt * 5);
    const toMouth = ease(clamp01(draw.current));
    applyPose(o, CIG_REST, CIG_MOUTH, toMouth);
    if (roller.current) roller.current.rotation.x = CIG_ROLL * toMouth;

    const drawing = held.inhaling && draw.current > 0.85;
    if (drawing) {
      cig.burn = Math.min(1, cig.burn + dt * 0.02);
      cig.lungs = Math.min(1, cig.lungs + dt * 0.45);
    }
    // The coal flares on a draw and settles between.
    cig.glow +=
      ((drawing ? 5 : 1.3) - cig.glow) * Math.min(1, dt * (drawing ? 6 : 1.5));

    sinceHud.current += dt;
    if (sinceHud.current > 0.1) {
      sinceHud.current = 0;
      if (Math.abs(held.lungs - cig.lungs) > 0.01) held.setLungs(cig.lungs);
    }

    // The thread of smoke off the burning end, thinner at the lips (it's being
    // drawn in rather than given off).
    sinceWisp.current += dt;
    if (sinceWisp.current > 0.09 && ember.current) {
      sinceWisp.current = 0;
      ember.current.getWorldPosition(cv.at);
      emitSmoke({
        at: cv.at,
        velocity: [0, 0.03, 0],
        life: 3,
        size: [0.003, 0.03],
        alpha: drawing ? 0.08 : 0.2,
        wander: 0.5,
        drag: 0.6,
      });
    }

    // Breathing out: a cloud leaving the lips over a second or so, strongest
    // at the start, carried forward and spreading.
    const ex = exhale.current;
    if (ex.left > 0) {
      ex.left -= dt;
      camera.getWorldDirection(cv.fwd);
      cv.mouth
        .copy(camera.position)
        .addScaledVector(cv.fwd, 0.08)
        .add(cv.down.set(0, -0.035, 0));
      const k = clamp01(ex.left / 1.2);
      for (let n = 0; n < 3; n++) {
        const sp = 0.07;
        emitSmoke({
          at: cv.mouth,
          velocity: [
            cv.fwd.x * (0.28 + k * 0.3) + (Math.random() - 0.5) * sp,
            cv.fwd.y * (0.28 + k * 0.3) + (Math.random() - 0.5) * sp + 0.01,
            cv.fwd.z * (0.28 + k * 0.3) + (Math.random() - 0.5) * sp,
          ],
          life: 3.2,
          size: [0.03, 0.2],
          alpha: 0.13 * ex.strength * (0.4 + k),
          wander: 0.8,
          drag: 1.1,
        });
      }
    }

    // Smoked to the filter: it goes in the ashtray and a fresh one is there.
    if (cig.burn >= 1) {
      cig.burn = 0;
      held.drop();
    }
  });

  return (
    <group ref={holder}>
      <group ref={roller}>
        <CigaretteModel ref={ember} lift />
        <CigaretteHand />
      </group>
    </group>
  );
}

/* -------------------------------------------------------------------------
 * The hand
 * ---------------------------------------------------------------------- */

export function Viewmodel() {
  const camera = useThree((s) => s.camera);
  const item = useHeld((s) => s.item);
  const anchor = useRef<Group>(null);

  useFrame(() => {
    const a = anchor.current;
    if (!a) return;
    a.position.copy(camera.position);
    a.quaternion.copy(camera.quaternion);
  });

  return (
    <group ref={anchor}>
      {item === "tea" && <TeaInHand />}
      {item === "cigarette" && <CigaretteInHand />}
    </group>
  );
}
