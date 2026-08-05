<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { Card } from '../stores/useGameStore';
import CardComp from './Card.vue';
import CardBack from './CardBack.vue';
import AppIcon from './AppIcon.vue';
import ShareCardSheet from './ShareCardSheet.vue';
import { cdxIconClose, cdxIconCheck, cdxIconInfoFilled } from '@wikimedia/codex-icons';
import { trackEvent } from '../analytics.ts';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';

const props = withDefaults(defineProps<{
  show: boolean;
  cards: Card[];
  initialIndex?: number;
  isCorrectArray?: boolean[]; // For results screen check/cross badges
  /** Binder owner's username, stamped on the share graphic; null for guests. */
  ownerUsername?: string | null;
  /** Whether the viewer owns the collection these cards come from. */
  isOwnCollection?: boolean;
}>(), {
  initialIndex: 0,
  ownerUsername: null,
  isOwnCollection: false,
});

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const activeIndex = ref(props.initialIndex);
const isShareSheetOpen = ref(false);
// Whether the active card is flipped to show its back side.
const isFlipped = ref(false);

// Keep track of active index when initialIndex changes or modal opens
watch(() => props.initialIndex, (newVal) => {
  activeIndex.value = newVal;
});

// Flipping is per-card: navigating to another card resets to the front.
watch(activeIndex, () => {
  isFlipped.value = false;
});

watch(() => props.show, (newVal) => {
  if (newVal) {
    activeIndex.value = props.initialIndex;
    lockBodyScroll();
    isFlipped.value = false;
  } else {
    isShareSheetOpen.value = false;
    unlockBodyScroll();
  }
});

const activeCard = computed(() => props.cards[activeIndex.value] || null);

// Answer status for the active card (results screen only). Null when the modal
// is opened from a context without correctness info (e.g. the binder).
const answerStatus = computed<'correct' | 'incorrect' | null>(() => {
  const v = props.isCorrectArray?.[activeIndex.value];
  if (v === true) return 'correct';
  if (v === false) return 'incorrect';
  return null;
});

// Codex glyph (raw SVG inner markup) knocked out of the status badge circle.
const statusGlyph = computed<string>(() =>
  (answerStatus.value === 'correct' ? cdxIconCheck : cdxIconClose) as string
);

// Fake cards have no real article: they can't flip and their actions are disabled.
const actionsDisabled = computed(() => !activeCard.value?.isReal);

// One-time "tap to flip" hint. Shown on flippable (real) cards until the user
// dismisses it with the ✕, which is remembered in localStorage.
const FLIP_HINT_KEY = 'moonflower_flip_hint_dismissed';
const flipHintDismissed = ref(false);
try {
  flipHintDismissed.value =
    typeof localStorage !== 'undefined' && localStorage.getItem(FLIP_HINT_KEY) === '1';
} catch { /* localStorage unavailable */ }

const showFlipHint = computed(
  () => props.show && !flipHintDismissed.value && !isFlipped.value && !!activeCard.value?.isReal
);

const dismissFlipHint = () => {
  flipHintDismissed.value = true;
  try {
    localStorage.setItem(FLIP_HINT_KEY, '1');
  } catch { /* localStorage unavailable */ }
};

// Tapping a non-active card selects it; tapping the active card flips it —
// but only real cards have a back to flip to.
const handleCardClick = (index: number) => {
  if (index !== activeIndex.value) {
    activeIndex.value = index;
  } else if (props.cards[index]?.isReal) {
    isFlipped.value = !isFlipped.value;
    // Flipping counts as discovering the feature — retire the hint for good.
    if (isFlipped.value) dismissFlipHint();
  }
};

// Front/back indicator dots: only real cards have a back to flip to.
const setFlipped = (flipped: boolean) => {
  if (!activeCard.value?.isReal) return;
  isFlipped.value = flipped;
  if (flipped) dismissFlipHint();
};

const handlePrev = () => {
  if (activeIndex.value > 0) {
    activeIndex.value--;
  }
};

const handleNext = () => {
  if (activeIndex.value < props.cards.length - 1) {
    activeIndex.value++;
  }
};

