<script setup lang="ts">
import { computed } from 'vue';
import type { Card } from '../stores/useGameStore';
import { CATEGORY_SLUG } from '../stores/useGameStore';

const props = withDefaults(defineProps<{
  card: Card;
  showLink?: boolean;
}>(), {
  showLink: true
});

// ── Static Lookups ───────────────────────────────────────────────
const RARITY_STARS: Record<string, number> = {
  Legendary: 5, Epic: 4, Rare: 3, Uncommon: 2, Common: 1
};

const STAR_STYLES: Record<string, { fill: string; stroke: string }> = {
  Legendary: { fill: '#FFCF4F', stroke: '#AB7F2A' },
  Epic:      { fill: 'white',   stroke: '#404244' },
  Rare:      { fill: '#987027', stroke: '#CA982E' },
  Uncommon:  { fill: '#A8B0B7', stroke: '#72777D' },
  Common:    { fill: '#595C5F', stroke: '#404244' }
};

// ── Computed Properties ──────────────────────────────────────────
const categoryMapping = computed(() => ({
  main: props.card.category,
  sub: props.card.subCategory || '',
  cssClass: CATEGORY_SLUG[props.card.category] || 'civilization'
}));

const rarityStars = computed(() => RARITY_STARS[props.card.rarity] || 1);
const starStyle = computed(() => STAR_STYLES[props.card.rarity] || STAR_STYLES.Common);

const hasImage = computed(() => !!props.card.image);
const isCSSImage = computed(() => {
  const img = props.card.image || '';
  return img.startsWith('linear-gradient') || img.startsWith('url(');
});

const imageStyle = computed(() => {
  const img = props.card.image;
  if (!img) return null;
  return isCSSImage.value ? img : `url("${img}")`;
});

