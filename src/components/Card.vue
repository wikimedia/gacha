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

const imageStyle = computed(() => {
  const img = props.card.image || '';
  if (!img) {
    return 'linear-gradient(135deg, var(--background-color-neutral-subtle), var(--border-color-interactive))';
  }
  if (img.startsWith('linear-gradient') || img.startsWith('url(')) {
    return img;
  }
  return `url(${img})`;
});

const hasImage = computed(() => {
  return !!props.card.image;
});
</script>

<template>
  <div 
    class="card card-bordered w-full max-w-[280px] h-[380px] flex flex-col justify-between p-4 bg-white border border-base-300 shadow-sm select-none text-left relative overflow-hidden transition-shadow duration-300"
  >
    <!-- Top Section: Category and Rarity Badge -->
    <div>
      <div class="flex items-center justify-between text-[10px] mb-2 font-sans">
        <span class="text-secondary uppercase tracking-widest font-extrabold">
          {{ card.category }}
        </span>
        <span class="badge badge-xs px-2 py-1.5" :class="rarityConfig.badgeBg">
          {{ rarityConfig.badgeText }}
        </span>
      </div>
      
      <!-- Divider -->
      <div class="h-[1px] bg-base-300 w-full mb-3"></div>

      <!-- Main Card Header - Unified styling for all cards -->
      <h3 class="text-base leading-tight mb-1 wiki-serif font-black text-base-content">
        {{ card.title }}
      </h3>
      
      <!-- Wikipedia Style Citation / Sub-title -->
      <p class="text-[9px] text-secondary font-sans mb-3 italic">
        From Wikipedia, the free encyclopedia gacha
      </p>

      <!-- Generative Visual Representation (Wikipedia Style Diagrams & Images) -->
      <div 
        v-if="hasImage"
        class="w-full h-24 mb-3 rounded border border-base-300 flex items-center justify-center relative overflow-hidden"
        :style="{ 
          backgroundImage: imageStyle, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center', 
          backgroundRepeat: 'no-repeat' 
        }"
      ></div>

      <!-- Short Codex styled article lead description -->
      <p class="text-xs text-base-content/85 leading-relaxed line-clamp-4 font-sans font-light">
        {{ card.description }}
      </p>
    </div>

    <!-- Bottom Actions/Links: Pure Wikipedia Citation style -->
    <div class="mt-2 text-[9px] flex items-center justify-between text-secondary font-sans border-t border-base-200/60 pt-2">
      <span>ID: {{ card.id }}</span>
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
