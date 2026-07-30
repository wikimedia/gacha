<script setup lang="ts">
import AppIcon from './AppIcon.vue';
import {
  cdxIconBook,
  cdxIconHand,
  cdxIconHelp,
  cdxIconHeartOutline,
  cdxIconMagicWand
} from '@wikimedia/codex-icons';

// Shared "how to play" content: the card illustration + the rules list.
// Two presentations reuse this — the full-screen first-play modal (owned by
// AppHeader) and the "Rules" bottom sheet (owned by AppFooter). The modal shows
// the inner "Rules" heading and a Start button; the sheet omits both (its own
// header already reads "Rules", and it's dismissed via the sheet close button).
withDefaults(defineProps<{
  showHeading?: boolean;
  showStartButton?: boolean;
}>(), {
  showHeading: false,
  showStartButton: false,
});

const emit = defineEmits<{
  (e: 'start'): void;
}>();

const RULES = [
  { icon: cdxIconBook, text: 'Collect real Wikipedia articles' },
  { icon: cdxIconHand, text: 'Swipe right for facts and left for fakes' },
  { icon: cdxIconHelp, text: 'Every fake card has a clue' },
  { icon: cdxIconHeartOutline, text: 'You get 3 lives total' },
  { icon: cdxIconMagicWand, text: 'Only one version of each card exists' },
];
</script>

<template>
  <div class="instructions">
    <!-- Card fan illustration (cards + Fact/Fake badges baked into the export) -->
    <img
      src="/tutorial.png"
      alt="Example real and fake article cards"
      class="instructions-illustration"
    />

    <!-- Rules panel -->
    <div class="rules-panel">
      <h3 v-if="showHeading" class="rules-title">Rules</h3>
      <ul class="rules-list">
        <li v-for="(rule, i) in RULES" :key="i" class="rule">
          <span class="rule-icon">
            <AppIcon :icon="rule.icon" :size="18" />
          </span>
          <span class="rule-text">{{ rule.text }}</span>
        </li>
      </ul>
    </div>

    <button
      v-if="showStartButton"
      class="instructions-start"
      @click="emit('start')"
    >
      Start
    </button>
  </div>
</template>

<style scoped>
.instructions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 8px 24px 24px;
}

/* Card fan illustration (cards + Fact/Fake badges baked into the export) */
.instructions-illustration {
  width: 292px;
  max-width: 100%;
  height: auto;
  user-select: none;
  -webkit-user-drag: none;
}

/* "Rules" panel — paper card that frames the instruction list */
.rules-panel {
  width: 370px;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 16px 30px;
  background-color: var(--color-paper);
  border: 1px solid var(--color-border-neutral);
  border-radius: var(--radius-button);
  box-sizing: border-box;
}

.rules-title {
  margin: 0;
  width: 100%;
  font-family: var(--font-sans);
  font-weight: 700;
  font-size: 18px;
  line-height: 28px;
  color: var(--color-ink);
  text-align: center;
}

.rules-list {
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rule {
  display: flex;
  align-items: center;
  gap: 16px;
}

.rule-icon {
  /* Warm tan chip that lifts the icon off the paper panel. */
  --rule-icon-bg: #e5d8c6;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background-color: var(--rule-icon-bg);
  color: var(--color-ink);
}

.rule-text {
  flex: 1 0 0;
  min-width: 0;
  font-family: var(--font-sans);
  font-weight: 400;
  font-size: 14px;
  line-height: var(--leading-body);
  color: var(--color-ink);
}

.instructions-start {
  width: 370px;
  max-width: 100%;
  height: 44px;
  border: none;
  border-radius: var(--radius-button);
  background-color: var(--color-rust);
  color: var(--color-white);
  font-family: var(--font-sans);
  font-weight: 700;
  font-size: 14px;
  line-height: 20px;
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.1s ease;
}

.instructions-start:hover { background-color: var(--color-rust-dark); }
.instructions-start:active { transform: scale(0.98); }
</style>