// Keyboard navigation
const handleKeyDown = (e: KeyboardEvent) => {
  if (!props.show) return;
  // While the share sheet is up, only let Escape through (to close the sheet,
  // not the modal); arrows would otherwise change the card behind it.
  if (isShareSheetOpen.value) {
    if (e.key === 'Escape') {
      isShareSheetOpen.value = false;
    }
    return;
  }
  if (e.key === 'ArrowLeft') {
    handlePrev();
  } else if (e.key === 'ArrowRight') {
    handleNext();
  } else if (e.key === 'Escape') {
    emit('close');
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  if (props.show) unlockBodyScroll();
});

// Touch swipe navigation
const touchStartX = ref(0);
const touchStartY = ref(0);

const handleTouchStart = (e: TouchEvent) => {
  touchStartX.value = e.touches[0].clientX;
  touchStartY.value = e.touches[0].clientY;
};

const handleTouchEnd = (e: TouchEvent) => {
  const diffX = e.changedTouches[0].clientX - touchStartX.value;
  const diffY = e.changedTouches[0].clientY - touchStartY.value;
  
  if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
    if (diffX > 0) {
      handlePrev();
    } else {
      handleNext();
    }
  }
};

// Action button handlers
const handleLearnMore = () => {
  if (activeCard.value?.wikipediaLink) {
    window.open(activeCard.value.wikipediaLink, '_blank', 'noopener,noreferrer');
  }
  trackEvent('learn_more_click');
};

