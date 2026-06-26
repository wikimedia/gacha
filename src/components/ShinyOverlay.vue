<script setup lang="ts">
/**
 * ShinyOverlay — rarity-driven "foil" effect for trading cards.
 *
 * Pure CSS (GPU-composited gradients + blend modes), so it scales to an
 * arbitrary number of cards on a page without the ~16-context limit that a
 * per-card WebGL canvas would hit.
 *
 * Effects stack with rarity (each tier adds a layer on top of the last):
 *   Common    → nothing (plain card)
 *   Uncommon  → drifting diagonal sheen
 *   Rare      → + holographic rainbow bands
 *   Epic      → + drifting twinkling glitter
 *   Legendary → + sweeping prismatic rays
 *
 * Readability: this layer sits *below* the card's text banners (which have
 * opaque backgrounds) and uses only lightening blends (screen / color-dodge),
 * so it never darkens or muddies text.
 *
 * Seamless loops: the angled stripe layers (sheen, holo) are repeating
 * gradients with a known px period L drawn at 115°. Shifting background-position
 * by exactly L / sin(115°) (≈ L × 1.1034) maps the pattern back onto itself, so
 * the animation has no jump. The glitter fades to 0 alpha at the loop boundary,
 * hiding its position reset.
 */
import { computed } from 'vue';

const props = defineProps<{
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
}>();

const LEVELS: Record<string, number> = {
  Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4
};

const level = computed(() => LEVELS[props.rarity] ?? 0);
</script>

<template>
  <div
    v-if="level > 0"
    class="shiny"
    :class="`shiny--${rarity.toLowerCase()}`"
    aria-hidden="true"
  >
    <!-- L1+ : moving diagonal light sheen -->
    <div class="shiny__sheen"></div>
    <!-- L2+ : holographic rainbow bands -->
    <div v-if="level >= 2" class="shiny__holo"></div>
    <!-- L3+ : drifting twinkling glitter -->
    <div v-if="level >= 3" class="shiny__glitter"></div>
    <!-- L4  : sweeping prismatic rays -->
    <div v-if="level >= 4" class="shiny__rays"></div>
  </div>
</template>

<style scoped>
/* ============================================================
   Rarity foil effect. All layers are pointer-transparent and
   clipped by the card's own overflow:hidden + border-radius.
   ============================================================ */

.shiny,
.shiny > * {
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
}

/* Per-tier intensity knob; each layer multiplies its base alpha by this. */
.shiny--uncommon  { --shine: 0.35; }
.shiny--rare      { --shine: 0.5; }
.shiny--epic      { --shine: 0.65; }
.shiny--legendary { --shine: 0.85; }

/* ── L1: diagonal sheen ─────────────────────────────────────────
   A single bright band that translates from fully off one edge to
   fully off the other (transform, not background-position — the
   latter has a browser raster bug that jumps mid-scroll on large
   gradients). The loop resets while the band is OFF the card, so the
   reset is never visible. The parent is rotated to angle the sweep,
   and oversized so its rotated corners still cover the card. */
.shiny__sheen {
  inset: -30%;
  transform: rotate(24deg);
}
.shiny__sheen::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to right,
    transparent 42%,
    rgba(255, 255, 255, calc(0.55 * var(--shine))) 47%,
    rgba(255, 255, 255, calc(0.9 * var(--shine))) 50%,
    rgba(255, 255, 255, calc(0.55 * var(--shine))) 53%,
    transparent 58%
  );
  mix-blend-mode: screen;
  /* Total duration = gap between sweeps; the keyframes do the actual
     travel in the first 20%, so the sweep itself is quick. */
  animation: shiny-sheen 4s linear infinite;
}

/* ── L2: holographic rainbow bands ──────────────────────────────
   Continuous rainbow, so it can't use the off-card reset trick. Instead
   the child is one full period (240px) wider than its box and translated
   by exactly that period — coverage never breaks and the wrap is exact.
   Also transform, not background-position, to dodge the same raster bug. */
