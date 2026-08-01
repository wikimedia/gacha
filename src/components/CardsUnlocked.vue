<script setup lang="ts">
import { ref, watch, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useAuthStore } from '../stores/useAuthStore';
import { useGameStore } from '../stores/useGameStore';
import type { Card } from '../stores/useGameStore';
import CardComp from './Card.vue';
import CardDetailModal from './CardDetailModal.vue';
import Stars from './Stars.vue';
import AppIcon from './AppIcon.vue';
import { cdxIconCheck, cdxIconClose } from '@wikimedia/codex-icons';

const props = defineProps<{
  unlockedCards: Card[];
  identifiedFakes?: Card[];
  encounteredCards?: { card: Card; isCorrect: boolean }[];
  gameType: 'fakeout' | 'gacha';
  gameStats: {
    score?: number;
    totalRounds?: number;
    taps?: number;
  };
  lost?: boolean;
  category?: string;
  failedCard?: Card;
  deck?: Card[];
}>();

const emit = defineEmits<{
  (e: 'claim', claimedCards: Card[]): void;
  (e: 'dismiss'): void;
  (e: 'open-auth'): void;
}>();

const authStore = useAuthStore();
const gameStore = useGameStore();

const activeTab = ref('cards');

const rarityBreakdown = computed(() => {
  const counts = {
    Common: 0,
    Uncommon: 0,
    Rare: 0,
    Epic: 0,
    Legendary: 0
  };
  props.unlockedCards.forEach(card => {
    if (counts[card.rarity] !== undefined) {
      counts[card.rarity]++;
    } else {
      counts.Common++;
    }
  });
  return counts;
});

const starRows = computed(() => {
  const breakdown = rarityBreakdown.value;
  return [
    { stars: 1, label: 'Common' as const, count: breakdown.Common },
    { stars: 2, label: 'Uncommon' as const, count: breakdown.Uncommon },
    { stars: 3, label: 'Rare' as const, count: breakdown.Rare },
    { stars: 4, label: 'Epic' as const, count: breakdown.Epic },
    { stars: 5, label: 'Legendary' as const, count: breakdown.Legendary }
  ];
});

// Computed property to pick 3 unique cards from the game session for the try-again screen stack
const stackCards = computed(() => {
  const cards: Card[] = [];
  
  // 1. Center card is the card they failed on
  if (props.failedCard) {
    cards.push(props.failedCard);
  }
  
  // 2. Add unlocked cards (real cards correctly identified)
  const remainingUnlocked = props.unlockedCards.filter(
    (c) => !cards.some((added) => added.id === c.id)
  );
  cards.push(...remainingUnlocked);
  
  // 3. If we don't have 3 cards, backfill from the full session deck
  if (cards.length < 3 && props.deck) {
    const remainingDeck = props.deck.filter(
      (c) => !cards.some((added) => added.id === c.id)
    );
    cards.push(...remainingDeck);
  }
  
  // 4. If we still don't have 3, backfill from fakes
  if (cards.length < 3 && props.identifiedFakes) {
    const remainingFakes = props.identifiedFakes.filter(
      (c) => !cards.some((added) => added.id === c.id)
    );
    cards.push(...remainingFakes);
  }
  
  // Structure them as left, right, center
  return {
    left: cards[1] || null,
    right: cards[2] || null,
    center: cards[0] || null
  };
});

const cardsInGrid = computed(() => {
  if (props.gameType === 'fakeout' && props.encounteredCards && props.encounteredCards.length > 0) {
    return props.encounteredCards;
  }

  const list: { card: Card; isCorrect: boolean }[] = [];
  
  // Add unlocked real cards (correct facts)
  props.unlockedCards.forEach(card => {
    if (!list.some(item => item.card.id === card.id)) {
      list.push({ card, isCorrect: true });
    }
  });
  
  // Add identified fakes (correct fakes)
  if (props.identifiedFakes) {
    props.identifiedFakes.forEach(card => {
      if (!list.some(item => item.card.id === card.id)) {
        list.push({ card, isCorrect: true });
      }
    });
  }
  
  // Add failed card (incorrect)
  const failed = props.failedCard;
  if (failed) {
    if (!list.some(item => item.card.id === failed.id)) {
      list.push({ card: failed, isCorrect: false });
    }
  }

  return list;
});

const correctCards = computed(() => cardsInGrid.value.filter(item => item.isCorrect));
const incorrectCards = computed(() => cardsInGrid.value.filter(item => !item.isCorrect));

