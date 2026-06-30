<script setup lang="ts">
/**
 * ShinyOverlay — rarity-driven "foil" effect for trading cards, driven by
 * image frame sequences rather than CSS.
 *
 * Each rarity is built from LAYERS (see ./shinyFrames). Within a phase, all
 * layers play simultaneously, each stacked as its own <img> with its own blend
 * mode and fps:
 *   intro — played ONCE when the card comes into view. The intro is only done
 *           once EVERY intro layer has reached its last frame (higher rarities
 *           stack extra intro layers), at which point we hand off to the loop.
 *   loop  — looped FOREVER afterwards.
 *
 * The parent decides *when* a card is "in view" via the `inView` prop — an
 * IntersectionObserver, the end of a reveal on the card above, etc. While
 * `inView` is false the overlay renders nothing and burns no rAF; when it flips
 * true the intro plays from frame 0; when it flips false we reset.
 */
import { ref, watch, onUnmounted } from 'vue';
import { getFrameSequence, prefetchFrames, type FrameLayer, type Rarity } from './shinyFrames';

const props = withDefaults(defineProps<{
  rarity: Rarity;
  /** Parent-controlled gate: play the effect only while true. */
  inView?: boolean;
}>(), {
  inView: false,
});

// What the template renders: one <img> per active layer.
interface RenderFrame { src: string; blend: string; }
const frames = ref<RenderFrame[]>([]);

const reducedMotion =
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// ── Frame player (rAF driven, per-layer fps pacing) ───────────────
interface LayerState {
  layer: FrameLayer;
  frame: number;
  acc: number;   // ms accumulated toward the next frame
  done: boolean; // intro-only: reached last frame
}

let rafId = 0;
let phase: 'intro' | 'loop' = 'intro';
let baseLayers: FrameLayer[] = []; // static, always at the bottom of the stack
let layers: LayerState[] = [];     // animated layers for the current phase
let lastTs = 0;

function stopRaf() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
}

function reset() {
  stopRaf();
  baseLayers = [];
  layers = [];
  frames.value = [];
}

function buildStates(layerDefs: FrameLayer[]): LayerState[] {
  return layerDefs.map((layer) => ({ layer, frame: 0, acc: 0, done: false }));
}

function render() {
  // Static base layers first (bottom), animated phase layers stacked on top.
  frames.value = [
    ...baseLayers.map((l) => ({ src: l.frames[0], blend: l.blend })),
    ...layers.map((ls) => ({ src: ls.layer.frames[ls.frame], blend: ls.layer.blend })),
  ];
}

function enterLoop(loop: FrameLayer[]) {
  phase = 'loop';
  layers = buildStates(loop);
  render();
  if (layers.length === 0) stopRaf(); // nothing to loop → overlay stays clear
}

function start() {
  const s = getFrameSequence(props.rarity);
  if (!s) {
    reset();
    return;
  }
  stopRaf();
  lastTs = 0;
  baseLayers = s.base;

  // Reduced motion: skip the animation, park on a representative still (base
  // layers + a settled frame of the loop, or the last intro frame).
  if (reducedMotion) {
    const still = s.loop.length ? s.loop : s.intro;
    frames.value = [
      ...baseLayers.map((l) => ({ src: l.frames[0], blend: l.blend })),
      ...still.map((l) => ({
        src: l.frames[s.loop.length ? 0 : l.frames.length - 1],
        blend: l.blend,
      })),
    ];
    return;
  }

  // Begin at the intro, or skip straight to the loop if there's no intro.
  if (s.intro.length) {
    phase = 'intro';
    layers = buildStates(s.intro);
    render();
  } else {
    enterLoop(s.loop);
    if (layers.length === 0) return;
  }

  const tick = (ts: number) => {
    const dt = lastTs ? ts - lastTs : 0;
    lastTs = ts;

    if (phase === 'intro') {
      let allDone = true;
      for (const ls of layers) {
        if (!ls.done) {
          const dur = 1000 / ls.layer.fps;
          ls.acc += dt;
          while (ls.acc >= dur && !ls.done) {
            ls.acc -= dur;
            ls.frame++;
            if (ls.frame >= ls.layer.frames.length) {
              ls.frame = ls.layer.frames.length - 1; // hold last frame
              ls.done = true;
            }
          }
        }
        if (!ls.done) allDone = false;
      }
      render();
      if (allDone) enterLoop(s.loop);
    } else {
      for (const ls of layers) {
        const dur = 1000 / ls.layer.fps;
        ls.acc += dt;
        while (ls.acc >= dur) {
          ls.acc -= dur;
          ls.frame = (ls.frame + 1) % ls.layer.frames.length;
        }
      }
      render();
    }

    if (layers.length) rafId = requestAnimationFrame(tick);
    else stopRaf();
  };
  rafId = requestAnimationFrame(tick);
}

// Warm the shared prefetch cache whenever the active rarity changes, so the
// frames are fetched/decoded before the card first comes into view.
watch(() => props.rarity, (rarity) => {
  if (getFrameSequence(rarity)) prefetchFrames(rarity);
}, { immediate: true });

// Start/stop on the parent's in-view gate (or when the rarity changes).
watch(
  () => props.inView && !!getFrameSequence(props.rarity),
  (active) => (active ? start() : reset()),
  { immediate: true }
);

onUnmounted(stopRaf);
</script>

<template>
  <div v-if="frames.length" class="shiny" aria-hidden="true">
    <img
      v-for="(f, i) in frames"
      :key="i"
      class="shiny__frame"
      :src="f.src"
      :style="{ mixBlendMode: f.blend as any }"
      alt=""
      draggable="false"
    />
  </div>
</template>

<style scoped>
.shiny {
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  overflow: hidden;
}

.shiny__frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  /* Frames are authored to the card's footprint; stretch edge to edge. */
  object-fit: fill;
  -webkit-user-select: none;
  user-select: none;
}
</style>