.shiny__holo {
  inset: -30%;
  transform: rotate(24deg);
  opacity: calc(0.45 * var(--shine));
}
.shiny__holo::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: -240px; /* one extra period of width on the leaving edge */
  background: repeating-linear-gradient(
    to right,
    rgba(255, 0, 128, 0.45) 0px,
    rgba(255, 170, 0, 0.45) 48px,
    rgba(0, 230, 170, 0.45) 96px,
    rgba(0, 150, 255, 0.45) 144px,
    rgba(180, 60, 255, 0.45) 192px,
    rgba(255, 0, 128, 0.45) 240px
  );
  mix-blend-mode: color-dodge;
  animation: shiny-holo 8s linear infinite;
}

/* ── L3: drifting twinkling glitter ─────────────────────────────
   Two sparkle fields at different scales / speeds / directions. Each
   fades to 0 at the loop boundary so its position reset is invisible,
   and flickers in between to read as twinkling. */
.shiny__glitter::before,
.shiny__glitter::after {
  content: '';
  position: absolute;
  inset: -20%;
  mix-blend-mode: screen;
}

/* Each field is a tiled SVG of scattered 4-point "twinkle" sparkles
   (the curved/pinched sides are what make them read as stars, not dots).
   Only the # in the fill color must be URL-encoded (%23). */
.shiny__glitter::before {
  background-image: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><g fill='%23fff'><path d='M0,-1 C0.18,-0.35 0.35,-0.18 1,0 C0.35,0.18 0.18,0.35 0,1 C-0.18,0.35 -0.35,0.18 -1,0 C-0.35,-0.18 -0.18,-0.35 0,-1 Z' transform='translate(18,22) scale(7)'/><path d='M0,-1 C0.18,-0.35 0.35,-0.18 1,0 C0.35,0.18 0.18,0.35 0,1 C-0.18,0.35 -0.35,0.18 -1,0 C-0.35,-0.18 -0.18,-0.35 0,-1 Z' transform='translate(72,14) scale(5)'/><path d='M0,-1 C0.18,-0.35 0.35,-0.18 1,0 C0.35,0.18 0.18,0.35 0,1 C-0.18,0.35 -0.35,0.18 -1,0 C-0.35,-0.18 -0.18,-0.35 0,-1 Z' transform='translate(86,52) scale(8)'/><path d='M0,-1 C0.18,-0.35 0.35,-0.18 1,0 C0.35,0.18 0.18,0.35 0,1 C-0.18,0.35 -0.35,0.18 -1,0 C-0.35,-0.18 -0.18,-0.35 0,-1 Z' transform='translate(38,68) scale(6)'/><path d='M0,-1 C0.18,-0.35 0.35,-0.18 1,0 C0.35,0.18 0.18,0.35 0,1 C-0.18,0.35 -0.35,0.18 -1,0 C-0.35,-0.18 -0.18,-0.35 0,-1 Z' transform='translate(58,88) scale(4.5)'/><path d='M0,-1 C0.18,-0.35 0.35,-0.18 1,0 C0.35,0.18 0.18,0.35 0,1 C-0.18,0.35 -0.35,0.18 -1,0 C-0.35,-0.18 -0.18,-0.35 0,-1 Z' transform='translate(8,84) scale(5.5)'/></g></svg>");
  background-size: 140px 140px;
  animation: glitter-a 4.3s ease-in-out infinite;
}

