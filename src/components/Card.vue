<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Card } from '../stores/useGameStore';
import { CATEGORY_SLUG } from '../stores/useGameStore';
import Stars from './Stars.vue';
import { PhArrowClockwise } from '@phosphor-icons/vue';

const PLACEHOLDER_IMAGE_URL = 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Missing-image-232x150.png';

const props = withDefaults(defineProps<{
  card: Card;
  showLink?: boolean;
}>(), {
  showLink: true
});

// ── Computed Properties ──────────────────────────────────────────
const categoryMapping = computed(() => ({
  main: props.card.category,
  sub: props.card.subCategory || '',
  cssClass: CATEGORY_SLUG[props.card.category] || 'civilization'
}));

const displayCategory = computed(() => {
  const cat = categoryMapping.value.sub || categoryMapping.value.main;
  if (!cat) return '';
  const parts = cat.split('/');
  return parts[parts.length - 1].trim();
});

const hasImage = computed(() => !!props.card.image);
const isCSSImage = computed(() => {
  const img = props.card.image || '';
  return img.startsWith('linear-gradient') || img.startsWith('url(');
});

// Track <img> load failures so we can swap in a placeholder. Reset when the
// card's image changes (e.g. the same Card component is reused for a new card).
const imageFailed = ref(false);
const imageRetryCount = ref(0);

watch(() => props.card.image, () => {
  imageFailed.value = false;
  imageRetryCount.value = 0;
});

const onImageError = () => {
  imageFailed.value = true;
};

// Cache-busted URL for retrying image loads
const imageUrl = computed(() => {
  const img = props.card.image;
  if (!img) return '';
  if (isCSSImage.value) return img;
  if (imageRetryCount.value === 0) return img;
  try {
    const separator = img.includes('?') ? '&' : '?';
    return `${img}${separator}retry=${imageRetryCount.value}`;
  } catch (e) {
    return img;
  }
});

const imageStyle = computed(() => {
  const img = imageUrl.value;
  if (!img) return null;
  return isCSSImage.value ? img : `url("${img}")`;
});

// Whether to show the placeholder image: either no image, or the real one failed.
const showPlaceholderImage = computed(() => !!PLACEHOLDER_IMAGE_URL && (!hasImage.value || imageFailed.value));

const handleRetry = () => {
  imageFailed.value = false;
  imageRetryCount.value++;
};

