<script setup lang="ts">
import { watch, onUnmounted } from 'vue';
import { PhX } from '@phosphor-icons/vue';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';

// Reusable bottom sheet: dark backdrop, slide-up paper panel, body scroll-lock,
// and a header row (title + close button). Consumers supply the body via the
// default slot; an optional `header` slot replaces the title area entirely.
const props = withDefaults(defineProps<{
  open: boolean;
  title?: string;
  /** Accessible label for the dialog; falls back to `title`. */
  ariaLabel?: string;
}>(), {
  title: '',
  ariaLabel: '',
});

const emit = defineEmits<{
  (e: 'close'): void;
}>();

watch(() => props.open, (open) => (open ? lockBodyScroll() : unlockBodyScroll()));
// Guard against unmounting while open (would otherwise leave the page locked).
onUnmounted(() => {
  if (props.open) unlockBodyScroll();
});
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet-fade">
      <div v-if="open" class="base-sheet__backdrop" @click="emit('close')"></div>
    </Transition>

    <Transition name="sheet-slide">
      <div
        v-if="open"
        class="base-sheet"
        role="dialog"
        aria-modal="true"
        :aria-label="ariaLabel || title || undefined"
      >
        <div class="base-sheet__header">
          <slot name="header">
            <p class="base-sheet__title">{{ title }}</p>
          </slot>
          <button
            class="base-sheet__close"
            :aria-label="title ? `Close ${title}` : 'Close'"
            @click="emit('close')"
          >
            <PhX :size="18" weight="bold" />
          </button>
        </div>

        <div class="base-sheet__body">
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.base-sheet__backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(0, 0, 0, 0.65);
}

.base-sheet {
  /* Empty paper that extends below the viewport fold. The entrance easing
     overshoots (bounces past the resting position), which would otherwise
     lift the sheet's bottom edge on-screen and reveal a gap; this filler
     keeps the bottom covered throughout the bounce. */
  --sheet-fill: 25vh;
  position: fixed;
  left: 50%;
  bottom: calc(-1 * var(--sheet-fill));
  transform: translateX(-50%);
  z-index: 61;
  width: 100%;
  max-width: 28rem; /* max-w-md — matches the app content column */
  max-height: calc(80vh + var(--sheet-fill));
  max-height: calc(80dvh + var(--sheet-fill)); /* prefer dvh over vh if supported */
  display: flex;
  flex-direction: column;
  padding: 10px 0 calc(10px + var(--sheet-fill));
  background-color: var(--color-sand);
  border-radius: 12px 12px 0 0;
  box-shadow: 0 -8px 28px rgba(0, 0, 0, 0.28);
  font-family: var(--font-sans);
}

/* Short viewports need more of the screen than the 80% cap allows. */
@media (max-height: 700px) {
  .base-sheet {
    max-height: calc(92vh + var(--sheet-fill));
    max-height: calc(92dvh + var(--sheet-fill)); /* prefer dvh over vh if supported */
  }
}

.base-sheet__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 0 16px 8px;
  flex-shrink: 0;
}

.base-sheet__title {
  flex: 1;
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-ink);
}

.base-sheet__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-right: -8px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--color-ink);
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.1s ease;
}

.base-sheet__close:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.base-sheet__close:active {
  transform: scale(0.9);
}

.base-sheet__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

/* Backdrop fade */
.sheet-fade-enter-active,
.sheet-fade-leave-active {
  transition: opacity 0.25s ease;
}
.sheet-fade-enter-from,
.sheet-fade-leave-to {
  opacity: 0;
}

/* Sheet slide-up */
.sheet-slide-enter-active {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.sheet-slide-leave-active {
  transition: transform 0.25s ease;
}
.sheet-slide-enter-from,
.sheet-slide-leave-to {
  transform: translate(-50%, 100%);
}
</style>
