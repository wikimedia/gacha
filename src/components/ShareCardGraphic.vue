<script setup lang="ts">
import type { Card } from '../stores/useGameStore';
import CardComp from './Card.vue';
import { SHARE_DOMAIN, SHARE_GRAPHIC_SIZE_VARS } from '../utils/shareCardImage';

// The 9:16 share graphic: the card framed by the wordmark and a
// "Collected at <domain>" footer. ShareCardSheet renders it scaled down as a
// preview and rasterizes it at natural size with html-to-image, so keep the
// layout static: no animation, no rarity foil, no external links. (Only real
// cards are shareable, hence no FAKE stamp.) The export must have square
// corners, so any preview rounding is applied by the parent.

defineProps<{
  card: Card;
}>();
</script>

<template>
  <div class="share-graphic" :style="SHARE_GRAPHIC_SIZE_VARS">
    <p class="share-graphic__wordmark">World of Wikipedia</p>
    <div class="share-graphic__card">
      <CardComp :card="card" :show-link="false" shiny-trigger="off"/>
    </div>
    <p class="share-graphic__footer">
      Collected at <strong>{{ SHARE_DOMAIN }}</strong>
    </p>
  </div>
</template>

<style scoped>
.share-graphic {
  /* Fixed 9:16 size from shareCardImage.ts, which derives the export
     resolution from it; the card fits at its natural 315px width (~73%).
     Keep the captured tree free of CSS zoom: engines lay out zoomed text
     differently inside html-to-image's SVG snapshot (WebKit overflowed the
     exported card), and zoom re-layout shifts line breaks between scales. */
  width: var(--share-graphic-width);
  height: var(--share-graphic-height);
  /* Sit the content block slightly above center, per the mock. */
  padding-bottom: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 17px;
  background-color: var(--color-cream);
}

.share-graphic__wordmark {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 31px;
  line-height: 41px;
  color: var(--color-ink);
}

.share-graphic__card {
  --card-scale-full: 1; /* neutralize Card.vue's display zoom */
  /* Pinned copy of the :root card size: the export is a fixed-format asset
     and must not follow any future responsive overrides of --card-base-*. */
  --card-base-width: 315px;
  --card-base-height: 440px;
  position: relative;
  flex-shrink: 0;
}

/* WebKit rasterizes blurred box-shadows as hard-edged slabs in the SVG
   snapshot html-to-image draws, so the card carries no shadow here. */
.share-graphic__card :deep(.trading-card) {
  box-shadow: none;
}

.share-graphic__footer {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 17px;
  line-height: 22px;
  color: var(--color-ink);
}
</style>