// Extract filename from Wikimedia Commons URL if applicable
const commonsFilename = computed(() => {
  const match = (props.card.image || '').match(/upload\.wikimedia\.org\/wikipedia\/commons\/[^/]+\/[^/]+\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
});

const wikimediaImageLink = computed(() => 
  commonsFilename.value 
    ? `https://commons.wikimedia.org/wiki/File:${commonsFilename.value}`
    : props.card.wikipediaLink
);

const attributionText = computed(() => {
  if (commonsFilename.value) {
    const filename = commonsFilename.value.replace(/_/g, ' ');
    const display = filename.length > 50 ? filename.slice(0, 50) + '…' : filename;
    return `Image: ${display} · Wikimedia Commons CC BY-SA`;
  }
  return 'en.wikipedia.org / Creative Commons Attribution-ShareAlike';
});

// Stable pseudo-random background position for the grain texture
const grainPosition = computed(() => {
  const offsets = ['left', 'center', 'right', '25%', '75%'];
  const seed = props.card.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return `${offsets[seed % offsets.length]} ${offsets[(seed >> 1) % offsets.length]}`;
});

const STAR_PATH = 'M15.9302 8.49121H23.125L23.8843 10.7349L18.009 15.2209L20.2612 22.5061L18.3081 23.8684L12.5 19.4312L6.69189 23.8684L4.73877 22.5061L6.98975 15.2209L1.11572 10.7349L1.875 8.49121H9.06982L11.3062 1.2561H13.6938L15.9302 8.49121Z';
</script>
 
<template>
  <div class="trading-card-wrapper">
    <div class="trading-card" :class="'trading-card--' + categoryMapping.cssClass">
      <!-- ═══ Full-bleed background image ═══ -->
      <div class="trading-card__image-layer">
        <div v-if="hasImage && isCSSImage" 
          class="trading-card__image-bg"
          :style="{ backgroundImage: imageStyle! }"
        ></div>
        <img 
          v-else-if="hasImage"
          :src="card.image"
          loading="lazy"
          referrerpolicy="no-referrer"
          class="trading-card__image-bg trading-card__image-bg--img"
          alt="Card image"
        />
        <div v-else class="trading-card__image-bg trading-card__image-bg--placeholder"></div>
      </div>

      <!-- ═══ Category color tint overlay (hard-light) ═══ -->
      <div class="trading-card__tint-layer"></div>

      <!-- ═══ Grain texture overlay ═══ -->
      <div class="trading-card__grain-layer" :style="{ backgroundPosition: grainPosition }"></div>

      <!-- ═══ Inner shadow overlay ═══ -->
      <div class="trading-card__inner-shadow"></div>

      <!-- ═══ Content layer (on top of everything) ═══ -->
      <div class="trading-card__content">
        
        <!-- Title (expands downward from top) -->
        <div class="trading-card__title-area">
          <div class="trading-card__title-banner">
            <h3 class="trading-card__title">
              {{ card.title }}
            </h3>
          </div>
        </div>

        <!-- Spacer pushes bottom content down -->
        <div class="trading-card__spacer"></div>

        <!-- Stars + Category strip -->
        <div class="trading-card__attributes">
          <div class="trading-card__stars" :class="'trading-card__stars--' + rarityStars">
            <svg 
              v-for="i in rarityStars" 
              :key="i"
              class="trading-card__star-icon"
              xmlns="http://www.w3.org/2000/svg" 
              width="25" 
              height="25" 
              viewBox="0 0 25 25"
            >
              <path 
                :d="STAR_PATH" 
                :fill="starStyle.fill" 
                :stroke="starStyle.stroke" 
                stroke-width="2" 
                stroke-linejoin="bevel"
              />
            </svg>
          </div>
          <span class="trading-card__category-label">
            {{ categoryMapping.main }}<template v-if="categoryMapping.sub"> / {{ categoryMapping.sub }}</template>
          </span>
        </div>

        <!-- Codex divider line -->
        <div class="trading-card__description-divider"></div>

        <!-- Description (expands upward from bottom) -->
        <div class="trading-card__description">
          <p>{{ card.description }}</p>
        </div>

      </div>

      <!-- Attribution line -->
      <div class="trading-card__credit-line">
        <a 
          v-if="showLink !== false"
          :href="wikimediaImageLink" 
          target="_blank" 
          rel="noopener noreferrer"
          class="trading-card__credit-link"
          @click.stop
        >
          {{ attributionText }}
        </a>
        <span v-else class="trading-card__credit-text">
          Wikimedia Commons / CC BY-SA 4.0
        </span>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* ============================================================
   Trading Card — Figma Redesign
   Full-bleed image, category tinting, Codex stars, rough border
   ============================================================ */

.trading-card-wrapper {
  width: 315px;
  height: 440px;
  display: flex;
  flex-direction: column;
  position: relative;
}

.trading-card {
  --_area-bg: rgba(249, 250, 248, 0.90);
  --_title-bg: rgba(249, 250, 248, 0.90);

  width: 100%;
  height: 100%;
  flex-shrink: 0;
  border-radius: 11.5px;
  overflow: hidden;
  position: relative;
  isolation: isolate;
  background: var(--_bg);
  border: 1px solid #EBEBEB;
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.12),
    0 8px 24px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.3s ease, transform 0.2s ease;
  will-change: transform;
  transform: translateZ(0);
}

/* ── Category theme configurations ───────────────────────────── */
.trading-card,
.trading-card--civilization {
  --_tint: var(--color-category-civilization);
  --_bg: var(--color-category-civilization-bg);
  --_bevel-tr: var(--color-category-civilization-bevel-tr);
  --_bevel-bl: var(--color-category-civilization-bevel-bl);
}

.trading-card--nature {
  --_tint: var(--color-category-nature);
  --_bg: var(--color-category-nature-bg);
  --_bevel-tr: var(--color-category-nature-bevel-tr);
  --_bevel-bl: var(--color-category-nature-bevel-bl);
}

.trading-card--science {
  --_tint: var(--color-category-science);
  --_bg: var(--color-category-science-bg);
  --_bevel-tr: var(--color-category-science-bevel-tr);
  --_bevel-bl: var(--color-category-science-bevel-bl);
}