// Extract filename from Wikimedia Commons URL if applicable
const commonsFilename = computed(() => {
  const match = (props.card.image || '').match(/upload\.wikimedia\.org\/wikipedia\/commons\/[^/]+\/[^/]+\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
});

// Prefer the explicit attribution URL from Supabase; fall back to a
// Commons file page derived from the image URL, then the Wikipedia article.
const wikimediaImageLink = computed(() => {
  if (props.card.imageAttributionUrl) return props.card.imageAttributionUrl;
  if (commonsFilename.value) return `https://commons.wikimedia.org/wiki/File:${commonsFilename.value}`;
  return props.card.wikipediaLink;
});

// Build the attribution string from real DB columns when available.
const attributionText = computed(() => {
  const parts: string[] = [];

  // Credit (author / photographer)
  if (props.card.imageCredit) {
    parts.push(props.card.imageCredit);
  }

  // License
  if (props.card.imageLicense) {
    parts.push(props.card.imageLicense);
  }

  if (parts.length > 0) return parts.join(' / ');

  // Fallback: derive from image URL like before
  if (commonsFilename.value) {
    const filename = commonsFilename.value.replace(/_/g, ' ');
    const display = filename.length > 50 ? filename.slice(0, 50) + '…' : filename;
    return `Image: ${display} / Wikimedia Commons CC BY-SA`;
  }
  return 'en.wikipedia.org / Creative Commons Attribution-ShareAlike';
});

// Stable pseudo-random background position for the grain texture
const grainPosition = computed(() => {
  const offsets = ['left', 'center', 'right', '25%', '75%'];
  const seed = props.card.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return `${offsets[seed % offsets.length]} ${offsets[(seed >> 1) % offsets.length]}`;
});
</script>
 
<template>
  <div class="trading-card-wrapper">
    <div class="trading-card" :class="'trading-card--' + categoryMapping.cssClass">

      <!-- ① Image + image grain (clipped to inset area) -->
      <div class="trading-card__image-layer">
        <div v-if="hasImage && isCSSImage && !imageFailed"
          class="trading-card__image-bg"
          :style="{ backgroundImage: imageStyle! }"
        ></div>
        <img
          v-else-if="hasImage && !imageFailed"
          :src="imageUrl"
          loading="lazy"
          referrerpolicy="no-referrer"
          class="trading-card__image-bg trading-card__image-bg--img"
          alt="Card image"
          @error="onImageError"
        />
        <img
          v-else-if="showPlaceholderImage"
          :src="PLACEHOLDER_IMAGE_URL"
          class="trading-card__image-bg trading-card__image-bg--img"
          alt="Card image unavailable"
        />
        <div v-else class="trading-card__image-bg trading-card__image-bg--placeholder"></div>
        <div class="trading-card__image-grain" :style="{ backgroundPosition: grainPosition }"></div>
      </div>

      <!-- ③ Content (text, stars, etc.) -->
      <div class="trading-card__content">
        <div class="trading-card__title-area">
          <div class="trading-card__title-banner">
            <h3 class="trading-card__title">{{ card.title }}</h3>
          </div>
        </div>
        <div class="trading-card__spacer"></div>
        <div class="trading-card__attributes">
          <Stars :rarity="card.rarity" :size="12.5" class="trading-card__stars" />
          <span class="trading-card__category-label">
            {{ displayCategory }}
          </span>
        </div>
        <div class="trading-card__description-divider"></div>
        <div class="trading-card__description">
          <p>{{ card.description }}</p>
        </div>
      </div>

      <!-- Attribution -->
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
          {{ attributionText }}
        </span>
      </div>

      <!-- ② Full-card overlays (on top of everything, pointer-events: none) -->
      <div class="trading-card__border-grain"></div>
      <div class="trading-card__tint-layer"></div>
      <div class="trading-card__noise-layer"></div>
      <div class="trading-card__inner-shadow"></div>

      <!-- Retry Button Overlay (rendered on top of everything, pointer-events: auto) -->
      <div 
        v-if="imageFailed" 
        class="trading-card__retry-container"
        @mousedown.stop
        @mouseup.stop
        @click.stop
        @touchstart.stop
        @touchmove.stop
        @touchend.stop
      >
        <p class="trading-card__retry-message">Image failed to load</p>
        <button
          class="trading-card__retry-button"
          @click="handleRetry"
        >
          <PhArrowClockwise class="trading-card__retry-icon" />
          <span>Retry</span>
        </button>
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
/* Default / fallback */
.trading-card,
.trading-card--civilization {
  --_tint: var(--color-category-civilization);
  --_bg: var(--color-category-civilization-bg);
  --_bevel-tr: var(--color-category-civilization-bevel-tr);
  --_bevel-bl: var(--color-category-civilization-bevel-bl);
}

/* 6 active categories (slugs from CATEGORY_SLUG) */
.trading-card--sports {
  --_tint: var(--color-category-sports);
  --_bg: var(--color-category-sports-bg);
  --_bevel-tr: var(--color-category-sports-bevel-tr);
  --_bevel-bl: var(--color-category-sports-bevel-bl);
}

.trading-card--society {
  --_tint: var(--color-category-society);
  --_bg: var(--color-category-society-bg);
  --_bevel-tr: var(--color-category-society-bevel-tr);
  --_bevel-bl: var(--color-category-society-bevel-bl);
}

.trading-card--entertainment {
  --_tint: var(--color-category-entertainment);
  --_bg: var(--color-category-entertainment-bg);
  --_bevel-tr: var(--color-category-entertainment-bevel-tr);
  --_bevel-bl: var(--color-category-entertainment-bevel-bl);
}

.trading-card--earth {
  --_tint: var(--color-category-earth);
  --_bg: var(--color-category-earth-bg);
  --_bevel-tr: var(--color-category-earth-bevel-tr);
  --_bevel-bl: var(--color-category-earth-bevel-bl);
}

.trading-card--history {
  --_tint: var(--color-category-history);
  --_bg: var(--color-category-history-bg);
  --_bevel-tr: var(--color-category-history-bevel-tr);
  --_bevel-bl: var(--color-category-history-bevel-bl);
}

.trading-card--physical-science {
  --_tint: var(--color-category-physical-science);
  --_bg: var(--color-category-physical-science-bg);
  --_bevel-tr: var(--color-category-physical-science-bevel-tr);
  --_bevel-bl: var(--color-category-physical-science-bevel-bl);
}

/* Legacy aliases */
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
  overflow: hidden;
  isolation: isolate;
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
}

