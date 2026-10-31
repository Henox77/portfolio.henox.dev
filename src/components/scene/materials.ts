import type { ThreeElements } from "@react-three/fiber";

/**
 * The room's material vocabulary.
 *
 * Material variety sells realism harder than texture resolution does — a scene
 * where everything is 0.5 roughness reads as plastic however good the lighting.
 * Roughness carries almost all of that difference, so these are physically
 * plausible rather than eyeballed.
 */

type Mat = ThreeElements["meshStandardMaterial"];

export const WALNUT: Mat = {
  color: "#4a3527",
  roughness: 0.62,
  metalness: 0,
};

export const POWDER_COAT: Mat = {
  color: "#1b1c1e",
  roughness: 0.78,
  metalness: 0.15,
};

export const ALUMINIUM: Mat = {
  color: "#8d9195",
  roughness: 0.34,
  metalness: 0.92,
};

/** Soft-touch: monitor chassis, keyboard, mouse. */
export const SOFT_PLASTIC: Mat = {
  color: "#17191b",
  roughness: 0.82,
  metalness: 0,
};

export const CERAMIC: Mat = {
  color: "#e6ded1",
  roughness: 0.14,
  metalness: 0,
};

export const FABRIC: Mat = {
  color: "#1e2126",
  roughness: 0.97,
  metalness: 0,
};

/** Warm rather than neutral, so the wall takes the lamp side gold and the
 *  window side blue. A greige landed between the two and read as concrete. */
export const PLASTER: Mat = {
  color: "#b6a795",
  roughness: 0.95,
  metalness: 0,
};

export const PAPER: Mat = {
  color: "#9c9384",
  roughness: 0.94,
  metalness: 0,
};

export const FLOOR: Mat = {
  color: "#15161a",
  roughness: 1,
  metalness: 0,
};

/** Faintly emissive, so the glass reads as powered on before the HTML paints. */
export const SCREEN_GLASS: Mat = {
  color: "#05070a",
  emissive: "#16303a",
  emissiveIntensity: 1,
  roughness: 0.18,
  metalness: 0.1,
};

/** Lighter and drier than the desk, so the two woods read apart. */
export const SHELF_WOOD: Mat = {
  color: "#6b5540",
  roughness: 0.72,
  metalness: 0,
};

/** As a hex, so instanced meshes and emissives can share it. */
export const ACCENT_HEX = "#4ecdc4";

export const KEYBOARD_CASE: Mat = {
  color: "#dedcd8",
  roughness: 0.4,
  metalness: 0.55,
};

/** Mid grey, not white: the plate is the only thing separating one cap from the
 *  next, and white under white turns the key field into a pale slab. */
export const KEYBOARD_PLATE: Mat = {
  color: "#8e908d",
  roughness: 0.7,
  metalness: 0.15,
};

/** Rougher than it looks like it should be — a glossy cap loses its bevel in a
 *  blown specular, and the bevel is what the geometry exists to produce. */
export const KEYCAP: Mat = {
  color: "#efedea",
  roughness: 0.62,
  metalness: 0.03,
};

/** Space and enter. Not the room's teal, which belongs to the screens. */
export const KEY_ACCENT = "#9ed2ea";

/** Deliberately not the keycaps' white: two objects moulded in different
 *  factories never land on the same one, and the eye knows it. */
export const MOUSE_SHELL: Mat = {
  color: "#e2dfd9",
  roughness: 0.68,
  metalness: 0.04,
};

export const GRIP: Mat = {
  color: "#b8b4ad",
  roughness: 0.95,
  metalness: 0,
};

export const PANEL_GAP: Mat = {
  color: "#050607",
  roughness: 1,
  metalness: 0,
};

export const WHEEL: Mat = {
  color: "#3a3d40",
  roughness: 0.72,
  metalness: 0.35,
};

export const LAMP_BODY: Mat = {
  color: "#3a3e42",
  roughness: 0.5,
  metalness: 0.25,
};

/** Brewed dark — "tavşan kanı", rabbit's blood — so it reads red, not brown,
 *  through the glass. */