const handleShare = () => {
  if (!activeCard.value?.isReal) return; // fakes are not shareable
  isShareSheetOpen.value = true;
  trackEvent('card_detail_share');
};
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div 
        v-if="show" 
        class="modal-scrim fixed inset-0 z-50 flex flex-col justify-between items-center py-8 select-none bg-charcoal/65"
        role="dialog"
        aria-modal="true"
      >
        <!-- Top bar: answer status (centered) + close (aligned right) -->
        <div class="relative flex items-center justify-center w-full h-9 shrink-0 px-6">
          <!-- Answer status indicator (results only) -->
          <div
            v-if="answerStatus"
            class="answer-badge flex items-center gap-2 select-none"
            :class="answerStatus === 'correct' ? 'answer-badge--correct' : 'answer-badge--incorrect'"
          >
            <!-- Filled circle with the codex glyph knocked out (transparent) -->
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" class="block shrink-0">
              <mask id="answerStatusMask">
                <circle cx="10" cy="10" r="10" fill="white" />
                <g fill="black" transform="translate(4 4) scale(0.6)" v-html="statusGlyph" />
              </mask>
              <circle cx="10" cy="10" r="10" fill="currentColor" mask="url(#answerStatusMask)" />
            </svg>
            <span class="text-white/90 font-sans text-sm font-medium">
              {{ answerStatus === 'correct' ? 'answered correct' : 'answered incorrect' }}
            </span>
          </div>

          <!-- Close Button (✕) -->
          <button
            @click="emit('close')"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors duration-200 cursor-pointer p-2 z-50 outline-none bg-transparent border-none"
            aria-label="Close modal"
          >
            <AppIcon :icon="cdxIconClose" :size="18" />
          </button>
        </div>

        <div class="carousel-viewport relative w-full flex items-center py-4 flex-grow">
          <div 
            class="carousel-track"
            :style="{ transform: `translateX(calc(50vw - var(--card-width) / 2 - ${activeIndex} * (var(--card-width) + var(--carousel-gap))))` }"
            @touchstart="handleTouchStart"
            @touchend="handleTouchEnd"
          >
            <div
              v-for="(card, index) in cards"
              :key="card.id"
              class="card-flip-scene relative flex-shrink-0 transition-all duration-300"
              :class="{
                'opacity-40 scale-95 cursor-pointer': index !== activeIndex,
                'scale-100 active-card-shadow': index === activeIndex,
                'cursor-pointer': index !== activeIndex || card.isReal
              }"
              @click="handleCardClick(index)"
            >
              <div class="card-flip" :class="{ 'is-flipped': index === activeIndex && isFlipped }">
                <!-- Front face -->
                <div class="card-flip__face">
                  <CardComp :card="card" :show-link="false" />

                  <!-- Fake Card Overlay (stamp) -->
                  <div
                    v-if="!card.isReal"
                    class="modal-card-fake-overlay"
                  ></div>
                  <div
                    v-if="!card.isReal"
                    class="modal-card-fake-stamp"
                  >
                    <div class="fake-stamp-text">
                      FAKE
                    </div>
                  </div>
                </div>

                <!-- Back face (placeholder). Only real cards have a back, and it
                     is mounted only for the active card so the signals fetch
                     fires for the card actually being viewed. -->
                <div class="card-flip__face card-flip__face--back">
                  <!-- CardBack fills its parent, so give it the same base-size
                       zoom wrapper the front card carries (Card.vue) — otherwise
                       its fixed-px internals wouldn't scale to match the front. -->
                  <div class="card-back-zoom">
                    <CardBack v-if="index === activeIndex && card.isReal" :card="card" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom Controls & Actions -->
        <div class="relative flex flex-col items-center w-full gap-6 px-4">
          <!-- Flip hint popover (dismissable, remembered in localStorage) -->
          <Transition name="flip-hint-fade">
            <div v-if="showFlipHint" class="flip-hint" role="status">
              <span class="flip-hint__pointer" aria-hidden="true"></span>
              <AppIcon :icon="cdxIconInfoFilled" :size="18" class="flip-hint__info" />
              <p class="flip-hint__text">Tap the card to flip and learn more</p>
              <button
                class="flip-hint__close"
                @click="dismissFlipHint"
                aria-label="Dismiss hint"
              >
                <AppIcon :icon="cdxIconClose" :size="18" />
              </button>
            </div>
          </Transition>

          <!-- Front/back indicator (two dots). Only real cards have a back. -->
          <div v-if="activeCard?.isReal" class="flex items-center justify-center gap-2">
            <button
              @click="setFlipped(false)"
              class="w-2 h-2 rounded-full transition-all duration-300 outline-none bg-transparent border-none"
              :class="!isFlipped ? 'bg-white scale-125' : 'bg-white/30 hover:bg-white/50'"
              aria-label="Show card front"
            ></button>
            <button
              @click="setFlipped(true)"
              class="w-2 h-2 rounded-full transition-all duration-300 outline-none bg-transparent border-none"
              :class="isFlipped ? 'bg-white scale-125' : 'bg-white/30 hover:bg-white/50'"
              aria-label="Show card back"
            ></button>
          </div>

          <!-- Action buttons -->
          <div class="flex gap-3 w-full pb-4">
            <button
              @click="handleShare"
              :disabled="actionsDisabled"
              class="flex-1 bg-paper text-rust rounded-button py-3 px-4 font-sans font-bold text-sm shadow-[0px_0px_6px_rgba(0,0,0,0.25)] hover:bg-paper-dark active:scale-[0.98] transition-all cursor-pointer text-center outline-none border-none select-none disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:bg-paper"
            >
              Share
            </button>
            <button
              @click="handleLearnMore"
              :disabled="actionsDisabled"
              class="flex-1 bg-paper text-rust rounded-button py-3 px-4 font-sans font-bold text-sm shadow-[0px_0px_6px_rgba(0,0,0,0.25)] hover:bg-paper-dark active:scale-[0.98] transition-all cursor-pointer text-center outline-none border-none select-none disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:bg-paper"
            >
              Open article
            </button>
          </div>
        </div>

        <!-- Share-as-image bottom sheet -->
        <ShareCardSheet
          :open="isShareSheetOpen"
          :card="activeCard"
          :username="ownerUsername"
          :is-own-collection="isOwnCollection"
          @close="isShareSheetOpen = false"
        />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Backdrop blur amount — local to this modal, not a shared token */
.modal-scrim {
  --scrim-blur: 2.6px;
  backdrop-filter: blur(var(--scrim-blur));
  -webkit-backdrop-filter: blur(var(--scrim-blur));
}

/* Answer status badge colors — local to this component (not shared tokens) */
.answer-badge--correct {
  color: #9dac80;
}

.answer-badge--incorrect {
  color: #db8059;
}

/* Clip neighbour cards horizontally while letting the flip's vertical
   perspective bulge overflow. `clip` (unlike `hidden`) permits a per-axis value
   without forcing the other axis to a scroll container. */
.carousel-viewport {
  overflow-x: clip;
  overflow-y: visible;
}