// Cards are grouped into Correct / Incorrect sections for the Fakeout results
// (empty sections are omitted). Gacha has no wrong answers, so it renders a
// single unlabeled grid.
const cardGroups = computed(() => {
  if (props.gameType === 'fakeout') {
    const groups: { key: string; label: string; variant: 'correct' | 'incorrect'; cards: { card: Card; isCorrect: boolean }[] }[] = [];
    if (correctCards.value.length > 0) {
      groups.push({ key: 'correct', label: 'Correct', variant: 'correct', cards: correctCards.value });
    }
    if (incorrectCards.value.length > 0) {
      groups.push({ key: 'incorrect', label: 'Incorrect', variant: 'incorrect', cards: incorrectCards.value });
    }
    return groups;
  }
  return [{ key: 'all', label: '', variant: 'correct' as const, cards: cardsInGrid.value }];
});

// Cards are auto-collected at game end in HomeView. If the user is already logged in,
// they're also auto-claimed in the database, so we start in the claimed state.
// If not logged in, cards are saved in localStorage as guest progress.
const isClaimed = ref(authStore.isLoggedIn && props.unlockedCards.length > 0);
const isClaiming = ref(false);

// Watch for authentication state changes. If they log in while on this screen,
// we automatically claim cards in the database (they're already in localStorage
// from guest state, but the auth store migration will handle the DB write).
watch(() => authStore.isLoggedIn, async (loggedIn) => {
  if (loggedIn && !isClaimed.value && props.unlockedCards.length > 0) {
    isClaiming.value = true;
    try {
      // Collect and claim cards that were saved as guest progress
      const realCardIds: string[] = [];
      props.unlockedCards.forEach(card => {
        gameStore.collectCard(card);
        realCardIds.push(card.id);
      });

      if (realCardIds.length > 0) {
        await gameStore.claimArticlesForProfile(realCardIds, props.unlockedCards);
      }

      isClaimed.value = true;
      emit('claim', props.unlockedCards);
    } catch (err) {
      console.error('Error claiming cards after login:', err);
    } finally {
      isClaiming.value = false;
    }
  }
});

const handleOpenAuth = () => {
  emit('open-auth');
};

// Card detail modal states
const isDetailModalOpen = ref(false);
const detailModalInitialIndex = ref(0);

// Flatten the grouped sections so the detail-modal carousel navigates cards in
// the same order they appear on screen (Correct section first, then Incorrect).
const orderedGridItems = computed(() => cardGroups.value.flatMap(group => group.cards));

const detailModalCards = computed(() => orderedGridItems.value.map(item => item.card));
const detailModalIsCorrectArray = computed(() => orderedGridItems.value.map(item => item.isCorrect));

const openCardDetail = (card: Card) => {
  const index = orderedGridItems.value.findIndex(item => item.card.id === card.id);
  if (index !== -1) {
    detailModalInitialIndex.value = index;
    isDetailModalOpen.value = true;
  }
};

const handleDismiss = () => {
  emit('dismiss');
};

const rootRef = ref<HTMLElement | null>(null);
const CARD_BASE_WIDTH = 350;
const GRID_GAP = 8;
let resizeObserver: ResizeObserver | null = null;

const updateCardScale = () => {
  const grids = rootRef.value?.querySelectorAll<HTMLElement>('.cards-grid-container');
  grids?.forEach(grid => {
    const cellWidth = (grid.clientWidth - GRID_GAP) / 2;
    if (cellWidth > 0) {
      grid.style.setProperty('--card-scale', String(cellWidth / CARD_BASE_WIDTH));
    }
  });
};

onMounted(() => {
  resizeObserver = new ResizeObserver(updateCardScale);
  if (rootRef.value) resizeObserver.observe(rootRef.value);
  updateCardScale();
});

onBeforeUnmount(() => resizeObserver?.disconnect());

// Grids for the active tab mount/unmount when switching tabs, so re-measure.
watch(activeTab, () => nextTick(updateCardScale));
</script>