export const TEA: Mat = {
  color: "#7c1d08",
  roughness: 0.06,
  metalness: 0.05,
};

/** Light skims off the top, which is what says the glass is full, not tinted. */
export const TEA_SURFACE: Mat = {
  color: "#a8411a",
  roughness: 0.04,
  metalness: 0.1,
};

/** The band round a tea saucer's rim. */
export const RED_GLAZE: Mat = {
  color: "#b3141c",
  roughness: 0.2,
  metalness: 0,
};

export const SUGAR: Mat = {
  color: "#f4f1ea",
  roughness: 0.9,
  metalness: 0,
};

/**
 * Metalness is low and has to be: a metal takes its colour from what it
 * reflects, and with the cup's flat face turned at the camera and unlit room
 * behind it, at 0.75 this rendered as a dark disc however light the colour.
 */
export const EARCUP: Mat = {
  color: "#a2a6a9",
  roughness: 0.44,
  metalness: 0.16,
};

/** A step darker than the cup, so the two still separate. */
export const CUSHION: Mat = {
  color: "#71767a",
  roughness: 0.98,
  metalness: 0,
};

export const MESH_FABRIC: Mat = {
  color: "#82878b",
  roughness: 0.96,
  metalness: 0,
};

export const MAT_EDGE: Mat = {
  color: "#15181c",
  roughness: 0.9,
  metalness: 0,
};

/** Dark, deliberately. Off-white against a bright sky is white on white, and
 *  the opening rendered as one blank rectangle with no structure in it. */
export const WINDOW_FRAME: Mat = {
  color: "#26282a",
  roughness: 0.55,
  metalness: 0.1,
};

/** Not the desk legs' powder coat: a frame's faint edge sheen is the only thing
 *  separating three black rectangles from three holes in the wall. */
export const FRAME: Mat = {
  color: "#121316",
  roughness: 0.42,
  metalness: 0.05,
};

export const NOTEBOOK: Mat = {
  color: "#2c3b45",
  roughness: 0.88,
  metalness: 0,
};

export const CLOCK_CASE: Mat = {
  color: "#1a1c1e",
  roughness: 0.6,
  metalness: 0.2,
};

export const CLOCK_FACE: Mat = {
  color: "#f2efe9",
  roughness: 0.8,
  metalness: 0,
};

export const CLOCK_MARK: Mat = {
  color: "#16181a",
  roughness: 0.55,
  metalness: 0.1,
};

export const SOIL: Mat = {
  color: "#241d18",
  roughness: 1,
  metalness: 0,
};

type PhysicalMat = ThreeElements["meshPhysicalMaterial"];

/**
 * The tea glass. Alpha-blended rather than transmissive: real transmission
 * re-renders the whole room into a texture every frame just to refract it
 * through 30 cm² of glass, and on integrated graphics that one object halved
 * the frame rate. At this size the refraction was never visible anyway — the
 * rim highlight and the tea behind it are what read as glass.
 */
export const GLASS: PhysicalMat = {
  color: "#ffffff",
  roughness: 0.05,
  metalness: 0,
  // Reflective at grazing angles, where a glass edge picks up the window and
  // stops the silhouette dissolving into the desk behind it.
  clearcoat: 1,
  clearcoatRoughness: 0.05,
  transparent: true,
  opacity: 0.22,
  // Or the back wall of the glass is culled by its own front wall's depth and
  // the tea shows through only one layer of it.
  depthWrite: false,
};

/**
 * Semi-matte rather than either extreme. At ~55 px on the desk a tile's whole
 * shoulder is three pixels, and a shading gradient across three pixels is
 * invisible where a specular streak along the crown is not. Fully glossy blew a
 * highlight across two tiles at once and took their colour with it.
 */
export const CUBE_PLASTIC: Mat = {
  // White, because the colour arrives per-vertex and gets multiplied by this.
  color: "#ffffff",
  roughness: 0.36,
  metalness: 0,
  envMapIntensity: 1.5,
};

