<script setup lang="ts">
import { computed } from 'vue';
import type { Card } from '../stores/useGameStore';

const props = withDefaults(defineProps<{
  card: Card;
  showLink?: boolean;
}>(), {
  showLink: true
});

// ── Category → Main Category mapping ──────────────────────────────
// Figma uses: Civilization, Nature, Science
const categoryMapping = computed(() => {
  switch (props.card.category) {
    case 'History':
      return { main: 'Civilization', sub: 'History' };
    case 'Pop Culture':
      return { main: 'Civilization', sub: 'Culture' };
    case 'Geography':
      return { main: 'Nature', sub: 'Geography' };
    case 'Science':
      return { main: 'Science', sub: 'Science' };
    default:
      return { main: 'Civilization', sub: props.card.category };
  }
});

// ── Category tint colors (hard-light blend) ──────────────────────
const categoryTint = computed(() => {
  switch (categoryMapping.value.main) {
    case 'Civilization':
      return '#4E5B77';
    case 'Nature':
      return '#74BC7E';
    case 'Science':
      return '#7B7898';
    default:
      return '#4E5B77';
  }
});

// ── Rarity → star count ──────────────────────────────────────────
const rarityStars = computed(() => {
  switch (props.card.rarity) {
    case 'Legendary': return 5;
    case 'Epic': return 4;
    case 'Rare': return 3;
    case 'Common':
    default: return 1;
  }
});

const starArray = computed(() => {
  return Array.from({ length: 5 }, (_, i) => i < rarityStars.value);
});

// ── Image handling ───────────────────────────────────────────────
const hasImage = computed(() => !!props.card.image);
const isCSSImage = computed(() => {
  const img = props.card.image || '';
  return img.startsWith('linear-gradient') || img.startsWith('url(');
});
const imageStyle = computed(() => {
  const img = props.card.image || '';
  if (!img) return null;
  if (img.startsWith('linear-gradient') || img.startsWith('url(')) return img;
  return `url("${img}")`;
});

// ── Wikimedia Commons link from image URL ────────────────────────
const wikimediaImageLink = computed(() => {
  const img = props.card.image || '';
  // Convert upload.wikimedia.org URLs to commons page links
  // e.g., https://upload.wikimedia.org/wikipedia/commons/1/18/Vombatus_ursinus.jpg
  // → https://commons.wikimedia.org/wiki/File:Vombatus_ursinus.jpg
  const match = img.match(/upload\.wikimedia\.org\/wikipedia\/commons\/[^/]+\/[^/]+\/(.+)$/);
  if (match) {
    return `https://commons.wikimedia.org/wiki/File:${decodeURIComponent(match[1])}`;
  }
  // Fallback to the card's wikipedia link
  return props.card.wikipediaLink;
});

// ── Attribution text ─────────────────────────────────────────────
const attributionText = computed(() => {
  const img = props.card.image || '';
  const match = img.match(/upload\.wikimedia\.org\/wikipedia\/commons\/[^/]+\/[^/]+\/(.+)$/);
  if (match) {
    const filename = decodeURIComponent(match[1]).replace(/_/g, ' ');
    // Truncate very long filenames
    const maxLen = 50;
    const display = filename.length > maxLen ? filename.slice(0, maxLen) + '…' : filename;
    return `Image: ${display} · Wikimedia Commons CC BY-SA`;
  }
  return 'en.wikipedia.org / Creative Commons Attribution-ShareAlike';
});



// Codex star SVG paths (viewBox 0 0 20 20)
// cdxIconUnStar = solid filled star, cdxIconStar = outlined star with inner detail
const STAR_FILLED_PATH = 'M20 7h-7L10 .5 7 7H0l5.46 5.47-1.64 7 6.18-3.7 6.18 3.73-1.63-7z';
const STAR_EMPTY_PATH = 'M20 7h-7L10 .5 7 7H0l5.46 5.47-1.64 7 6.18-3.7 6.18 3.73-1.63-7zm-10 6.9-3.76 2.27 1-4.28L3.5 8.5h4.61L10 4.6l1.9 3.9h4.6l-3.73 3.4 1 4.28z';
</script>

<template>
  <div class="trading-card-wrapper">
    <div 
      class="trading-card"
      :style="{
        '--card-category-tint': categoryTint,
      }"
    >
      <!-- ═══ Full-bleed background image ═══ -->
      <div class="trading-card__image-layer">
        <div v-if="hasImage && isCSSImage" 
          class="trading-card__image-bg"
          :style="{ backgroundImage: imageStyle! }"
        ></div>
        <img 
          v-else-if="hasImage"
          :src="card.image"
          referrerpolicy="no-referrer"
          class="trading-card__image-bg trading-card__image-bg--img"
          alt="Card image"
        />
        <div v-else class="trading-card__image-bg trading-card__image-bg--placeholder"></div>
      </div>

      <!-- ═══ Image bevel border overlay ═══ -->
      <div class="trading-card__image-bevel"></div>

      <!-- ═══ Category color tint overlay (hard-light) ═══ -->
      <div class="trading-card__tint-layer"></div>

      <!-- ═══ Grain texture overlay ═══ -->
      <div class="trading-card__grain-layer"></div>

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
          <div class="trading-card__stars">
            <svg 
              v-for="(filled, i) in starArray" 
              :key="i"
              class="trading-card__star-icon"
              :class="{ 'trading-card__star-icon--filled': filled, 'trading-card__star-icon--empty': !filled }"
              xmlns="http://www.w3.org/2000/svg" 
              width="20" 
              height="20" 
              viewBox="0 0 20 20"
            >
              <path :d="filled ? STAR_FILLED_PATH : STAR_EMPTY_PATH" />
            </svg>
          </div>
          <span class="trading-card__category-label">
            {{ categoryMapping.main }} / {{ categoryMapping.sub }}
          </span>
        </div>

        <!-- Description (expands upward from bottom) -->
        <div class="trading-card__description">
          <p>{{ card.description }}</p>
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
  </div>
