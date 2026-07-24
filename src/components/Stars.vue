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

const STAR_PATH = 'M15.9302 8.49121H23.125L23.8843 10.7349L18.009 15.2209L20.2612 22.5061L18.3081 23.8684L12.5 19.4312L6.69189 23.8684L4.73877 22.5061L6.98975 15.2209L1.11572 10.7349L1.875 8.49121H9.06982L11.3062 1.2561H13.6938L15.9302 8.49121Z';

const starCount = computed(() => RARITY_STARS[props.rarity] || 1);
const rarityClass = computed(() => `star-icon--${props.rarity.toLowerCase()}`);
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
      :class="[rarityClass, { 'star-icon--muted': muted }]"
    >
      <path
        :d="STAR_PATH"
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

/* Star colors are specific to this component (the card rarity palette is a
   separate, more muted set). Default matches Common so an unexpected rarity
   value still renders sanely. */
.star-icon {
  --_fill: #595c5f;
  --_stroke: #404244;
}
.star-icon--uncommon {
  --_fill: #a8b0b7;
  --_stroke: #72777d;
}
.star-icon--rare {
  --_fill: #987027;
  --_stroke: #ca982e;
}
.star-icon--epic {
  --_fill: #fff;
  --_stroke: #404244;
}
.star-icon--legendary {
  --_fill: #ffcf4f;
  --_stroke: #ab7f2a;
}
.star-icon path {
  fill: var(--_fill);
  stroke: var(--_stroke);
}
</style>
