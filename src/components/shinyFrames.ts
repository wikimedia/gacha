/**
 * shinyFrames — image-sequence registry for the rarity foil effect.
 *
 * A rarity's effect is built from LAYERS. Each layer is its own image sequence
 * with its own blend mode and playback rate. Layers in a phase play
 * simultaneously, stacked on top of one another.
 *
 *   intro — layers played ONCE when the card comes into view. The intro phase
 *           is only "finished" once EVERY intro layer has reached its last
 *           frame, so a long layer won't get cut off by a short one. Higher
 *           rarities stack extra intro layers on top of the shared sweep.
 *   loop  — layers looped FOREVER after the intro completes.
 *
 * Frames are plain image URLs pointing at PNG sequences in /public. A rarity's
 * effect is assembled from per-rarity base/intro/loop layer maps below.
 */

export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';

/** One image sequence within a phase. */
export interface FrameLayer {
  frames: string[];
  /** CSS mix-blend-mode for this layer (e.g. 'screen', 'plus-lighter'). */
  blend: string;
  /** Playback rate for this layer, frames per second. */
  fps: number;
}

export interface FrameSequence {
  /**
   * Static base layers, rendered at the BOTTOM of the stack and shown the
   * whole time the card is in view (through both intro and loop). Use the
   * first frame only — these don't animate. Everything else stacks on top.
   */
  base: FrameLayer[];
  /** Intro layers — all play together; phase ends when all have finished. */
  intro: FrameLayer[];
  /** Loop layers — all loop forever after the intro. */
  loop: FrameLayer[];
}

/**
 * Build a list of frame URLs for a numbered PNG sequence.
 * `framePaths('/sweep-intro/sweep-intro', 0, 20, 2)` →
 *   ['/sweep-intro/sweep-intro00.png', … '/sweep-intro/sweep-intro20.png']
 */
export function framePaths(
  prefix: string,
  start: number,
  end: number,
  pad = 4,
  ext = 'png'
): string[] {
  const out: string[] = [];
  for (let i = start; i <= end; i++) {
    out.push(`${prefix}${String(i).padStart(pad, '0')}.${ext}`);
  }
  return out;
}

// ── Real assets ───────────────────────────────────────────────────
// Shared sweep intro applied to every rarity above Common. 'plus-lighter' is
// the CSS additive blend ("add" / linear-dodge) — it sums the layer onto the
// card so the sweep reads as light, and it composites cleanly when higher
// rarities stack more additive intro layers on top.
const SWEEP_INTRO: FrameLayer = {
  frames: framePaths('/sweep-intro/sweep-intro', 0, 20, 2),
  blend: 'plus-lighter',
  fps: 29.97,
};

const RARE_STARS_INTRO: FrameLayer = {
  frames: framePaths('/rare-stars-intro/rare-stars-intro', 0, 20, 2),
  blend: 'screen',
  fps: 29.97,
};

const EPIC_STARS_INTRO: FrameLayer = {
  frames: framePaths('/epic-stars-intro/epic-stars-intro', 0, 20, 2),
  blend: 'screen',
  fps: 29.97,
};

const LEG_STARS_INTRO: FrameLayer = {
  frames: framePaths('/leg-stars-intro/leg-stars-intro', 0, 49, 2),
  blend: 'screen',
  fps: 29.97,
};

const LEG_SWEEP_INTRO: FrameLayer = {
  frames: framePaths('/legSweep-intro/legSweep-intro', 0, 20, 2),
  blend: 'plus-lighter',
  fps: 29.97,
};

// Intro layer stacks per rarity. Add rarity-specific layers here as their art
// arrives, e.g. Legendary: [SWEEP_INTRO, LEGENDARY_BURST]. They all play at
// once and the loop waits for the longest one to finish.
const RARITY_INTROS: Record<Rarity, FrameLayer[]> = {
  Common: [],
  Uncommon: [SWEEP_INTRO],
  Rare: [RARE_STARS_INTRO, SWEEP_INTRO],
  Epic: [EPIC_STARS_INTRO, SWEEP_INTRO],
  Legendary: [LEG_STARS_INTRO, LEG_SWEEP_INTRO],
};


const RARE_LOOP: FrameLayer = {
  frames: framePaths('/rare-loop/rare-loop', 0, 128, 3),
  blend: 'screen',
  fps: 29.97,
};

const EPIC_LOOP: FrameLayer = {
  frames: framePaths('/epic-loop/epic-loop', 0, 127, 3),
  blend: 'screen',
  fps: 29.97,
};
const LEG_LOOP: FrameLayer = {
  frames: framePaths('/leg-stars-loop/leg-stars-loop', 0, 99, 3),
  blend: 'screen',
  fps: 29.97,
};

