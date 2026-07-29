<script setup lang="ts">
import type { Card } from '../stores/useGameStore';
import CardComp from './Card.vue';
import { SHARE_DOMAIN } from '../utils/shareCardImage';

// The vertical-format share graphic: the card framed by the wordmark and a
// footer with the site domain plus the card owner's username. ShareCardSheet
// renders it scaled down as a preview and rasterizes it at natural size with
// html-to-image, so keep the layout static: no animation, no rarity foil,
// no external links. (Only real cards are shareable, hence no FAKE stamp.)

defineProps<{
  card: Card;
  /** Card owner's username; null/undefined (guests) shows the domain only. */
  username?: string | null;
}>();
</script>

<template>
  <div class="share-graphic">
    <p class="share-graphic__wordmark">World of Wikipedia</p>
    <div class="share-graphic__card">
      <CardComp :card="card" :show-link="false" shiny-trigger="off" />
    </div>
    <p class="share-graphic__footer">
      {{ username ? `${SHARE_DOMAIN} | @${username}` : SHARE_DOMAIN }}
    </p>
  </div>
</template>

<style scoped>
.share-graphic {
  /* Fixed natural size; ShareCardSheet's preview sizing depends on it. */
  width: 371px;
  height: 566px;
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  background-color: var(--color-cream);
  border-radius: 8px;
}

.share-graphic__wordmark {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 22px;
  line-height: 30px;
  color: var(--color-ink);
}

.share-graphic__card {
  position: relative;
  flex-shrink: 0;
}

.share-graphic__footer {
  height: 18px;
  margin: 0;
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 600;
  line-height: 18px;
  color: var(--color-text-muted);
}
</style>
