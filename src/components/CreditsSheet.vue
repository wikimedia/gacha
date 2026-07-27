<script setup lang="ts">
import { computed } from 'vue';
import { PhUser } from '@phosphor-icons/vue';
import BaseSheet from './BaseSheet.vue';
import type { Category } from '../stores/useGameStore';
import { CATEGORY_HOME_CONFIG, type CollageAttribution } from '../data/categories';

const props = defineProps<{
  open: boolean;
  category?: Category;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const credits = computed<CollageAttribution[]>(
  () => CATEGORY_HOME_CONFIG[props.category ?? 'Media'].collageCredits
);
</script>

<template>
  <BaseSheet :open="open" title="Credits" @close="emit('close')">
    <!-- Subtitle -->
    <p class="credits-intro px-4 pb-1 text-sm m-0 text-ink">
      Content adapted from
      <a
        href="https://www.wikipedia.org"
        target="_blank"
        rel="noopener noreferrer"
        class="text-primary no-underline hover:underline"
      >Wikipedia</a>
      and
      <a
        href="https://commons.wikimedia.org"
        target="_blank"
        rel="noopener noreferrer"
        class="text-primary no-underline hover:underline"
      >Wikimedia Commons</a>.
    </p>

    <!-- Attribution cards -->
    <div class="flex flex-col gap-2 px-4 py-2">
      <a
        v-for="(item, i) in credits"
        :key="i"
        :href="item.url"
        target="_blank"
        rel="noopener noreferrer"
        class="credits-card flex gap-3 items-start p-3 no-underline cursor-pointer"
      >
        <div class="credits-card__thumb shrink-0 border border-ink">
          <img
            :src="item.thumbnail"
            :alt="item.title"
            class="w-full h-full object-cover"
          />
        </div>
        <div class="flex-1 min-w-0 flex flex-col justify-center gap-1">
          <p class="font-bold text-sm leading-5 m-0 text-ink">{{ item.title }}</p>
          <p class="text-sm leading-5 m-0 text-secondary">{{ item.license }}</p>
          <div class="flex gap-1 items-start pt-1">
            <PhUser :size="14" weight="fill" class="shrink-0 mt-0.5 text-secondary" />
            <p class="flex-1 min-w-0 text-xs leading-5 m-0 text-secondary">{{ item.author }}</p>
          </div>
        </div>
      </a>
    </div>
  </BaseSheet>
</template>

<style scoped>
.credits-intro {
  line-height: 22px;
}

/* Warm tan specific to the credits cards; not part of the shared palette. */
.credits-card {
  --credits-card-bg: #e5d8c6;
  --credits-card-bg-hover: #ddcdb8;
  --credits-card-radius: 10px;
  border-radius: var(--credits-card-radius);
  background-color: var(--credits-card-bg);
  transition: background-color 0.15s ease, transform 0.1s ease;
}

.credits-card__thumb {
  width: 52px;
  height: 72px;
  border-radius: var(--credits-card-radius);
  overflow: hidden;
}

.credits-card:hover {
  background-color: var(--credits-card-bg-hover);
}

.credits-card:active {
  transform: scale(0.99);
}
</style>