// Real loop layer stacks per rarity. A rarity present here uses its real loop;
// any rarity absent falls back to the generated placeholder sheen below.
const RARITY_LOOPS: Partial<Record<Rarity, FrameLayer[]>> = {
  Rare: [RARE_LOOP],
  Epic: [EPIC_LOOP],
  Legendary: [LEG_LOOP],
};

// Static, always-on base layer: a single gold foil PNG that sits at the bottom
// of the Legendary stack, under every animated intro/loop layer.
const GOLD_OVERLAY: FrameLayer = {
  frames: ['/gold-overlay.png'],
  blend: 'overlay',
  fps: 1, // single static frame; rate is irrelevant
};

// Static base layer stacks per rarity (rendered first, under everything else).
const RARITY_BASES: Partial<Record<Rarity, FrameLayer[]>> = {
  Legendary: [GOLD_OVERLAY],
};


// ── Public registry ───────────────────────────────────────────────
const cache = new Map<Rarity, FrameSequence>();
const RARITIES: Rarity[] = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];

/** Every rarity that has a foil sequence (drives prefetch-all). */
export const FOIL_RARITIES = RARITIES;

/**
 * Frame sequence for a rarity, or null if it has no layers at all.
 * Sequences are cached so all cards of a rarity share frames.
 */
export function getFrameSequence(rarity: Rarity): FrameSequence | null {
  let seq = cache.get(rarity);
  if (!seq) {
    const base = RARITY_BASES[rarity] ?? [];
    const intro = RARITY_INTROS[rarity] ?? [];
    const loop = RARITY_LOOPS[rarity] ?? [];
    if (base.length === 0 && intro.length === 0 && loop.length === 0) return null;
    seq = { base, intro, loop };
    cache.set(rarity, seq);
  }
  return seq;
}

// ── Prefetch ───────────────────────────────────────────────────────
// Shared, deduped warm cache: kicks off the browser fetch+decode for each
// frame and holds a reference so it isn't evicted. Every Card instance and
// the app-level warm-up route through here, so each URL is fetched at most
// once regardless of how many cards share a rarity.
const warm = new Map<string, HTMLImageElement>();
// One settle-promise per URL (resolves on load OR error — a missing frame must
// never block the page). Lets callers await "everything is decoded".
const warmPromises = new Map<string, Promise<void>>();

/** Begin fetching + decoding every frame for a rarity (idempotent, cheap). */
export function prefetchFrames(rarity: Rarity): void {
  if (typeof Image === 'undefined') return; // SSR / non-DOM guard
  const seq = getFrameSequence(rarity);
  if (!seq) return;
  for (const layer of seq.base) for (const url of layer.frames) warmOne(url);
  for (const layer of seq.intro) for (const url of layer.frames) warmOne(url);
  for (const layer of seq.loop) for (const url of layer.frames) warmOne(url);
}

/** Prefetch every rarity's sequence (call once on app startup). */
export function prefetchAllFrames(): void {
  for (const rarity of FOIL_RARITIES) prefetchFrames(rarity);
}

/** Resolve once every frame for a rarity has loaded (or failed). */
export function preloadFrames(rarity: Rarity): Promise<void> {
  if (typeof Image === 'undefined') return Promise.resolve();
  const seq = getFrameSequence(rarity);
  if (!seq) return Promise.resolve();
  const ps: Promise<void>[] = [];
  for (const layer of seq.base) for (const url of layer.frames) ps.push(warmOne(url));
  for (const layer of seq.intro) for (const url of layer.frames) ps.push(warmOne(url));
  for (const layer of seq.loop) for (const url of layer.frames) ps.push(warmOne(url));
  return Promise.all(ps).then(() => undefined);
}

/**
 * Resolve once every rarity's frames have loaded (or failed). Pass a `timeout`
 * (ms) so a slow/missing batch can't stall the UI indefinitely.
 */
export function preloadAllFrames(timeout?: number): Promise<void> {
  const all = Promise.all(FOIL_RARITIES.map(preloadFrames)).then(() => undefined);
  if (!timeout || typeof setTimeout === 'undefined') return all;
  return Promise.race([
    all,
    new Promise<void>((resolve) => setTimeout(resolve, timeout)),
  ]);
}

function warmOne(url: string): Promise<void> {
  const existing = warmPromises.get(url);
  if (existing) return existing;
  const img = new Image();
  img.decoding = 'async';
  const p = new Promise<void>((resolve) => {
    img.onload = () => resolve();
    img.onerror = () => resolve(); // don't block on a missing frame
  });
  img.src = url;
  warm.set(url, img);
  warmPromises.set(url, p);
  return p;
}
