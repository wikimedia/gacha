<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore';
import { useGameStore } from '../stores/useGameStore';
import type { Card } from '../stores/useGameStore';
import CardComp from './Card.vue';
import CardDetailModal from './CardDetailModal.vue';
import Stars from './Stars.vue';

const props = defineProps<{
  unlockedCards: Card[];
  identifiedFakes?: Card[];
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

const router = useRouter();
const authStore = useAuthStore();
const gameStore = useGameStore();

const activeTab = ref(props.lost && props.unlockedCards.length === 0 ? 'stats' : 'cards');

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

// Cards are auto-collected at game end in HomeView. If the user is already logged in,
// they're also auto-claimed in the database, so we start in the claimed state.
// If not logged in, cards are saved in localStorage as guest progress.
const isClaimed = ref(authStore.isLoggedIn && props.unlockedCards.length > 0);
const isClaiming = ref(false);
const showLoginPrompt = ref(!authStore.isLoggedIn && props.unlockedCards.length > 0);

// Watch for authentication state changes. If they log in while on this screen,
// we automatically claim cards in the database (they're already in localStorage
// from guest state, but the auth store migration will handle the DB write).
watch(() => authStore.isLoggedIn, async (loggedIn) => {
  if (loggedIn && !isClaimed.value && props.unlockedCards.length > 0) {
    showLoginPrompt.value = false;
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

// Fallback claim handler — cards are normally auto-collected at game end,
// but this covers the edge case where a user manually triggers claiming.
const handleClaim = async () => {
  // If the user is not logged in, prompt them to sign in
  if (!authStore.isLoggedIn) {
    showLoginPrompt.value = true;
    return;
  }

  if (isClaimed.value) return;

  isClaiming.value = true;
  
  try {
    // Collect all real cards in the game store (idempotent — skips already-collected)
    const realCardIds: string[] = [];
    props.unlockedCards.forEach(card => {
      gameStore.collectCard(card);
      realCardIds.push(card.id);
    });

    // Claim all real cards in Supabase for this profile
    if (realCardIds.length > 0) {
      await gameStore.claimArticlesForProfile(realCardIds, props.unlockedCards);
    }

    isClaimed.value = true;
    emit('claim', props.unlockedCards);
  } catch (err) {
    console.error('Error claiming cards:', err);
  } finally {
    isClaiming.value = false;
  }
};

const handleOpenAuth = () => {
  emit('open-auth');
};

const handleViewBinder = () => {
  if (authStore.user?.username) {
    router.push(`/@${authStore.user.username}`);
  }
};

// Card detail modal states
const isDetailModalOpen = ref(false);
const detailModalInitialIndex = ref(0);

const detailModalCards = computed(() => cardsInGrid.value.map(item => item.card));
const detailModalIsCorrectArray = computed(() => cardsInGrid.value.map(item => item.isCorrect));

const openCardDetail = (card: Card) => {
  const index = cardsInGrid.value.findIndex(item => item.card.id === card.id);
  if (index !== -1) {
    detailModalInitialIndex.value = index;
    isDetailModalOpen.value = true;
  }
};

const handleDismiss = () => {
  emit('dismiss');
};
</script>

<template>
  <div class="results-page-container select-none">
    
    <!-- 1. Header Title -->
    <div class="results-title-container">
      <h2 class="results-title">Your Results</h2>
    </div>

    <!-- 2. Tabs Navigation -->
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
        <!-- 2-column Grid of played cards -->
        <div class="cards-grid-container mt-2 pb-4">
          <div 
            v-for="item in cardsInGrid" 
            :key="item.card.id" 
            class="grid-card-wrapper animate-card-reveal cursor-pointer"
            @click="openCardDetail(item.card)"
          >
            <!-- Scaled Card -->
            <div class="grid-card-inner">
              <CardComp :card="item.card" :show-link="false" />
            </div>

            <!-- Correct/Incorrect badge in top-right corner of the scaled wrapper -->
            <div 
              v-if="item.isCorrect"
              class="card-grid-badge card-grid-badge--correct shadow"
              title="Correct"
            >
              <span class="badge-icon">✓</span>
            </div>
            <div 
              v-else
              class="card-grid-badge card-grid-badge--incorrect shadow"
              title="Incorrect"
            >
              <span class="badge-icon">✗</span>
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

        <!-- Action / Message Block Below Grid -->
        <!-- Case A: Lost State with NO cards unlocked -->
        <div v-if="lost && unlockedCards.length === 0" class="flex flex-col items-center gap-4 w-full">
          <div class="try-again-message">
            Better luck next time!
          </div>
          <button @click="handleDismiss" class="try-again-button w-full">
            Try again to collect cards
          </button>
        </div>

        <!-- Case B: Won/Gacha state or Lost state with claiming -->
        <div v-else class="w-full">
          <!-- CLAIMING / ACTION BOX -->
          <div class="card card-bordered bg-base-100 border-base-300 shadow-md p-5 text-center">
            <!-- Unclaimed state -->
            <div v-if="!isClaimed && !showLoginPrompt" class="flex flex-col gap-3">
              <h4 class="font-serif font-black text-sm text-base-content leading-tight">
                {{ lost ? 'Game Over! Claim Your Discoveries anyway?' : (unlockedCards.length > 0 ? 'Ready to Claim Your Discoveries?' : 'No Discoveries to Claim') }}
              </h4>
              <p class="text-xs text-secondary leading-relaxed font-sans font-light">
                {{ lost
                  ? "Even though you didn't finish the round, you get to keep the real cards you identified correctly!"
                  : (unlockedCards.length > 0 
                    ? 'Add these articles to your Wikipedia binder collection and collect points to unlock more rewards.'
                    : 'Get answers correct in the game to unlock cards that you can claim here!')
                }}
              </p>
              <button 
                v-if="unlockedCards.length > 0"
                @click="handleClaim"
                :disabled="isClaiming"
                class="btn btn-primary w-full uppercase font-bold text-xs text-white"
              >
                <span v-if="isClaiming" class="loading loading-spinner loading-xs"></span>
                🎁 Claim {{ unlockedCards.length }} Cards
              </button>
              <button @click="handleDismiss" class="btn btn-outline border-base-300 w-full uppercase font-bold text-xs">
                🔄 Play Again
              </button>
            </div>

            <!-- Guest Auth login prompt state -->
            <div v-else-if="!isClaimed && showLoginPrompt" class="flex flex-col gap-3 animate-fade-in">
              <h4 class="font-serif font-black text-sm text-primary leading-tight">
                {{ lost ? 'Sign In to Keep Your Discoveries' : 'Sign In to Claim Cards' }}
              </h4>
              <p class="text-xs text-secondary leading-relaxed font-sans font-light">
                {{ lost
                  ? 'To save the real cards you identified during this round, please log in with your email.'
                  : 'To claim these cards and add them to your collection, please log in with your email. This ensures your discoveries are securely saved.'
                }}
              </p>
              <div class="flex flex-col gap-2 mt-2">
                <button @click="handleOpenAuth" class="btn btn-primary w-full uppercase font-bold text-xs text-white">
                  🔑 Log In to Claim
                </button>
                <button @click="showLoginPrompt = false" class="btn btn-ghost btn-xs text-secondary hover:bg-transparent mt-1">
                  ← Cancel
                </button>
              </div>
            </div>

            <!-- Claimed state -->
            <div v-else class="flex flex-col gap-3 animate-fade-in">
              <span class="text-4xl animate-bounce">✨</span>
              <h4 class="font-serif font-black text-sm text-success leading-tight">
                {{ lost ? 'Discoveries Saved!' : 'Discoveries Claimed!' }}
              </h4>
              <p class="text-xs text-secondary leading-relaxed font-sans font-light">
                {{ lost
                  ? 'Your correctly identified cards have been successfully saved to your cloud profile binder!'
                  : 'Your unlocked cards have been successfully saved to your cloud profile binder!'
                }}
              </p>
              <div class="flex flex-col gap-2 mt-2">
                <button @click="handleViewBinder" class="btn btn-primary w-full uppercase font-bold text-xs text-white">
                  📖 Open Binder & View Cards
                </button>
                <button @click="handleDismiss" class="btn btn-outline border-base-300 w-full uppercase font-bold text-xs">
                  Play Again
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- TAB 2: STATS TAB -->
      <div v-if="activeTab === 'stats'" class="stats-tab-content flex-grow flex flex-col gap-6 py-2 items-center">
        <!-- 3D Card Stack -->
        <div class="card-stack-container mt-2">
          <div 
            v-if="stackCards.left" 
            class="card-stack-item card-stack-item--left cursor-pointer"
            @click="openCardDetail(stackCards.left)"
          >
            <CardComp :card="stackCards.left" :show-link="false" class="scaled-card-left" />
          </div>
          <div 
            v-if="stackCards.right" 
            class="card-stack-item card-stack-item--right cursor-pointer"
            @click="openCardDetail(stackCards.right)"
          >
            <CardComp :card="stackCards.right" :show-link="false" class="scaled-card-right" />
          </div>
          <div 
            v-if="stackCards.center" 
            class="card-stack-item card-stack-item--center cursor-pointer"
            @click="openCardDetail(stackCards.center)"
          >
            <CardComp :card="stackCards.center" :show-link="false" class="scaled-card-center" />
          </div>
        </div>

        <!-- Stats Info Section -->
        <div class="results-info-container">
          <!-- Category Badge Box -->
          <div class="results-category-badge shadow-sm">
            <span class="category-badge-text">{{ category || 'General Knowledge' }}</span>
          </div>

          <!-- Total Collected Badge -->
          <div class="results-total-collected shadow-sm">
            Total Collected : {{ unlockedCards.length }}
          </div>

          <!-- Stats Box Row: Fakes / Facts -->
          <div class="results-fakes-facts-row gap-2">
            <!-- Fakes Box -->
            <div class="results-fakes-box shadow-sm rounded-[2px]">
              <span>Fakes</span>
              <span>{{ identifiedFakes?.length ?? 0 }}</span>
            </div>
            <!-- Facts Box -->
            <div class="results-facts-box shadow-sm rounded-[2px]">
              <span>Facts</span>
              <span>{{ unlockedCards.length }}</span>
            </div>
          </div>

          <!-- Rarity Star Breakdown Rows (Simplified if no cards gotten right) -->
          <div 
            v-if="unlockedCards.length > 0"
            class="results-star-breakdown-box flex flex-col gap-1 border border-[#3f3f35]/10 rounded-[2px] bg-[rgba(200,193,183,0.15)] p-1 mt-2"
          >
            <div 
              v-for="(row, idx) in starRows" 
              :key="row.stars"
              class="flex flex-col"
            >
              <div class="star-breakdown-row">
                <Stars :rarity="row.label" :muted="row.count === 0" :size="16" />
                <div class="star-breakdown-count font-serif font-black text-sm">
                  {{ row.count }}
                </div>
              </div>
              <div v-if="idx < starRows.length - 1" class="h-px bg-[#3f3f35]/10 mx-3"></div>
            </div>
          </div>
        </div>

        <!-- Keep Playing Button -->
        <button @click="handleDismiss" class="keep-playing-btn">
          {{ lost ? 'Try again to collect cards' : 'Keep playing' }}
        </button>
      </div>

    <!-- Card Detail Modal -->
    <CardDetailModal
      :show="isDetailModalOpen"
      :cards="detailModalCards"
      :initial-index="detailModalInitialIndex"
      :is-correct-array="detailModalIsCorrectArray"
      @close="isDetailModalOpen = false"
    />
  </div>
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

/* ── Try Again Screen Layout (Figma Redesign) ────────────────── */
.try-again-screen-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding-top: 40px;
  width: 326px;
  margin-left: auto;
  margin-right: auto;
}

.card-stack-container {
  position: relative;
  width: 326px;
  height: 218px;
  filter: drop-shadow(-2.241px 3.361px 3.249px rgba(0, 0, 0, 0.25));
}

.card-stack-item {
  position: absolute;
  overflow: visible;
}

.card-stack-item--left {
  left: calc(50% - 98.04px);
  top: 0;
  width: 129.926px;
  height: 181.485px;
  transform: translateX(-50%) rotate(-6deg);
  z-index: 10;
}

.card-stack-item--right {
  left: calc(50% + 98.01px);
  top: 0;
  width: 129.926px;
  height: 181.485px;
  transform: translateX(-50%) rotate(6deg);
  z-index: 10;
}

.card-stack-item--center {
  left: calc(50% - 6.72px);
  top: 17.86px;
  width: 143.395px;
  height: 200.298px;
  transform: translateX(-50%) rotate(0.5deg);
  z-index: 20;
}

.scaled-card-left,
.scaled-card-right {
  transform: scale(0.412);
  transform-origin: top left;
  pointer-events: none;
}

.scaled-card-center {
  transform: scale(0.455);
  transform-origin: top left;
  pointer-events: none;
}

.results-info-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 326px;
}

.category-badge-box {
  background-color: rgba(200, 193, 183, 0.43);
  width: 326px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
}

.category-badge-text {
  font-family: 'Georgia', serif;
  font-weight: bold;
  font-size: 20px;
  line-height: 20px;
  color: #3f3f35;
  text-align: center;
  word-break: break-word;
}

.stats-row {
  display: flex;
  gap: 8px;
  width: 326px;
  height: 32px;
}

.stat-box {
  background-color: rgba(200, 193, 183, 0.43);
  width: 159px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 15px;
  box-sizing: border-box;
}

.stat-label {
  font-family: 'Linux Libertine', Georgia, serif;
  font-weight: bold;
  font-size: 14px;
  line-height: 20px;
  color: #3f3f35;
}

.stat-value {
  font-family: 'Linux Libertine', Georgia, serif;
  font-weight: bold;
  font-size: 14px;
  line-height: 20px;
  color: #3f3f35;
  text-align: center;
}

.try-again-message {
  font-family: 'Linux Libertine', Georgia, serif;
  font-weight: bold;
  font-size: 14px;
  color: #000;
  text-align: center;
  margin-top: 8px;
  margin-bottom: 8px;
}

.try-again-button {
  background-color: #4a6783;
  color: #fdf4eb;
  font-family: 'Linux Libertine', Georgia, serif;
  font-weight: bold;
  font-size: 16px;
  line-height: 20px;
  text-align: center;
  width: 326px;
  height: 44px;
  border: none;
  border-radius: 2px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease, transform 0.1s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.try-again-button:hover {
  background-color: #3b526b;
}

.try-again-button:active {
  transform: scale(0.98);
}

/* Unified Results Layout Styles */
.results-page-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding-top: 10px;
  padding-bottom: 20px;
  width: 100%;
  max-width: 360px;
  margin-left: auto;
  margin-right: auto;
}

.results-title-container {
  width: 326px;
  display: flex;
  justify-content: center;
  padding: 4px 0;
}

.results-title {
  font-family: 'Georgia', serif;
  font-weight: bold;
  font-size: 24px;
  color: #3f3f35;
  text-align: center;
}

.results-tabs-container {
  width: 326px;
  margin: 0 auto;
}

.results-tabs {
  background-color: rgba(63, 63, 53, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 3px;
  padding: 2px;
  width: 326px;
}

.results-tab-btn {
  font-family: 'Linux Libertine', Georgia, serif;
  font-weight: bold;
  font-size: 14px;
  line-height: 20px;
  text-align: center;
  height: 24px;
  flex: 1;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  background-color: transparent;
  color: #5c5c54;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.results-tab-btn--active {
  background-color: #3f3f35;
  color: #fdf4eb;
}

.results-content-area {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.cards-tab-content {
  width: 100%;
}

.stats-tab-content {
  width: 100%;
}

.results-category-badge {
  background-color: rgba(200, 193, 183, 0.43);
  width: 326px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
  font-family: 'Georgia', serif;
  font-weight: bold;
  font-size: 16px;
  color: #3f3f35;
  text-align: center;
}

.results-total-collected {
  background-color: rgba(200, 193, 183, 0.43);
  width: 326px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
  font-family: 'Linux Libertine', Georgia, serif;
  font-weight: bold;
  font-size: 16px;
  color: #3f3f35;
  text-align: center;
}

.results-fakes-facts-row {
  display: flex;
  justify-content: space-between;
  width: 326px;
  height: 32px;
}

.results-fakes-box {
  background-color: rgba(253, 244, 235, 0.7);
  width: 159px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 15px;
  box-sizing: border-box;
  font-family: 'Linux Libertine', Georgia, serif;
  font-weight: bold;
  font-size: 14px;
  color: #3f3f35;
}

.results-facts-box {
  background-color: rgba(63, 63, 53, 0.88);
  width: 159px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 15px;
  box-sizing: border-box;
  font-family: 'Linux Libertine', Georgia, serif;
  font-weight: bold;
  font-size: 14px;
  color: #fdf4eb;
}

.results-star-breakdown-box {
  width: 326px;
}

.star-breakdown-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  height: 32px;
  padding: 0 15px;
  box-sizing: border-box;
}

.star-breakdown-stars {
  display: flex;
  gap: 4px;
  align-items: center;
}

.star-breakdown-count {
  font-family: 'Linux Libertine', Georgia, serif;
  font-weight: bold;
  font-size: 16px;
  color: #3f3f35;
}

.keep-playing-btn {
  background-color: #4a6783;
  color: #fdf4eb;
  font-family: 'Linux Libertine', Georgia, serif;
  font-weight: bold;
  font-size: 16px;
  line-height: 20px;
  text-align: center;
  width: 326px;
  height: 44px;
  border: none;
  border-radius: 2px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease, transform 0.1s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-top: 12px;
}

.keep-playing-btn:hover {
  background-color: #3b526b;
}

.keep-playing-btn:active {
  transform: scale(0.98);
}

/* Cards Grid Styling */
.cards-grid-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  justify-content: center;
  margin-left: auto;
  margin-right: auto;
  width: 314.4px; /* 151.2px * 2 + 12px gap */
}

.grid-card-wrapper {
  width: 151.2px; /* 315px * 0.48 */
  height: 211.2px; /* 440px * 0.48 */
  position: relative;
  overflow: visible; /* so correct/incorrect badge can pop out of bounds */
}

.grid-card-inner {
  transform: scale(0.48);
  transform-origin: top left;
  width: 315px;
  height: 440px;
  pointer-events: none;
}

.card-grid-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  border: 2px solid #fff;
  z-index: 30;
}

.card-grid-badge--correct {
  background-color: #2a9d8f;
  color: #fff;
}

.card-grid-badge--incorrect {
  background-color: #e63946;
  color: #fff;
}

.badge-icon {
  font-family: sans-serif;
  font-weight: 900;
  font-size: 12px;
  line-height: 1;
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