/** Glossier than it looks like it should be: a cable's whole signature is the
 *  specular line down one side, without which it is indistinguishable from a
 *  shadow. Colour arrives per cable. */
export const CABLE: Mat = {
  color: "#ffffff",
  roughness: 0.29,
  metalness: 0.05,
};

export const VELCRO: Mat = {
  color: "#232629",
  roughness: 0.98,
  metalness: 0,
};

/** Chalky and matte — the opposite of the mug, which is also ceramic and must
 *  not look like the same ceramic. */
export const PLANTER_POT: Mat = {
  color: "#b9ac9c",
  roughness: 0.93,
  metalness: 0,
};

/** White, because the colour and veining arrive in the map. */
export const MONSTERA: Mat = {
  color: "#ffffff",
  roughness: 0.38,
  metalness: 0,
};

export const PETIOLE: Mat = {
  color: "#4c6b34",
  roughness: 0.66,
  metalness: 0,
};

/** White, because the weave and colour arrive in the map. Rough almost to the
 *  limit: every other pale surface here has a sheen and this one must not. */
export const LINEN: Mat = {
  color: "#ffffff",
  roughness: 0.96,
  metalness: 0,
};

export const CURTAIN_POLE: Mat = {
  color: "#2c2622",
  roughness: 0.44,
  metalness: 0.72,
};

/**
 * Polished chrome trim. A mirror is only as bright as what it reflects, and the
 * shelf faces a dark room, so the rings read as thin dark lines; a little
 * emission stands in for the bright studio a real ring would be catching.
 */
export const CHROME: Mat = {
  color: "#e4e8ec",
  emissive: "#7c838b",
  emissiveIntensity: 0.55,
  roughness: 0.14,
  metalness: 1,
};

/** Black satin cone, as in the reference build: a sheen that catches the
 *  room, so it reads as a cone and not a hole. */
export const SPEAKER_CONE: Mat = {
  color: "#26282b",
  roughness: 0.42,
  metalness: 0.15,
};

/** The sub's square cone: dark grey moulded polymer, with a faint lift so it
 *  doesn't sink into the black baffle round it. */
export const SUB_CONE: Mat = {
  color: "#4a4d51",
  emissive: "#16171a",
  roughness: 0.5,
  metalness: 0.1,
};

/** Glossy dust cap over the voice coil, catching a highlight in the middle. */
export const DUST_CAP: Mat = {
  color: "#3a3d40",
  roughness: 0.18,
  metalness: 0.35,
};

/** The hex bolts round each trim ring. */
export const BOLT: Mat = {
  color: "#141416",
  roughness: 0.35,
  metalness: 0.5,
};

/** The small white maker's emblem on each mid's dust cap. */
export const EMBLEM: Mat = {
  color: "#e9ecef",
  roughness: 0.4,
  metalness: 0.2,
};

/** Gloss red lining round the sub's slot port. */
export const PORT_RED: Mat = {
  color: "#c8141c",
  roughness: 0.3,
  metalness: 0.1,
};

export const RUBBER: Mat = {
  color: "#18181a",
  roughness: 0.6,
  metalness: 0,
};

/** Grey automotive carpet over the baffle and the sub box. */
export const SPEAKER_PANEL: Mat = {
  color: "#1d1d20",
  roughness: 1,
  metalness: 0,
};

/** The orange of an amber LED strip. */
export const AMBER_HEX = "#ff8a1f";

/** Lit from inside, so it ignores the room's light; intensity is driven per frame. */
export const AMBER_LED: Mat = {
  color: "#000000",
  emissive: AMBER_HEX,
  emissiveIntensity: 1.6,
  toneMapped: false,
};

/** Brushed stainless: the çaydanlık. A faint lift for the same reason as the
 *  chrome — in a dark room a mirror finish reflects nothing and goes black. */
export const STEEL: Mat = {
  color: "#c9ced3",
  emissive: "#3a3e43",
  emissiveIntensity: 0.6,
  roughness: 0.28,
  metalness: 1,
};

