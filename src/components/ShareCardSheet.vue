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
  if (!props.card || isProcessing.value) return;
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
          trackEvent('card_share_completed');
        }
      } else {
        downloadBlob(blob, filename);
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
  <BaseSheet :open="open" title="Share card" @close="emit('close')">
    <div class="flex flex-col gap-4 px-4 pb-2">
      <div class="share-sheet__preview">
        <ShareCardGraphic
          v-if="card"
          ref="graphicRef"
          :card="card"
          :username="username"
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
        class="share-sheet__btn share-sheet__btn--primary w-full"
        :disabled="isProcessing"
        @click="handlePrimary"
      >
        {{ isProcessing ? 'Generating…' : (canShareFiles ? 'Share' : 'Download') }}
      </button>
    </div>
  </BaseSheet>
</template>

<style scoped>
.share-sheet__preview {
  /* The graphic renders at natural size (371×566, see ShareCardGraphic) and
     is scaled down for preview; the capture neutralizes this transform.
     Height must be reserved manually because transforms don't affect layout. */
  --preview-scale: 0.5;
  display: flex;
  justify-content: center;
  height: calc(566px * var(--preview-scale));
}

.share-sheet__graphic {
  transform: scale(var(--preview-scale));
  transform-origin: top center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
}

.share-sheet__error {
  color: var(--color-red);
}

.share-sheet__btn {
  padding: 14px 16px;
  border: none;
  border-radius: 2px;
  font-family: var(--font-serif);
  font-weight: 900;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.25);
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.1s ease;
}

.share-sheet__btn:active {
  transform: scale(0.98);
}

.share-sheet__btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.share-sheet__btn--primary {
  background-color: var(--color-slate);
  color: var(--color-cream);
}

.share-sheet__btn--primary:hover:not(:disabled) {
  background-color: var(--color-slate-light);
}

.share-sheet__message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 8px 10px 12px;
  background-color: var(--color-cream);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-base);
}

.share-sheet__message-text {
  flex: 1;
  min-width: 0;
  font-family: var(--font-sans);
  font-size: 13px;
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
  color: var(--color-ink);
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
