<script setup lang="ts">
import BaseSheet from './BaseSheet.vue';
import AppIcon from './AppIcon.vue';
import { cdxIconLinkExternal } from '@wikimedia/codex-icons';
import { TOPICS, type TopicOption } from '../data/categories';

defineProps<{
  open: boolean;
  /** Disables the Play buttons while a game is being started. */
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
    <ul class="topic-list">
      <li v-for="topic in topics" :key="topic.code" class="topic-row">
        <div class="topic-row__thumb">
          <img :src="topic.image" :alt="topic.label" class="topic-row__img" loading="lazy" />
        </div>

        <div class="topic-row__body">
          <span class="topic-row__title">{{ topic.label }}</span>
          <a
            class="topic-row__attribution"
            :href="topic.attributionUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            <AppIcon :icon="cdxIconLinkExternal" :size="14" class="topic-row__attribution-icon" />
            <span class="topic-row__attribution-text">{{ topic.attribution }}</span>
          </a>
        </div>

        <button
          class="topic-row__play"
          :disabled="starting"
          @click="emit('select', topic)"
        >
          Play
        </button>
      </li>
    </ul>

    <p class="topic-credit">
      Content adapted from
      <a href="https://www.wikipedia.org" target="_blank" rel="noopener noreferrer">Wikipedia</a>
      and
      <a href="https://commons.wikimedia.org" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>.
    </p>
  </BaseSheet>
</template>

<style scoped>
.topic-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding: 4px 16px 8px;
  list-style: none;
}

.topic-row {
  display: flex;
  align-items: stretch;
  gap: 12px;
  /* Fixed height so every row is uniform regardless of text length; the
     thumbnail (object-fit: cover) is cropped to fill it. */
  height: 96px;
  /* No padding: the thumbnail bleeds to the card's edges. `overflow: hidden`
     clips the frameless image's corners to the card's rounded curve. */
  padding: 0;
  /* Same fill as the sheet; the row is defined by its border, not a fill. */
  background-color: transparent;
  border: 1px solid var(--color-border-neutral);
  border-radius: 12px;
  overflow: hidden;
}

.topic-row__thumb {
  flex-shrink: 0;
  width: 92px;
  align-self: stretch; /* fill the row height so the image reaches top and bottom */
  background-color: var(--color-base-300);
}

.topic-row__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.topic-row__body {
  flex: 1 1 auto;
  min-width: 0; /* allow the attribution text to truncate instead of overflowing */
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}

.topic-row__title {
  font-family: var(--font-sans);
  font-size: 16px;
  font-weight: 700;
  color: var(--color-ink);
}

.topic-row__attribution {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  max-width: 100%;
  color: var(--color-text-muted);
  text-decoration: none;
}

.topic-row__attribution:hover .topic-row__attribution-text {
  text-decoration: underline;
}

.topic-row__attribution-icon {
  flex-shrink: 0;
}

.topic-row__attribution-text {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 13px;
}

.topic-row__play {
  flex-shrink: 0;
  align-self: center;
  margin-right: 12px; /* row has no padding, so the button sets its own right inset */
  padding: 8px 22px;
  border: none;
  border-radius: 8px;
  background-color: var(--color-rust);
  color: var(--color-white);
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.1s ease;
}

.topic-row__play:hover {
  background-color: var(--color-rust-dark);
}

.topic-row__play:active {
  transform: scale(0.96);
}

.topic-row__play:disabled {
  opacity: 0.5;
  pointer-events: none;
}

.topic-credit {
  margin: 4px 0 0;
  padding: 0 16px;
  font-size: 14px;
  line-height: 18px;
  color: var(--color-text-muted);
  text-align: left;
}

.topic-credit a {
  color: var(--color-blue);
  text-decoration: underline;
}
</style>
