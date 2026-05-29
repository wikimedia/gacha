<script setup lang="ts">
import { computed } from 'vue';
import type { Card } from '../stores/useGameStore';

const props = defineProps<{
  card: Card;
  showLink?: boolean;
  disableHover3d?: boolean;
}>();

// Rarity color configurations based on Wikipedia's normcore palette + subtle premium cues
const rarityConfig = computed(() => {
  switch (props.card.rarity) {
    case 'Legendary':
      return {
        borderClass: 'border-2 border-[#d4af37]',
        badgeBg: 'bg-[#fef6e7] text-[#ac6600] border border-[#f3d999]',
        badgeText: 'Featured Article ★',
        bgClass: 'bg-white',
        textStyle: 'wiki-serif font-bold text-[#b32424]', // Wikipedia red header
        iconColor: '#d4af37',
        shadow: 'shadow-[0_0_15px_rgba(212,175,55,0.25)]'
      };
    case 'Epic':
      return {
        borderClass: 'border-2 border-[#72777d]',
        badgeBg: 'bg-[#f8f9fa] text-[#202122] border border-[#a2a9b1]',
        badgeText: 'A-Class Article',
        bgClass: 'bg-white',
        textStyle: 'wiki-serif font-bold text-[#202122]',
        iconColor: '#72777d',
        shadow: 'shadow-[0_0_10px_rgba(114,119,125,0.15)]'
      };
    case 'Rare':
      return {
        borderClass: 'border border-[#a2a9b1]',
        badgeBg: 'bg-[#eaecf0] text-[#54595d] border border-[#c8ccd1]',
        badgeText: 'Good Article',
        bgClass: 'bg-white',
        textStyle: 'wiki-serif font-semibold text-[#202122]',
        iconColor: '#36c',
        shadow: 'shadow-sm'
      };
    case 'Common':
    default:
      return {
        borderClass: 'border border-[#e5e5e5]',
        badgeBg: 'bg-[#f8f9fa] text-[#72777d]',
        badgeText: 'Stub',
        bgClass: 'bg-[#f8f9fa]',
        textStyle: 'wiki-serif text-[#202122]',
        iconColor: '#72777d',
        shadow: 'shadow-none'
      };
  }
});
</script>

<template>
  <!-- DaisyUI 3D Hover tilt wrapper (disabled if disableHover3d is true) -->
  <div 
    :class="[
      disableHover3d ? 'relative' : 'hover-3d relative',
      'w-full max-w-[280px] h-[380px] rounded-sm transition-all duration-300'
    ]"
  >
    
    <!-- Real card container -->
    <div 
      class="h-full w-full flex flex-col justify-between p-4 bg-white select-none wiki-border text-left relative overflow-hidden transition-shadow"
      :class="[rarityConfig.borderClass, rarityConfig.bgClass, rarityConfig.shadow]"
    >
      
      <!-- Top Section: Category and Rarity Badge -->
      <div>
        <div class="flex items-center justify-between text-xs mb-2">
          <span class="text-wiki-muted uppercase tracking-wider font-semibold font-sans">
            {{ card.category }}
          </span>
          <span class="px-2 py-0.5 rounded-sm font-sans font-medium text-[10px]" :class="rarityConfig.badgeBg">
            {{ rarityConfig.badgeText }}
          </span>
        </div>
        
        <!-- Divider -->
        <div class="h-[1px] bg-[#a2a9b1] w-full mb-3"></div>

        <!-- Main Card Header -->
        <h3 class="text-lg leading-tight mb-1" :class="rarityConfig.textStyle">
          {{ card.title }}
        </h3>
        
        <!-- Wikipedia Style Citation / Sub-title -->
        <p class="text-[10px] text-wiki-muted font-sans mb-3 italic">
          From Wikipedia, the free encyclopedia gacha
        </p>

        <!-- Generative Visual Representation (Wikipedia Style Diagrams) -->
        <div 
          class="w-full h-24 mb-3 rounded-sm flex items-center justify-center relative overflow-hidden wiki-border bg-opacity-10"
          :style="{ background: card.image }"
        >
          <!-- Technical Drawing Backdrop (Geometric Mesh) -->
          <div class="absolute inset-0 opacity-10 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"></div>
          
          <div class="z-10 text-white font-serif text-3xl font-extrabold select-none filter drop-shadow-md opacity-40">
            W
          </div>
          
          <!-- Subtle watermark for legendary cards -->
          <div v-if="card.rarity === 'Legendary'" class="absolute right-2 bottom-1 text-white opacity-45 text-lg">
            ★
          </div>
        </div>

        <!-- Short Codex styled article lead description -->
        <p class="text-xs text-wiki-text leading-relaxed line-clamp-4 font-sans font-light">
          {{ card.description }}
        </p>
      </div>

      <!-- Bottom Actions/Links: Pure Wikipedia Citation style -->
      <div class="mt-2 text-[10px] flex items-center justify-between text-wiki-muted font-sans">
        <span>ID: {{ card.id }}</span>
        <a 
          v-if="showLink !== false"
          :href="card.wikipediaLink" 
          target="_blank" 
          class="text-wiki-blue hover:underline inline-flex items-center gap-0.5"
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
