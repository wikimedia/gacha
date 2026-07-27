<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import type { Card } from '../stores/useGameStore';

// Placeholder for the flipped ("back") side of a detail card. The full
// backside design from Figma — trust signals (views, "supported by"
// contributors / references / sources), last-updated date and the Wikipedia
// footer — will be built out here later. For now this is an intentional stub
// that fills the card and matches its size / corner radius so the flip reads
// correctly.
const props = defineProps<{
  card: Card;
}>();

// Trust & relevance signals from the MediaWiki attribution API. The shape is
// intentionally loose for now; the rendered backside will consume this once
// the full design is built.
const signals = ref<Record<string, unknown> | null>(null);
const isLoading = ref(false);
const hasError = ref(false);

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 800;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let controller: AbortController | null = null;

async function fetchSignals() {
  const title = props.card.title?.trim();
  if (!title) return;

  const path = encodeURIComponent(title.replace(/ /g, '_'));
  const url =
    `https://en.wikipedia.org/w/rest.php/attribution/v0-beta/pages/${path}` +
    `/signals?redirect=true&expand=trust_and_relevance`;

  const ctrl = new AbortController();
  controller = ctrl;
  isLoading.value = true;
  hasError.value = false;

  // Retry transient failures (network / 5xx / 429) with a linear backoff;
  // permanent client errors (e.g. 404) are not worth retrying.
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { accept: 'application/json' },
        signal: ctrl.signal,
      });
      if (res.ok) {
        signals.value = await res.json();
        isLoading.value = false;
        return;
      }
      if (res.status < 500 && res.status !== 429) break;
    } catch {
      if (ctrl.signal.aborted) return; // component unmounted mid-flight
    }
    if (attempt < MAX_RETRIES) await wait(RETRY_BASE_MS * (attempt + 1));
  }

  if (ctrl.signal.aborted) return;
  hasError.value = true;
  isLoading.value = false;
}

onMounted(fetchSignals);
onUnmounted(() => controller?.abort());
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
