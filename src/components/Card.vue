<script setup lang="ts">
import { computed } from 'vue';
import type { Card } from '../stores/useGameStore';

const props = withDefaults(defineProps<{
  card: Card;
  showLink?: boolean;
}>(), {
  showLink: true
});

// Rarity configurations for the badge inside the card
const rarityConfig = computed(() => {
  switch (props.card.rarity) {
    case 'Legendary':
      return {
        badgeBg: 'badge-warning text-warning-content font-bold',
        badgeText: 'Legendary'
      };
    case 'Epic':
      return {
        badgeBg: 'badge-neutral text-neutral-content font-bold',
        badgeText: 'Epic'
      };
    case 'Rare':
      return {
        badgeBg: 'badge-primary text-primary-content font-bold',
        badgeText: 'Rare'
      };
    case 'Common':
    default:
      return {
        badgeBg: 'badge-ghost text-base-content/70',
        badgeText: 'Common'
      };
  }
});

// Category configurations for matching colors
const categoryConfig = computed(() => {
  switch (props.card.category) {
    case 'Science':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200 font-bold';
    case 'History':
      return 'bg-amber-100 text-amber-800 border-amber-200 font-bold';
    case 'Pop Culture':
      return 'bg-purple-100 text-purple-800 border-purple-200 font-bold';
    case 'Geography':
      return 'bg-blue-100 text-blue-800 border-blue-200 font-bold';
    default:
      return 'bg-base-200 text-base-content/80 border-base-300 font-bold';
  }
});

const imageStyle = computed(() => {
  const img = props.card.image || '';
  if (!img) {
    return 'linear-gradient(135deg, var(--background-color-neutral-subtle), var(--border-color-interactive))';
  }
  if (img.startsWith('linear-gradient') || img.startsWith('url(')) {
    return img;
  }
  return `url("${img}")`;
});

const hasImage = computed(() => {
  return !!props.card.image;
});

const isCSSImage = computed(() => {
  const img = props.card.image || '';
  return img.startsWith('linear-gradient') || img.startsWith('url(');
});
</script>

<template>
  <div 
    class="card card-bordered w-full max-w-[280px] h-[400px] flex flex-col justify-between p-4 bg-white border border-base-300 shadow-sm select-none text-left relative overflow-hidden transition-shadow duration-300"
  >
    <!-- Top Section: Header with Title -->
    <div class="w-full">
      <div class="mb-2">
        <h3 class="text-base leading-tight wiki-serif font-black text-base-content">
          {{ card.title }}
        </h3>
      </div>
      
      <!-- Divider -->
      <div class="h-[1px] bg-base-300 w-full mb-3"></div>

      <!-- Generative Visual Representation (Wikipedia Style Diagrams & Images) -->
      <div 
        v-if="hasImage"
        class="w-full aspect-[4/3] min-h-[150px] mb-2.5 rounded border border-base-300 flex items-center justify-center relative overflow-hidden bg-base-200"
      >
        <div 
          v-if="isCSSImage"
          class="w-full h-full"
          :style="{ 
            backgroundImage: imageStyle, 
            backgroundSize: 'cover', 
            backgroundPosition: 'center', 
            backgroundRepeat: 'no-repeat' 
          }"
        ></div>
        <img 
          v-else
          :src="props.card.image"
          referrerpolicy="no-referrer"
          class="w-full h-full object-cover"
          alt="Card Image"
        />
      </div>

      <!-- Card Attributes (Pills) underneath the image -->
      <div class="flex flex-wrap gap-1.5 mb-2.5">
        <span class="badge badge-xs px-2 py-1.5 text-[8px] uppercase tracking-wide border" :class="categoryConfig">
          {{ card.category }}
        </span>
        <span class="badge badge-xs px-2 py-1.5 text-[8px] uppercase tracking-wide" :class="rarityConfig.badgeBg">
          {{ rarityConfig.badgeText }}
        </span>
      </div>

      <!-- Short Codex styled article lead description -->
      <p class="text-xs text-base-content/85 leading-relaxed line-clamp-4 font-sans font-light">
        {{ card.description }}
      </p>
    </div>

    <!-- Bottom Actions/Links: Pure Wikipedia Citation style -->
    <div class="mt-2 text-[9px] flex items-center justify-end text-secondary font-sans border-t border-base-200/60 pt-2">
      <a 
        v-if="showLink !== false"
        :href="card.wikipediaLink" 
        target="_blank" 
        class="link link-primary inline-flex items-center gap-0.5 font-bold no-underline hover:underline"
        @click.stop
      >
        View article
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 20 20" fill="currentColor">
          <path d="M17 17H3V3h5V1H3a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-5h-2v5z"/>
          <path d="M19 1v7h-2V4.41l-7.29 7.3-1.42-1.42L15.58 3H12V1h7z"/>
        </svg>
      </a>
    </div>
  </div>
</template>