.carousel-track {
  --carousel-gap: 10px; /* also consumed by the centering transform inline */
  display: flex;
  gap: var(--carousel-gap);
  align-items: center;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
}

/* Active card's drop shadow. Rendered on the card faces — which rotate and
   backface-cull with the flip — rather than on the static scene, so during a
   flip the glow turns edge-on with the card instead of hanging behind it as a
   ghost rectangle. Radius matches the card so the glow stays rounded. */
.active-card-shadow .card-flip__face {
  box-shadow:
    0 15px 35px rgba(0, 0, 0, 0.4),
    0 5px 15px rgba(0, 0, 0, 0.2);
  border-radius: calc(11.5px * var(--card-scale-full));
}

/* The card's built-in hover lift (translateY) reads as a tap response inside
   the modal — misleading on fakes, which don't flip — so keep the card still. */
.card-flip-scene :deep(.trading-card:hover) {
  transform: translateZ(0);
}

/* Flip hint popover — dark box above the bottom controls, pointing up at the
   card. Border separates it from the dark scrim; pointer is a rotated square. */
.flip-hint {
  position: absolute;
  left: 50%;
  bottom: calc(200%);
  transform: translateX(-50%);
  width: 270px;
  max-width: calc(100% - 8px);
  z-index: 60;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 10px;
  background: var(--color-white);
  border: 1px solid var(--color-border);
  box-shadow: 0 4px 4px rgba(0, 0, 0, 0.06), 0 0 4px rgba(0, 0, 0, 0.06);
  color: var(--color-ink);
}

.flip-hint__pointer {
  position: absolute;
  top: -7px;
  left: 50%;
  width: 13px;
  height: 13px;
  transform: translateX(-50%) rotate(45deg);
  background: var(--color-white);
  border-top: 1px solid var(--color-border);
  border-left: 1px solid var(--color-border);
}

.flip-hint__info {
  flex-shrink: 0;
  margin-top: 1px;
}

.flip-hint__text {
  flex: 1;
  font-family: var(--font-sans);
  font-weight: 700;
  font-size: 14px;
  line-height: 22px;
}

.flip-hint__close {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: -1px -6px 0 0;
  background: transparent;
  border: none;
  color: var(--color-ink);
  opacity: 0.75;
  cursor: pointer;
  outline: none;
}
.flip-hint__close:hover {
  opacity: 1;
}

.flip-hint-fade-enter-active,
.flip-hint-fade-leave-active {
  transition: opacity 0.2s ease;
}
.flip-hint-fade-enter-from,
.flip-hint-fade-leave-to {
  opacity: 0;
}

/* Card flip (front <-> back) */
.card-flip-scene {
  width: var(--card-width);
  height: var(--card-height);
  perspective: 1600px;
}

.card-flip {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-flip.is-flipped {
  transform: rotateY(-180deg);
}

.card-flip__face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  /* Own isolation group so the FAKE overlay/stamp mix-blend against the card
     within this face — the preserve-3d parent otherwise breaks the blend. */
  isolation: isolate;
}

.card-flip__face--back {
  transform: rotateY(180deg);
}

/* Base-size box zoomed to the full display size, matching Card.vue's wrapper so
   the back scales identically to the front. */
.card-back-zoom {
  width: var(--card-base-width);
  height: var(--card-base-height);
  zoom: var(--card-scale-full);
}

/* FAKE Overlay and Stamp. These sit in the (unzoomed) face over the zoomed
   card, so their inset/size are scaled by --card-scale-full to line up with the
   card's own 14px image frame and read at the card's scale. */
.modal-card-fake-overlay {
  position: absolute;
  inset: calc(14px * var(--card-scale-full));
  background-color: rgba(148, 136, 119, 0.35);
  mix-blend-mode: hard-light;
  pointer-events: none;
  z-index: 10;
}

.modal-card-fake-stamp {
  position: absolute;
  inset: calc(14px * var(--card-scale-full));
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  user-select: none;
  z-index: 20;
  mix-blend-mode: overlay;
}

.fake-stamp-text {
  transform: rotate(-45deg);
  font-family: 'Georgia', serif;
  font-weight: 900;
  color: #ffffff;
  font-size: calc(48px * var(--card-scale-full));
  letter-spacing: 0.05em;
  line-height: 1;
  text-align: center;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

/* Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