.trading-card__image-bg--img {
  object-fit: cover;
  display: block;
}

.trading-card__image-bg--placeholder {
  background: linear-gradient(135deg, #d5d0c8 0%, #c2bdb5 100%);
}

/* ── Image grain (inside image area only) ────────────────────── */
.trading-card__image-grain {
  position: absolute;
  inset: 0;
  background-image: url("/image-grain.png");
  background-repeat: repeat;
  background-size: 614px 410px;
  opacity: 0.43;
  mix-blend-mode: multiply;
  pointer-events: none;
}

/* ── Full-card overlays (border-grain, tint, noise, inner shadow) ── */
.trading-card__border-grain,
.trading-card__tint-layer,
.trading-card__noise-layer,
.trading-card__inner-shadow {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.trading-card__border-grain {
  background-image: url("/border-grain.png");
  background-repeat: repeat;
  background-size: 480px 612px;
  opacity: 0.28;
  mix-blend-mode: multiply;
  clip-path: polygon(
    evenodd,
    0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
    14px 14px, calc(100% - 14px) 14px, calc(100% - 14px) calc(100% - 14px), 14px calc(100% - 14px), 14px 14px
  );
}

.trading-card__tint-layer {
  background-color: var(--_tint);
  mix-blend-mode: hard-light;
}

.trading-card__noise-layer {
  background-image: url("/noise.png");
  background-repeat: repeat;
  opacity: .15;
  mix-blend-mode: multiply;
}

.trading-card__inner-shadow {
  box-shadow: inset 0 0 10.2px rgba(174, 162, 132, 0.58);
  mix-blend-mode: multiply;
}

/* ── Content layer ───────────────────────────────────────────── */
.trading-card__content {
  position: relative;
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

/* ── Retry Overlay ───────────────────────────────────────────── */
.trading-card__retry-container {
  position: absolute;
  inset: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(2.5px);
  border-radius: 0;
}

.trading-card__retry-message {
  color: #ffffff;
  font-family: var(--font-family-system-sans, sans-serif);
  font-size: 13px;
  font-weight: 500;
  margin: 0 0 12px 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  letter-spacing: 0.02em;
}

.trading-card__retry-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background-color: #ffffff;
  color: #202122;
  border: 1.5px solid #a2a9b1;
  padding: 6px 14px;
  border-radius: 4px;
  font-family: var(--font-family-system-sans, sans-serif);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
}

.trading-card__retry-button:hover {
  background-color: #f8f9fa;
  border-color: #72777d;
  color: #000000;
  transform: scale(1.05);
}

.trading-card__retry-button:active {
  background-color: #eaecf0;
  transform: scale(0.95);
}

.trading-card__retry-icon {
  width: 14px;
  height: 14px;
  transition: transform 0.4s ease;
}

.trading-card__retry-button:hover .trading-card__retry-icon {
  transform: rotate(180deg);
}
</style>
