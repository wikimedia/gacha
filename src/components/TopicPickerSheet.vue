<script setup lang="ts">
import BaseSheet from './BaseSheet.vue';
import { TOPICS, type TopicOption } from '../data/categories';

defineProps<{
  open: boolean;
  /** Disables the tiles while a game is being started. */
  starting?: boolean;
}>();

const emit = defineEmits<{
  (e: 'select', topic: TopicOption): void;
  (e: 'close'): void;
}>();

const topics = TOPICS;
</script>

<template>
  <BaseSheet :open="open" title="Pick a Topic" @close="emit('close')">
    <div class="grid grid-cols-2 gap-4 px-4 py-2">
      <button
        v-for="topic in topics"
        :key="topic.code"
        class="topic-tile"
        :disabled="starting"
        @click="emit('select', topic)"
      >
        <div class="topic-tile__thumb">
          <img :src="topic.image" :alt="topic.label" class="topic-tile__img" loading="lazy" />
        </div>
        <span class="topic-tile__label">{{ topic.label }}</span>
      </button>
    </div>
  </BaseSheet>
</template>

<style scoped>
.topic-tile {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  padding: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.topic-tile:active {
  transform: scale(0.96);
}

.topic-tile:disabled {
  opacity: 0.5;
  pointer-events: none;
}

.topic-tile__thumb {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 4px;
  overflow: hidden;
  background-color: var(--color-base-300);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  border: 2px solid transparent;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.topic-tile:hover .topic-tile__thumb {
  border-color: var(--color-ink);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1), 0 6px 16px rgba(0, 0, 0, 0.3);
}

.topic-tile__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.topic-tile:hover .topic-tile__img {
  transform: scale(1.06);
}

.topic-tile__label {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  background-color: var(--color-cream);
  color: var(--color-ink);
  border-radius: 2px;
  font-family: var(--font-serif);
  font-size: 12px;
  font-weight: bold;
  text-align: center;
  padding: 0 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}
</style>