<template>
  <div ref="rootRef" class="results-page-container select-none">

    <!-- Tabs Navigation -->
    <div class="results-tabs-container">
      <div class="results-tabs">
        <button 
          class="results-tab-btn" 
          :class="{ 'results-tab-btn--active': activeTab === 'cards' }"
          @click="activeTab = 'cards'"
        >
          Cards
        </button>
        <button 
          class="results-tab-btn" 
          :class="{ 'results-tab-btn--active': activeTab === 'stats' }"
          @click="activeTab = 'stats'"
        >
          Stats
        </button>
      </div>
    </div>

    <!-- 3. Content Area -->
    <div class="results-content-area">
      
      <!-- TAB 1: CARDS TAB -->
      <div v-if="activeTab === 'cards'" class="cards-tab-content flex-grow flex flex-col gap-4 py-2 items-center">
        <p class="cards-tab-subtitle">Tap on a card to learn more about it.</p>

        <!-- Cards grouped into Correct / Incorrect sections (empty sections omitted) -->
        <div class="cards-groups-wrapper">
          <div
            v-for="group in cardGroups"
            :key="group.key"
            class="cards-group"
          >
            <!-- Section header (Fakeout only) -->
            <div v-if="group.label" class="results-section-header">
              <span class="results-section-icon" :class="`results-section-icon--${group.variant}`">
                <AppIcon :icon="group.variant === 'correct' ? cdxIconCheck : cdxIconClose" :size="13" />
              </span>
              <span class="results-section-title">{{ group.label }}</span>
            </div>

            <!-- 2-column grid of cards for this section -->
            <div class="cards-grid-container">
              <div
                v-for="item in group.cards"
                :key="item.card.id"
                class="grid-card-wrapper animate-card-reveal cursor-pointer"
                @click="openCardDetail(item.card)"
              >
                <!-- Scaled Card -->
                <div class="grid-card-inner">
                  <CardComp :card="item.card" :show-link="false" />
                </div>

                <!-- Fake Card Overlay (with diagonal FAKE stamp) -->
                <div
                  v-if="!item.card.isReal"
                  class="card-grid-fake-overlay"
                ></div>
                <div
                  v-if="!item.card.isReal"
                  class="card-grid-fake-stamp"
                >
                  <div class="fake-stamp-text">
                    FAKE
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- TAB 2: STATS TAB -->
      <div v-if="activeTab === 'stats'" class="stats-tab-content">
        <!-- Fanned card stack (session highlights) -->
        <div class="card-fan">
          <div
            v-if="stackCards.left"
            class="card-fan-item card-fan-item--left cursor-pointer"
            @click="openCardDetail(stackCards.left)"
          >
            <CardComp :card="stackCards.left" :show-link="false" class="card-fan-scaled card-fan-scaled--side" />
          </div>
          <div
            v-if="stackCards.right"
            class="card-fan-item card-fan-item--right cursor-pointer"
            @click="openCardDetail(stackCards.right)"
          >
            <CardComp :card="stackCards.right" :show-link="false" class="card-fan-scaled card-fan-scaled--side" />
          </div>
          <div
            v-if="stackCards.center"
            class="card-fan-item card-fan-item--center cursor-pointer"
            @click="openCardDetail(stackCards.center)"
          >
            <CardComp :card="stackCards.center" :show-link="false" class="card-fan-scaled card-fan-scaled--center" />
          </div>
        </div>

        <!-- Fakes / Facts summary -->
        <div class="stats-summary-row">
          <div class="stats-summary-box stats-summary-box--fakes">
            <span>Fakes</span>
            <span>{{ identifiedFakes?.length ?? 0 }}</span>
          </div>
          <div class="stats-summary-box stats-summary-box--facts">
            <span>Facts</span>
            <span>{{ unlockedCards.length }}</span>
          </div>
        </div>

        <!-- Rarity star breakdown -->
        <div class="stats-rarity-list">
          <div
            v-for="row in starRows"
            :key="row.stars"
            class="stats-rarity-row"
          >
            <Stars :rarity="row.label" :size="20" />
            <span class="stats-rarity-count">{{ row.count }}</span>
          </div>
        </div>
      </div>

    </div>

    <!-- Shared bottom actions (both tabs) -->
    <div class="results-actions">
      <button
        v-if="!authStore.isLoggedIn"
        @click="handleOpenAuth"
        class="results-action-btn results-action-btn--primary"
      >
        Log in to collect cards
      </button>
      <button
        @click="handleDismiss"
        class="results-action-btn results-action-btn--secondary"
      >
        Play Again
      </button>
    </div>

    <!-- Card Detail Modal -->
    <CardDetailModal
      :show="isDetailModalOpen"
      :cards="detailModalCards"
      :initial-index="detailModalInitialIndex"
      :is-correct-array="gameType === 'fakeout' ? detailModalIsCorrectArray : undefined"
      :owner-username="authStore.user?.username ?? null"
      :is-own-collection="true"
      @close="isDetailModalOpen = false"
    />