.shiny__glitter::after {
  background-image: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><g fill='%23fff'><path d='M0,-1 C0.18,-0.35 0.35,-0.18 1,0 C0.35,0.18 0.18,0.35 0,1 C-0.18,0.35 -0.35,0.18 -1,0 C-0.35,-0.18 -0.18,-0.35 0,-1 Z' transform='translate(30,18) scale(6)'/><path d='M0,-1 C0.18,-0.35 0.35,-0.18 1,0 C0.35,0.18 0.18,0.35 0,1 C-0.18,0.35 -0.35,0.18 -1,0 C-0.35,-0.18 -0.18,-0.35 0,-1 Z' transform='translate(74,40) scale(7.5)'/><path d='M0,-1 C0.18,-0.35 0.35,-0.18 1,0 C0.35,0.18 0.18,0.35 0,1 C-0.18,0.35 -0.35,0.18 -1,0 C-0.35,-0.18 -0.18,-0.35 0,-1 Z' transform='translate(12,60) scale(5)'/><path d='M0,-1 C0.18,-0.35 0.35,-0.18 1,0 C0.35,0.18 0.18,0.35 0,1 C-0.18,0.35 -0.35,0.18 -1,0 C-0.35,-0.18 -0.18,-0.35 0,-1 Z' transform='translate(55,82) scale(6.5)'/><path d='M0,-1 C0.18,-0.35 0.35,-0.18 1,0 C0.35,0.18 0.18,0.35 0,1 C-0.18,0.35 -0.35,0.18 -1,0 C-0.35,-0.18 -0.18,-0.35 0,-1 Z' transform='translate(88,80) scale(4)'/></g></svg>");
  background-size: 196px 196px;
  animation: glitter-b 5.7s ease-in-out infinite;
}

/* ── L4: rotating prismatic rays ────────────────────────────────
   360° rotation is inherently seamless. */
.shiny__rays {
  /* Oversized past the card's diagonal so the rotating square always
     covers the card — otherwise its edges sweep in as a hard line and
     its corners leave gaps. The radial mask fades out well inside this
     box, so the enlarged edges are never visible. */
  inset: -50%;
  background: conic-gradient(
    from 0deg,
    rgba(255, 80, 80, 0) 0deg,
    rgba(255, 220, 120, 0.6) 40deg,
    rgba(120, 255, 200, 0) 80deg,
    rgba(120, 200, 255, 0.6) 140deg,
    rgba(220, 120, 255, 0) 200deg,
    rgba(255, 220, 120, 0.6) 280deg,
    rgba(255, 80, 80, 0) 360deg
  );
  /* Fade rays out toward the edges so they read as a central burst. */
  -webkit-mask-image: radial-gradient(circle at 50% 45%, #000 10%, transparent 75%);
          mask-image: radial-gradient(circle at 50% 45%, #000 10%, transparent 75%);
  opacity: calc(0.4 * var(--shine));
  mix-blend-mode: screen;
  animation: shiny-rays 14s linear infinite;
}

/* ── Keyframes ──────────────────────────────────────────────── */
/* Quick sweep across in the first 20% of the cycle, then parked fully
   off the right edge for the rest (the long gap). The reset from off-right
   back to off-left is invisible since the band is off-card at both. */
@keyframes shiny-sheen {
  0%   { transform: translateX(-100%); }
  25%  { transform: translateX(100%); }
  100% { transform: translateX(100%); }
}

/* Translate exactly one gradient period (240px) → seamless wrap. */
@keyframes shiny-holo {
  from { transform: translateX(0); }
  to   { transform: translateX(-240px); }
}

@keyframes glitter-a {
  0%   { opacity: 0;                            transform: translate(0, 0); }
  15%  { opacity: calc(0.85 * var(--shine)); }
  35%  { opacity: calc(0.25 * var(--shine)); }
  55%  { opacity: calc(0.8 * var(--shine)); }
  80%  { opacity: calc(0.3 * var(--shine)); }
  100% { opacity: 0;                            transform: translate(46px, -64px); }
}

@keyframes glitter-b {
  0%   { opacity: 0;                            transform: translate(0, 0); }
  20%  { opacity: calc(0.7 * var(--shine)); }
  45%  { opacity: calc(0.3 * var(--shine)); }
  70%  { opacity: calc(0.75 * var(--shine)); }
  100% { opacity: 0;                            transform: translate(-58px, -40px); }
}

@keyframes shiny-rays {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

/* Respect users who'd rather not see motion: keep the look, drop the loop. */
@media (prefers-reduced-motion: reduce) {
  .shiny__sheen::before,
  .shiny__holo::before,
  .shiny__rays,
  .shiny__glitter::before,
  .shiny__glitter::after {
    animation: none;
  }
}
</style>