</template>

<style scoped>
/* ============================================================
   Trading Card — Figma Redesign
   Full-bleed image, category tinting, Codex stars, rough border
   ============================================================ */

.trading-card-wrapper {
  width: 100%;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  position: relative;
}

.trading-card {
  --_tint: var(--card-category-tint, #4E5B77);

  width: 100%;
  aspect-ratio: 5 / 7;
  height: auto !important;
  min-height: 0;
  flex-shrink: 0;
  border-radius: 23px;
  overflow: hidden;
  position: relative;
  isolation: isolate;
  background: #f5f0e8;
  border: 1.25px solid #EBEBEB;
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.12),
    0 8px 24px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.3s ease, transform 0.2s ease;
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
}

.trading-card__image-bg {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 0.43;
  mix-blend-mode: multiply;
}

.trading-card__image-bg--img {
  object-fit: cover;
  display: block;
}

.trading-card__image-bg--placeholder {
  background: linear-gradient(135deg, #d5d0c8 0%, #c2bdb5 100%);
  opacity: 1;
}

/* ── Image bevel border (around the inset image area) ────────── */
.trading-card__image-bevel {
  position: absolute;
  inset: 14px;
  z-index: 2;
  border-top: 8px solid #A2A9B1;
  border-right: 8px solid #A2A9B1;
  border-bottom: 8px solid #C8CCD1;
  border-left: 8px solid #C8CCD1;
  pointer-events: none;
  box-sizing: border-box;
}

/* ── Category color tint overlay ─────────────────────────────── */
.trading-card__tint-layer {
  position: absolute;
  inset: 0;
  z-index: 3;
  background-color: var(--_tint);
  mix-blend-mode: hard-light;
  opacity: 0.65;
  pointer-events: none;
}

/* ── Grain texture overlay ───────────────────────────────────── */
.trading-card__grain-layer {
  position: absolute;
  inset: 0;
  z-index: 4;
  background-image: url('/grain.png');
  background-repeat: repeat;
  background-size: 150px 150px;
  opacity: 0.15;
  mix-blend-mode: luminosity;
  pointer-events: none;
}

/* ── Inner shadow overlay ────────────────────────────────────── */
.trading-card__inner-shadow {
  position: absolute;
  inset: 0;
  z-index: 5;
  box-shadow: inset 0 0 10.2px rgba(174, 162, 132, 0.58);
  mix-blend-mode: multiply;
  pointer-events: none;
}

/* ── Content layer ───────────────────────────────────────────── */
.trading-card__content {
  position: relative;
  z-index: 6;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 22px; /* 14px image inset + 8px internal padding */
}

/* ── Title area (expands downward) ───────────────────────────── */
.trading-card__title-area {
  flex-shrink: 0;
}

.trading-card__title-banner {
  background-color: rgba(213, 213, 250, 0.30);
  padding: 4px 8px;
  text-align: center;
  backdrop-filter: blur(2px);
}

.trading-card__title {
  font-family: var(--font-family-serif, 'Linux Libertine', Georgia, serif);
  font-size: 20px;
  font-weight: 900;
  line-height: 1.2;
  color: #000;
  margin: 0;
  letter-spacing: -0.01em;
}

/* ── Spacer (pushes bottom content down) ─────────────────────── */
.trading-card__spacer {
  flex: 1 1 auto;
  min-height: 8px;
}

/* ── Stars + Category/Subcategory strip ──────────────────────── */
.trading-card__attributes {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: rgba(213, 213, 250, 0.20);
  padding: 6px 8px;
  backdrop-filter: blur(2px);
}

.trading-card__stars {
  display: flex;
  gap: 1px;
}

.trading-card__star-icon {
  width: 18px;
  height: 18px;
}

.trading-card__star-icon--filled {
  fill: #e8a825;
  filter: drop-shadow(0 1px 1px rgba(212, 168, 67, 0.4));
}

.trading-card__star-icon--empty {
  fill: #C2CBCC;
}

.trading-card__category-label {
  font-family: var(--font-family-serif, 'Linux Libertine', Georgia, serif);
  font-size: 14px;
  font-weight: 700;
  color: #000;
  letter-spacing: 0.02em;
}

/* ── Description (expands upward from bottom) ────────────────── */
.trading-card__description {
  flex-shrink: 0;
  background-color: rgba(213, 213, 250, 0.30);
  padding: 8px;
  backdrop-filter: blur(2px);
}

.trading-card__description p {
  font-family: var(--font-family-serif, 'Linux Libertine', Georgia, serif);
  font-size: 11px;
  line-height: 1.5;
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
  margin-top: 6px;
  text-align: center;
  font-family: var(--font-family-system-sans, sans-serif);
  font-size: 8.5px;
  position: relative;
  z-index: 2;
  flex-shrink: 0;
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
</style>