</div>
</template>

<style scoped>
/* Scrollbar configurations for row lists */
.max-h-\[300px\]::-webkit-scrollbar,
.max-h-\[180px\]::-webkit-scrollbar {
  width: 6px;
}
.max-h-\[300px\]::-webkit-scrollbar-track,
.max-h-\[180px\]::-webkit-scrollbar-track {
  background: transparent;
}
.max-h-\[300px\]::-webkit-scrollbar-thumb,
.max-h-\[180px\]::-webkit-scrollbar-thumb {
  background: var(--color-base-300);
  border-radius: 3px;
}

/* Row-based gold/purple/blue shimmer border animation styles */
.shimmer-gold {
  position: relative;
  overflow: hidden;
}
.shimmer-gold::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(
    90deg,
    rgba(251, 191, 36, 0) 0%,
    rgba(251, 191, 36, 0.08) 50%,
    rgba(251, 191, 36, 0) 100%
  );
  transform: skewX(-25deg);
  animation: shine 4s infinite ease-in-out;
  pointer-events: none;
}

.shimmer-purple::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(
    90deg,
    rgba(168, 85, 247, 0) 0%,
    rgba(168, 85, 247, 0.08) 50%,
    rgba(168, 85, 247, 0) 100%
  );
  transform: skewX(-25deg);
  animation: shine 4s infinite ease-in-out;
  animation-delay: 1s;
  pointer-events: none;
}

.shimmer-blue::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(
    90deg,
    rgba(59, 130, 246, 0) 0%,
    rgba(59, 130, 246, 0.08) 50%,
    rgba(59, 130, 246, 0) 100%
  );
  transform: skewX(-25deg);
  animation: shine 4s infinite ease-in-out;
  animation-delay: 2s;
  pointer-events: none;
}

@keyframes shine {
  0% { left: -100%; }
  25%, 100% { left: 150%; }
}

/* ── Stats tab ──────────────────────────────────────────────── */
.stats-tab-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 20px 0;
}

/* Fanned stack of three session cards (side cards tucked behind the center) */
.card-fan {
  position: relative;
  width: 296px;
  height: 200px;
  margin: 0 auto;
}

.card-fan-item {
  position: absolute;
  top: 0;
  overflow: visible;
}

/* Side cards: 315×440 scaled to 0.3745 → 117.97×164.78 */
.card-fan-item--left,
.card-fan-item--right {
  width: 117.97px;
  height: 164.78px;
  z-index: 10;
  filter: drop-shadow(-0.6px 0.8px 1.8px rgba(0, 0, 0, 0.19));
}

.card-fan-item--left {
  left: calc(50% - 89px);
  transform: translateX(-50%) rotate(-8deg);
}

.card-fan-item--right {
  left: calc(50% + 89px);
  transform: translateX(-50%) rotate(8deg);
}

/* Center card: 315×440 scaled to 0.4133 → 130.2×181.85, sits on top */
.card-fan-item--center {
  left: 50%;
  top: 16px;
  width: 130.2px;
  height: 181.85px;
  transform: translateX(-50%);
  z-index: 20;
  filter: drop-shadow(0 0 3px rgba(0, 0, 0, 0.4));
}

.card-fan-scaled {
  transform-origin: top left;
  pointer-events: none;
}

.card-fan-scaled--side {
  transform: scale(0.37); 
}

.card-fan-scaled--center {
  transform: scale(0.38); 
}

/* Fakes / Facts summary boxes */
.stats-summary-row {
  display: flex;
  gap: 8px;
  width: 100%;
}

.stats-summary-box {
  flex: 1;
  min-width: 0;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 15px;
  box-sizing: border-box;
  border-radius: var(--radius-button);
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 22px;
  color: var(--color-charcoal);
}

.stats-summary-box--fakes {
  background-color: rgba(253, 244, 235, 0.7);
}

.stats-summary-box--facts {
  background-color: #f9f0e4;
  color: var(--color-ink);
}

/* Rarity breakdown: one bottom-bordered row per rarity */
.stats-rarity-list {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 0 16px;
  box-sizing: border-box;
}

.stats-rarity-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 15px;
  border-bottom: 1px solid #b5aea1;
}

