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
      return '#948877';
    case 'Nature':
      return '#7E8C75';
    case 'Science':
      return '#787F9B';
    default:
      return '#948877';
  }
});

// ── Rarity → star count ──────────────────────────────────────────
const rarityStars = computed(() => {
  switch (props.card.rarity) {
    case 'Legendary': return 5;
    case 'Epic': return 4;
    case 'Rare': return 3;
    case 'Uncommon': return 2;
    case 'Common':
    default: return 1;
  }
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



// ── Category-specific card background and border colors ─────────
const categoryBgColor = computed(() => {
  switch (categoryMapping.value.main) {
    case 'Civilization':
      return '#f5f0e8';
    case 'Nature':
      return '#eef3eb';
    case 'Science':
      return '#eef1f6';
    default:
      return '#f5f0e8';
  }
});

const bevelColorTopRight = computed(() => {
  switch (categoryMapping.value.main) {
    case 'Civilization':
      return '#A2A9B1';
    case 'Nature':
      return '#8da283';
    case 'Science':
      return '#8592b1';
    default:
      return '#A2A9B1';
  }
});

const bevelColorBottomLeft = computed(() => {
  switch (categoryMapping.value.main) {
    case 'Civilization':
      return '#C8CCD1';
    case 'Nature':
      return '#b8cbb0';
    case 'Science':
      return '#b4c1db';
    default:
      return '#C8CCD1';
  }
});

// ── Rarity-specific star colors and path ────────────────────────
const starStyle = computed(() => {
  switch (props.card.rarity) {
    case 'Legendary':
      return { fill: '#FFCF4F', stroke: '#AB7F2A' };
    case 'Epic':
      return { fill: 'white', stroke: '#404244' };
    case 'Rare':
      return { fill: '#987027', stroke: '#CA982E' };
    case 'Uncommon':
      return { fill: '#A8B0B7', stroke: '#72777D' };
    case 'Common':
    default:
      return { fill: '#595C5F', stroke: '#404244' };
  }
});

// Area background colors matching card theme colors at 90% opacity
const categoryAreaBgColor = computed(() => {
  switch (categoryMapping.value.main) {
    case 'Civilization':
      return 'rgba(245, 240, 232, 0.90)';
    case 'Nature':
      return 'rgba(238, 243, 235, 0.90)';
    case 'Science':
      return 'rgba(238, 241, 246, 0.90)';
    default:
      return 'rgba(245, 240, 232, 0.90)';
  }
});

// Stable pseudo-random background position for the grain texture to create subtle card variations
const grainPosition = computed(() => {
  const xOffsets = ['left', 'center', 'right', '25%', '75%'];
  const yOffsets = ['top', 'center', 'bottom', '25%', '75%'];
  
  // Use card id char codes to get a stable but unique index per card
  const seed = props.card.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const xPos = xOffsets[seed % xOffsets.length];
  const yPos = yOffsets[(seed >> 1) % yOffsets.length];
  
  return `${xPos} ${yPos}`;
});

const STAR_PATH = 'M15.9302 8.49121H23.125L23.8843 10.7349L18.009 15.2209L20.2612 22.5061L18.3081 23.8684L12.5 19.4312L6.69189 23.8684L4.73877 22.5061L6.98975 15.2209L1.11572 10.7349L1.875 8.49121H9.06982L11.3062 1.2561H13.6938L15.9302 8.49121Z';
</script>

<template>
  <div class="trading-card-wrapper">
    <div class="trading-card">
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
            {{ categoryMapping.main }} / {{ categoryMapping.sub }}
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
  --_tint: v-bind(categoryTint);
  --_bg: v-bind(categoryBgColor);
  --_area-bg: v-bind(categoryAreaBgColor);

  width: 100%;
  height: 100%;
  flex-shrink: 0;
  border-radius: 11.5px;
  overflow: hidden;
  position: relative;
  isolation: isolate;
  background: var(--_bg);
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
  opacity: 0.68;
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
  --_bevel-tr: v-bind(bevelColorTopRight);
  --_bevel-bl: v-bind(bevelColorBottomLeft);

  position: absolute;
  inset: 14px;
  z-index: 2;
  border-top: 1.5px solid var(--_bevel-tr);
  border-right: 1.5px solid var(--_bevel-tr);
  border-bottom: 1.5px solid var(--_bevel-bl);
  border-left: 1.5px solid var(--_bevel-bl);
  pointer-events: none;
  box-sizing: border-box;
}

/* ── Category color tint overlay ─────────────────────────────── */
.trading-card__tint-layer {
  position: absolute;
  inset: 0;
  z-index: 4;
  background-color: var(--_tint);
  mix-blend-mode: hard-light;
  opacity: 0.38;
  pointer-events: none;
}

/* ── Grain texture overlay ───────────────────────────────────── */
.trading-card__grain-layer {
  --_grain-pos: v-bind(grainPosition);

  position: absolute;
  inset: 0;
  z-index: 5;
  background-image: url('/grain.png');
  background-repeat: no-repeat;
  background-size: cover; /* Fill the card area without warping the aspect ratio */
  background-position: var(--_grain-pos);
  opacity: 0.15;
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
  background: var(--_area-bg);
  padding: 2px 4px; /* halved from 4px 8px */
  text-align: center;
}

.trading-card__title {
  font-family: var(--font-family-serif, 'Linux Libertine', Georgia, serif);
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
  padding: 3px 4px; /* halved from 6px 8px */
}

.trading-card__stars {
  display: flex;
  gap: 1.5px;
}

.trading-card__star-icon {
  width: 18px;
  height: 18px;
}

/* Style properties are handled dynamically/inline via template SVG attributes */

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
  background: var(--_area-bg);
  padding: 4px; /* halved from 8px */
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
  position: absolute;
  bottom: 0;
  left: 14px;
  right: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-family-system-sans, sans-serif);
  font-size: 7px;
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
  left: 4px;
  right: 4px;
  top: 0;
  bottom: 0;
  border-bottom: 1px solid #A2A9B1;
}
</style>
