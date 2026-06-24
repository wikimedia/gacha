<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
  muted?: boolean;
  size?: number;
}>(), {
  muted: false,
  size: 20
});

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

const STAR_PATH = 'M15.9302 8.49121H23.125L23.8843 10.7349L18.009 15.2209L20.2612 22.5061L18.3081 23.8684L12.5 19.4312L6.69189 23.8684L4.73877 22.5061L6.98975 15.2209L1.11572 10.7349L1.875 8.49121H9.06982L11.3062 1.2561H13.6938L15.9302 8.49121Z';

const starCount = computed(() => RARITY_STARS[props.rarity] || 1);

const fillStyle = computed(() => {
  return STAR_STYLES[props.rarity]?.fill || '#595C5F';
});

const strokeStyle = computed(() => {
  return STAR_STYLES[props.rarity]?.stroke || '#404244';
});
</script>

<template>
  <div class="stars-display flex items-center">
    <svg 
      v-for="i in starCount" 
      :key="i"
      xmlns="http://www.w3.org/2000/svg" 
      :width="size" 
      :height="size" 
      viewBox="0 0 25 25"
      class="star-icon"
      :class="{ 'star-icon--muted': muted }"
    >
      <path 
        :d="STAR_PATH" 
        :fill="fillStyle" 
        :stroke="strokeStyle" 
        stroke-width="2" 
        stroke-linejoin="bevel"
      />
    </svg>
  </div>
</template>

<style scoped>
.stars-display {
  display: inline-flex;
  gap: 1.5px;
}
.star-icon {
  display: block;
}
.star-icon--muted {
  opacity: 0.25;
}
</style>
