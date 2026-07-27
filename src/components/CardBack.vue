<script setup lang="ts">
import type { Card } from '../stores/useGameStore';

// Placeholder for the flipped ("back") side of a detail card. The full
// backside design from Figma — trust signals (views, "supported by"
// contributors / references / sources), last-updated date and the Wikipedia
// footer — will be built out here later. For now this is an intentional stub
// that fills the card and matches its size / corner radius so the flip reads
// correctly.
defineProps<{
  card: Card;
}>();
</script>

<template>
  <div class="card-back">
    <div class="card-back__body">
      <p class="card-back__title">{{ card.title }}</p>
      <p class="card-back__hint">More about this card coming soon</p>
    </div>
  </div>
</template>

<style scoped>
.card-back {
  width: 100%;
  height: 100%;
  border-radius: 11.5px; /* matches .trading-card in Card.vue */
  border: 1px solid var(--color-border-subtle);
  background: linear-gradient(180deg, var(--color-surface) 55%, #dbe6f5 100%);
  box-shadow: 0 0 4.8px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.card-back__body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}

.card-back__title {
  font-family: var(--font-serif);
  font-weight: 700;
  font-size: 20px;
  color: var(--color-ink);
}

.card-back__hint {
  font-family: var(--font-sans);
  font-size: 13px;
  color: var(--color-text-muted);
}
</style>