.trading-card:hover {
  box-shadow: 
    0 4px 16px rgba(0, 0, 0, 0.16),
    0 12px 32px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

/* ── Full-bleed background image ─────────────────────────────── */
.trading-card__image-layer {
  position: absolute;
  inset: 14px;
  z-index: 1;
  overflow: hidden;
  border-top: 1.5px solid #A2A9B1;
  border-right: 1.5px solid #A2A9B1;
  border-bottom: 1.5px solid #C8CCD1;
  border-left: 1.5px solid #C8CCD1;
}

.trading-card__image-bg {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 1;
}

.trading-card__image-bg--img {
  object-fit: cover;
  display: block;
}

.trading-card__image-bg--placeholder {
  background: linear-gradient(135deg, #d5d0c8 0%, #c2bdb5 100%);
  opacity: 1;
}

/* ── Category color tint overlay ─────────────────────────────── */
.trading-card__tint-layer {
  position: absolute;
  inset: 0;
  z-index: 4;
  background-color: var(--_tint);
  mix-blend-mode: hard-light;
  pointer-events: none;
}

/* ── Grain texture overlay ───────────────────────────────────── */
.trading-card__grain-layer {
  position: absolute;
  inset: 0;
  z-index: 5;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 200px 200px;
  opacity: 0.18;
  mix-blend-mode: luminosity;
  pointer-events: none;
}

/* ── Inner shadow overlay ────────────────────────────────────── */
.trading-card__inner-shadow {
  position: absolute;
  inset: 0;
  z-index: 6;
  box-shadow: inset 0 0 10.2px rgba(174, 162, 132, 0.58);
  mix-blend-mode: multiply;
  pointer-events: none;
}

/* ── Content layer ───────────────────────────────────────────── */
.trading-card__content {
  position: relative;
  z-index: 3;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 23px; /* 14px image inset + 9px internal padding (half of 18px side margin) */
}

/* ── Title area (expands downward) ───────────────────────────── */
.trading-card__title-area {
  flex-shrink: 0;
}

.trading-card__title-banner {
  background: var(--_title-bg);
  padding: 2px 4px; /* halved from 4px 8px */
  text-align: center;
}

.trading-card__title {
  font-family: Georgia;
  font-size: 18px; /* halved from 36px font-size */
  font-weight: bold;
  line-height: 1.2;
  color: #000;
  margin: 0;
  letter-spacing: -0.01em;
}

/* ── Spacer (pushes bottom content down) ─────────────────────── */
.trading-card__spacer {
  flex: 1 1 auto;
  min-height: 4px; /* halved from 8px */
}

/* ── Stars + Category/Subcategory strip ──────────────────────── */
.trading-card__attributes {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--_area-bg);
  padding: 7.5px 7.5px; /* halved from 6px 8px */
}

.trading-card__stars {
  display: flex;
  gap: 1.5px;
}

.trading-card__star-icon {
  width: 12.5px;
  height: 12.5px;
}

/* Style properties are handled dynamically/inline via template SVG attributes */

.trading-card__category-label {
  font-family: var(--font-family-serif, 'Linux Libertine', Georgia, serif);
  font-size: 11px;
  font-weight: 700;
  color: #000;
  letter-spacing: 0.02em;
}

/* ── Description (expands upward from bottom) ────────────────── */
.trading-card__description {
  flex-shrink: 0;
  background: var(--_area-bg);
  padding: 7.5px; /* halved from 8px */
}

.trading-card__description p {
  font-family: var(--font-family-serif, 'Linux Libertine', Georgia, serif);
  font-size: 11px;
  line-height: 1.4;
  color: #000;
  margin: 0;
  text-align: justify;
  display: -webkit-box;
  -webkit-line-clamp: 6;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ── Attribution credit line (on the card) ────────── */
.trading-card__credit-line {
  position: absolute;
  bottom: 0;
  left: 14px;
  right: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-family-system-sans, sans-serif);
  font-size: 5.5px;
  z-index: 3;
  margin: 0;
}

.trading-card__credit-link {
  color: rgba(0, 0, 0, 0.6);
  text-decoration: none;
  font-style: italic;
  transition: color 0.15s ease, text-decoration 0.15s ease;
  max-width: 100%;
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trading-card__credit-link:hover {
  color: var(--color-progressive, #36c);
  text-decoration: underline;
}

.trading-card__credit-text {
  color: rgba(0, 0, 0, 0.6);
  font-style: italic;
}

/* ── Description divider line ─────────────────────────────── */
.trading-card__description-divider {
  flex-shrink: 0;
  background: var(--_area-bg);
  height: 1px;
  position: relative;
}

.trading-card__description-divider::after {
  content: '';
  position: absolute;
  left: 7.5px;
  right: 7.5px;
  top: 0;
  bottom: 0;
  border-bottom: 1.5px solid #A2A9B1;
}
</style>