/** Black bakelite: the çaydanlık's handles and knobs. */
export const BAKELITE: Mat = {
  color: "#141414",
  roughness: 0.45,
  metalness: 0,
};

/** Cigarette paper and the Parliament's white filter. */
export const CIG_PAPER: Mat = {
  color: "#f2f0ea",
  roughness: 0.85,
  metalness: 0,
};

export const CIG_FILTER: Mat = {
  color: "#f6f5f0",
  roughness: 0.7,
  metalness: 0,
};

/** The recess in a Parliament's filter, and the thin silver band below it. */
export const CIG_RECESS: Mat = {
  color: "#c7c2b4",
  roughness: 0.9,
  metalness: 0,
};

export const CIG_BAND: Mat = {
  color: "#c9ccd1",
  roughness: 0.3,
  metalness: 0.9,
};

export const ASH: Mat = {
  color: "#8c8985",
  roughness: 1,
  metalness: 0,
};

/** The coal at the burning end; brightness is driven per frame. */
export const EMBER: Mat = {
  color: "#2a0d04",
  emissive: "#ff5a14",
  emissiveIntensity: 1.5,
  toneMapped: false,
};

/** A heavy smoked-glass ashtray. Opaque: a second see-through object would
 *  bring back the transparency sorting the tea glass already costs. */
export const ASHTRAY_GLASS: Mat = {
  color: "#2b3134",
  roughness: 0.08,
  metalness: 0.3,
};

/** Tea mid-pour: the same red-brown, lit a little from inside so a 4 mm stream
 *  doesn't vanish against the room. */
export const TEA_STREAM: Mat = {
  color: "#7c1d08",
  emissive: "#5a1606",
  emissiveIntensity: 0.6,
  roughness: 0.1,
  metalness: 0,
  transparent: true,
  opacity: 0.85,
};

/*
 * Viewmodel variants. In the hand an object sits a few centimetres from the
 * eye, far from every light in the room, and a lit material goes black there.
 * A second light would be paid for on every pixel of the room, so these carry
 * their own: emission matched to their colour, standing in for the light a
 * hand held up in a room catches.
 */
export const CIG_PAPER_LIT: Mat = {
  ...CIG_PAPER,
  emissive: "#d9d6cf",
  emissiveIntensity: 0.42,
};

export const CIG_FILTER_LIT: Mat = {
  ...CIG_FILTER,
  emissive: "#dcdad3",
  emissiveIntensity: 0.42,
};

export const STEEL_LIT: Mat = {
  ...STEEL,
  roughness: 0.42,
  emissive: "#8c939a",
  emissiveIntensity: 0.55,
};

/** The tea glass in the hand: a touch more there, so it doesn't vanish. */
export const GLASS_LIT: PhysicalMat = {
  ...GLASS,
  opacity: 0.32,
  emissive: "#c9d2d8",
  emissiveIntensity: 0.12,
};

/** Neat dem in the air: nearly black, a thread of red where the light catches. */
export const DEM_STREAM: Mat = {
  color: "#2a0702",
  emissive: "#3a0b03",
  emissiveIntensity: 0.5,
  roughness: 0.1,
  metalness: 0,
};

/** Just-boiled water: clear, a little grey-blue, mostly highlight. */
export const WATER_STREAM: Mat = {
  color: "#dfe8ec",
  emissive: "#9fb0b8",
  emissiveIntensity: 0.25,
  roughness: 0.05,
  metalness: 0,
  transparent: true,
  opacity: 0.45,
};

/** Skin, for the hand in the first-person view: lit from within a little for
 *  the same reason as the other held things, and soft rather than shiny. */
export const SKIN: Mat = {
  color: "#d9a184",
  emissive: "#8a5a44",
  emissiveIntensity: 0.38,
  roughness: 0.62,
  metalness: 0,
};

/** A black hoodie sleeve. */
export const SLEEVE: Mat = {
  color: "#18191c",
  emissive: "#0c0c0e",
  emissiveIntensity: 1,
  roughness: 0.95,
  metalness: 0,
};
