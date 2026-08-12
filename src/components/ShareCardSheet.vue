<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import type { Card } from '../stores/useGameStore';
import BaseSheet from './BaseSheet.vue';
import ShareCardGraphic from './ShareCardGraphic.vue';
import AppIcon from './AppIcon.vue';
import { cdxIconCopy, cdxIconCheck } from '@wikimedia/codex-icons';
import {
  canShareImageFiles,
  captureElementToPng,
  shareImageFile,
  downloadBlob,
  shareFilename,
  SHARE_DOMAIN,
  SHARE_GRAPHIC_SIZE_VARS,
} from '../utils/shareCardImage';
import { trackEvent } from '../analytics.ts';

// Bottom sheet for sharing a card as an image. Where the browser can share
// files (mobile), the primary action hands the PNG to the native share
// sheet; elsewhere it downloads. The copy action copies the share message —
// individual cards are deliberately not linkable.
const props = defineProps<{
  open: boolean;
  card: Card | null;
  /** Card owner's username; null for guests. */
  username?: string | null;
  /** Whether the viewer owns the collection the card comes from. */
  isOwnCollection?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const canShareFiles = canShareImageFiles();

const graphicRef = ref<InstanceType<typeof ShareCardGraphic> | null>(null);
const isProcessing = ref(false);
// Latches once a share/download succeeds for the current open sheet. The
// capture is pre-cached so `isProcessing` resolves within a microtask, which
// leaves it useless against a double-click (the first tap finishes before the
// second arrives). This flag stays set until the sheet reopens, so a
// double-click can't fire two identical downloads. Cancelled/failed attempts
// don't latch, so retrying still works.
const completed = ref(false);
const textCopied = ref(false);
const errorMessage = ref('');

// The capture for the currently-open sheet, started eagerly on open so the
// primary tap usually awaits an already-resolved promise — awaiting a slow
// capture inside the tap handler can outlive the browser's transient user
// activation (NotAllowedError, notably on iOS Safari). Promise identity
// doubles as the staleness check: closing the sheet clears the cache, so a
// capture that resolves late is never shared.
let capturePromise: Promise<Blob> | null = null;

const startCapture = (): Promise<Blob> => {
  const promise = (async () => {
    await nextTick(); // the graphic mounts together with the sheet
    const element = (graphicRef.value?.$el ?? null) as HTMLElement | null;
    if (!element) throw new Error('share graphic is not mounted');
    return captureElementToPng(element);
  })();
  capturePromise = promise;
  // A failed capture must not stick; clear it so the next attempt retries.
  promise.catch(() => {
    if (capturePromise === promise) capturePromise = null;
  });
  return promise;
};

watch(() => props.open, (open) => {
  isProcessing.value = false;
  completed.value = false;
  textCopied.value = false;
  errorMessage.value = '';
  capturePromise = null;
  if (open) startCapture();
});

const shareText = computed(() => {
  if (!props.card) return '';
  const title = `"${props.card.title}"`;
  if (props.username && props.isOwnCollection) {
    return `I collected ${title}! Check out my collection at ${SHARE_DOMAIN}/@${encodeURIComponent(props.username)}`;
  }
  if (props.username) {
    // Someone else's card: credit the owner, invite the reader to play.
    return `@${props.username} collected ${title}! Collect your own at ${SHARE_DOMAIN}`;
  }
  return `I collected ${title}! Collect your own at ${SHARE_DOMAIN}`;
});

const handlePrimary = async () => {
  if (!props.card || isProcessing.value || completed.value) return;
  isProcessing.value = true;
  errorMessage.value = '';
  const promise = capturePromise ?? startCapture();
  let blob: Blob | null = null;
  try {
    blob = await promise;
  } catch (err) {
    console.error('Failed to generate share image:', err);
    errorMessage.value = "Couldn't generate the image. Please try again.";
  }
  // Skip if the sheet closed (or reopened) while capturing.
  if (blob && promise === capturePromise) {
    const filename = shareFilename(props.card.title);
    try {
      if (canShareFiles) {
        const result = await shareImageFile(blob, filename, shareText.value);
        if (result === 'shared') {
          completed.value = true;
          trackEvent('card_share_completed');
        }
        // 'cancelled' leaves `completed` false so the user can share again.
      } else {
        downloadBlob(blob, filename);
        completed.value = true;
        trackEvent('card_share_download');
      }
    } catch (err) {
      console.error('Failed to share card image:', err);
      // The capture is cached, so a retry hands it straight to the browser.
      errorMessage.value = "Sharing didn't work. Please try again.";
    }
  }
  isProcessing.value = false;
};

const handleCopyText = () => {
  navigator.clipboard.writeText(shareText.value)
    .then(() => {
      textCopied.value = true;
      setTimeout(() => {
        textCopied.value = false;
      }, 2000);
      trackEvent('card_share_copy_text');
    })
    .catch(err => console.error('Failed to copy share message:', err));
};
</script>

<template>
  <BaseSheet :open="open" title="Share this card" @close="emit('close')">
    <template #header>
      <p class="share-sheet__title">Share this card</p>
    </template>
    <div class="flex flex-col gap-4 px-4 pb-2">
      <div
        v-if="card"
        class="share-sheet__preview-frame"
        :style="SHARE_GRAPHIC_SIZE_VARS"
      >
        <ShareCardGraphic
          ref="graphicRef"
          :card="card"
          class="share-sheet__graphic"
        />
      </div>

      <p v-if="errorMessage" class="share-sheet__error m-0 text-center text-sm">
        {{ errorMessage }}
      </p>

      <!-- Share targets handle the text payload unevenly, so give users a
           direct way to copy the message themselves. -->
      <div class="share-sheet__message">
        <p class="share-sheet__message-text m-0">{{ shareText }}</p>
        <button
          class="share-sheet__copy-btn"
          :class="{ 'share-sheet__copy-btn--copied': textCopied }"
          :aria-label="textCopied ? 'Copied' : 'Copy message'"
          aria-live="polite"
          @click="handleCopyText"
        >
          <AppIcon :icon="textCopied ? cdxIconCheck : cdxIconCopy" :size="18" />
        </button>
      </div>

      <button
        class="share-sheet__btn w-full"
        :disabled="isProcessing || completed"
        @click="handlePrimary"
      >
        {{ isProcessing
          ? 'Generating…'
          : completed
            ? (canShareFiles ? 'Shared' : 'Downloaded')
            : (canShareFiles ? 'Share' : 'Download') }}
      </button>
    </div>
  </BaseSheet>
</template>

<style scoped>
.share-sheet__title {
  flex: 1;
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 32px; /* matches the close button height */
  color: var(--color-ink);
}

.share-sheet__preview-frame {
  /* Reserves the graphic's scaled-down size manually (transforms don't
     affect layout) and carries the preview-only rounding — the export
     itself must have square corners. */
  --preview-scale: 0.42;
  align-self: center;
  width: calc(var(--share-graphic-width) * var(--preview-scale));
  height: calc(var(--share-graphic-height) * var(--preview-scale));
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
}

/* Phones: a smaller preview keeps the message and Share button on screen. */
@media (max-height: 820px) {
  .share-sheet__preview-frame {
    --preview-scale: 0.32;
  }
}

.share-sheet__graphic {
  transform: scale(var(--preview-scale));
  transform-origin: top left;
}

.share-sheet__error {
  color: var(--color-red);
}

.share-sheet__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  padding: 0 16px;
  border: none;
  border-radius: var(--radius-button);
  background-color: var(--color-rust);
  color: var(--color-white);
  font-family: var(--font-sans);
  font-weight: 700;
  font-size: 14px;
  line-height: 20px;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.1s ease;
}

.share-sheet__btn:hover:not(:disabled) {
  background-color: var(--color-rust-dark);
}

.share-sheet__btn:active:not(:disabled) {
  transform: scale(0.98);
}

.share-sheet__btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.share-sheet__message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 8px 12px 12px;
  background-color: var(--color-cream);
  border: 1px solid var(--color-rust);
  border-radius: var(--radius-button);
}

.share-sheet__message-text {
  flex: 1;
  min-width: 0;
  font-family: var(--font-sans);
  font-size: 15px;
  line-height: 1.4;
  color: var(--color-ink);
  overflow-wrap: break-word;
  /* One tap selects the whole message, for manual copying. */
  user-select: all;
}

.share-sheet__copy-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: var(--radius-base);
  background: transparent;
  color: var(--color-rust);
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.1s ease;
}

.share-sheet__copy-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.share-sheet__copy-btn:active {
  transform: scale(0.9);
}

.share-sheet__copy-btn--copied {
  color: var(--color-green);
}
</style>