.stats-rarity-count {
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 22px;
  color: var(--color-charcoal);
}

/* Unified Results Layout Styles */
.results-page-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 11px;
  padding-top: 10px;
  padding-bottom: 20px;
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  /* Fill the main content area so the actions can pin to the bottom when the
     content is short, while still flowing (and scrolling) when it's tall. */
  flex-grow: 1;
}

.results-tabs-container {
  width: 100%;
  margin: 0 auto;
}

.results-tabs {
  display: flex;
  align-items: stretch;
  width: 100%;
  border-bottom: 1px solid #b5aea1;
}

.results-tab-btn {
  font-family: var(--font-sans);
  font-weight: 700;
  font-size: 14px;
  line-height: 22px;
  text-align: center;
  flex: 1;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  padding: 1px 6px 3px;
  cursor: pointer;
  background-color: transparent;
  color: #5c5c54;
  transition: color 0.2s ease, border-color 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.results-tab-btn--active {
  color: var(--color-rust);
  border-bottom-color: var(--color-rust);
}

.results-content-area {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.cards-tab-content {
  width: 100%;
}

/* Shared bottom action buttons (Log in / Play Again).
   margin-top: auto pins them to the bottom of the (flex-grown) container when
   content is short; when content overflows they simply follow it and scroll. */
.results-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  margin-top: auto;
  padding-top: 16px;
}

.results-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 44px;
  border-radius: var(--radius-button);
  font-family: var(--font-sans);
  font-weight: 700;
  font-size: 14px;
  line-height: 20px;
  text-align: center;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.1s ease;
}

.results-action-btn:active {
  transform: scale(0.98);
}

.results-action-btn--primary {
  background-color: var(--color-rust);
  border: 1px solid var(--color-rust);
  color: var(--color-white);
}

.results-action-btn--primary:hover {
  background-color: var(--color-rust-dark);
  border-color: var(--color-rust-dark);
}

.results-action-btn--secondary {
  background-color: var(--color-paper);
  border: 1px solid var(--color-rust);
  color: var(--color-rust);
}

.results-action-btn--secondary:hover {
  background-color: var(--color-paper-dark);
}

/* Cards tab: subtitle + Correct/Incorrect grouped sections */
.cards-tab-subtitle {
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 22px;
  color: var(--color-ink);
  text-align: center;
  width: 100%;
}

.cards-groups-wrapper {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
}

.cards-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.results-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.results-section-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 19px;
  height: 19px;
  border-radius: 50%;
  flex-shrink: 0;
  color: var(--color-white);
}

.results-section-icon svg {
  width: 13px;
  height: 13px;
}

.results-section-icon--correct {
  background-color: #8ea885;
}

.results-section-icon--incorrect {
  background-color: #d06a4c;
}

.results-section-title {
  font-family: var(--font-sans);
  font-weight: 700;
  font-size: 18px;
  line-height: 28px;
  color: var(--color-charcoal);
}

/* Cards Grid Styling — two responsive columns that fill the row width.
   --card-scale is set from the live column width in JS (updateCardScale). */
.cards-grid-container {
  --grid-card-display-width: calc(var(--card-width) * var(--card-scale));
  --grid-card-display-height: calc(var(--card-height) * var(--card-scale));

  display: grid;

  grid-template-columns: repeat(2, var(--grid-card-display-width));
  gap: 15px;
  margin-left: auto;
  margin-right: auto;
  width: fit-content;

  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  width: 100%;
  --card-scale: 0.55; /* fallback until measured (JS sets the exact value) */
}

.grid-card-wrapper {
  width: 100%;
  /* The inner card is a fixed 315×440 scaled with transform; without these the
     grid tracks/rows blow out to its intrinsic size instead of the column width. */
  min-width: 0;
  min-height: 0;
  aspect-ratio: 315 / 440;
  position: relative;
  overflow: visible;
}

.grid-card-inner {
  transform: scale(var(--card-scale));
  transform-origin: top left;
  width: var(--card-width);
  height: var(--card-height);
  pointer-events: none;
}

.card-grid-fake-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(148, 136, 119, 0.35);
  mix-blend-mode: hard-light;
  border-radius: 5.5px;
  pointer-events: none;
  z-index: 10;
}

.card-grid-fake-stamp {
  position: absolute;
  inset: 0;
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
  color: #fff;
  font-size: 20px;
  letter-spacing: 0.05em;
  line-height: 1;
  text-align: center;
}
</style>
