<script setup lang="ts">
import { computed } from 'vue';
import type { Card } from '../stores/useGameStore';

const props = withDefaults(defineProps<{
  card: Card;
  showLink?: boolean;
  disableHover3d?: boolean;
  swipeOffset?: number;
  roundAnswered?: boolean;
}>(), {
  showLink: true,
  disableHover3d: false,
  swipeOffset: 0,
  roundAnswered: false
});

// Rarity color configurations based on DaisyUI theme mappings + Codex values
const rarityConfig = computed(() => {
  switch (props.card.rarity) {
    case 'Legendary':
      return {
        borderClass: 'border-2 border-warning/60',
        badgeBg: 'badge-warning text-warning-content font-bold',
        badgeText: 'Legendary',
        bgClass: 'bg-base-100',
        textStyle: 'wiki-serif font-bold text-error',
        iconColor: 'text-warning',
        shadow: 'shadow-lg shadow-warning/10'
      };
    case 'Epic':
      return {
        borderClass: 'border-2 border-secondary/40',
        badgeBg: 'badge-neutral text-neutral-content font-bold',
        badgeText: 'Epic',
        bgClass: 'bg-base-100',
        textStyle: 'wiki-serif font-bold text-base-content',
        iconColor: 'text-secondary',
        shadow: 'shadow-md shadow-secondary/5'
      };
    case 'Rare':
      return {
        borderClass: 'border border-primary/50',
        badgeBg: 'badge-primary text-primary-content font-bold',
        badgeText: 'Rare',
        bgClass: 'bg-base-100',
        textStyle: 'wiki-serif font-bold text-base-content',
        iconColor: 'text-primary',
        shadow: 'shadow-sm shadow-primary/5'
      };
    case 'Common':
    default:
      return {
        borderClass: 'border border-base-300',
        badgeBg: 'badge-ghost text-base-content/70',
        badgeText: 'Common',
        bgClass: 'bg-base-200/40',
        textStyle: 'wiki-serif text-base-content',
        iconColor: 'text-base-content/60',
        shadow: 'shadow-none'
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
  <!-- DaisyUI 3D Hover tilt wrapper (disabled if disableHover3d is true) -->
  <div 
    :class="[
      disableHover3d ? 'relative' : 'hover-3d relative',
      'w-full max-w-[280px] h-[380px] rounded transition-all duration-300'
    ]"
  >
    
    <!-- Real card container using DaisyUI styles -->
    <div 
      class="card card-bordered h-full w-full flex flex-col justify-between p-4 bg-base-100 select-none text-left relative overflow-hidden transition-shadow duration-300"
      :class="[rarityConfig.borderClass, rarityConfig.bgClass, rarityConfig.shadow]"
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

        <!-- Main Card Header -->
        <h3 class="text-base leading-tight mb-1" :class="rarityConfig.textStyle">
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

      <!-- Swiping Indicators Overlay -->
      <div 
        v-if="swipeOffset !== 0 && !roundAnswered"
        class="absolute inset-0 flex items-center justify-center font-bold text-2xl uppercase pointer-events-none z-40 transition-all"
        :class="[
          swipeOffset > 30 ? 'bg-success/20 text-success' : '',
          swipeOffset < -30 ? 'bg-error/20 text-error' : ''
        ]"
      >
        <div v-if="swipeOffset > 30" class="px-4 py-2 border-4 border-success bg-base-100 rounded shadow-md font-sans">
          ✓ Real
        </div>
        <div v-if="swipeOffset < -30" class="px-4 py-2 border-4 border-error bg-base-100 rounded shadow-md font-sans">
          ✕ Fake
        </div>
      </div>
      
    </div>

    <!-- 8 empty divs required for DaisyUI hover-3d dynamic tilt mechanics (omitted if disabled) -->
    <template v-if="!disableHover3d">
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
    </template>
  </div>
</template>

<style scoped>
/* Inline styling to support the hover-3d rotations */
.hover-3d {
  transform-style: preserve-3d;
}

.hover-3d > div:first-child {
  transition: transform 0.2s ease-out, shadow 0.2s ease-out;
}

/* Zone mapping for the 8 empty absolute divs overlay */
.hover-3d > div:not(:first-child) {
  position: absolute;
  z-index: 20;
  width: 33.33%;
  height: 50%;
  opacity: 0;
}

/* Zone coordinates:
   Zone 2: Top Left, Zone 3: Top Middle, Zone 4: Top Right
   Zone 5: Bottom Left, Zone 6: Bottom Middle, Zone 7: Bottom Right */
.hover-3d > div:nth-child(2) { top: 0; left: 0; }
.hover-3d > div:nth-child(3) { top: 0; left: 33.33%; }
.hover-3d > div:nth-child(4) { top: 0; left: 66.66%; }
.hover-3d > div:nth-child(5) { top: 50%; left: 0; }
.hover-3d > div:nth-child(6) { top: 50%; left: 33.33%; }
.hover-3d > div:nth-child(7) { top: 50%; left: 66.66%; }

/* Applying custom tilt transforms based on active hover zone */
.hover-3d > div:nth-child(2):hover ~ div:first-child {
  transform: rotateX(6deg) rotateY(-6deg) scale(1.02);
}
.hover-3d > div:nth-child(3):hover ~ div:first-child {
  transform: rotateX(6deg) rotateY(0deg) scale(1.02);
}
.hover-3d > div:nth-child(4):hover ~ div:first-child {
  transform: rotateX(6deg) rotateY(6deg) scale(1.02);
}
.hover-3d > div:nth-child(5):hover ~ div:first-child {
  transform: rotateX(-6deg) rotateY(-6deg) scale(1.02);
}
.hover-3d > div:nth-child(6):hover ~ div:first-child {
  transform: rotateX(-6deg) rotateY(0deg) scale(1.02);
}
.hover-3d > div:nth-child(7):hover ~ div:first-child {
  transform: rotateX(-6deg) rotateY(6deg) scale(1.02);
}
</style>
