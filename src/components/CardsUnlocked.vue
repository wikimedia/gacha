<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore';
import { useGameStore } from '../stores/useGameStore';
import type { Card } from '../stores/useGameStore';
import CardComp from './Card.vue';

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
        await gameStore.claimArticlesForProfile(realCardIds);
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

// Category color configurations for small badge borders/backgrounds
const getCategoryClass = (category: string) => {
  switch (category) {
    case 'Animals':
      return 'bg-category-animals-icon-bg text-category-animals-text border-category-animals-border/40 dark:bg-category-animals-icon-bg-dark dark:text-category-animals-text-dark dark:border-category-animals-border/20';
    case 'Earth':
      return 'bg-category-earth-icon-bg text-category-earth-text border-category-earth-border/40 dark:bg-category-earth-icon-bg-dark dark:text-category-earth-text-dark dark:border-category-earth-border/20';
    case 'Entertainment':
      return 'bg-category-entertainment-icon-bg text-category-entertainment-text border-category-entertainment-border/40 dark:bg-category-entertainment-icon-bg-dark dark:text-category-entertainment-text-dark dark:border-category-entertainment-border/20';
    case 'History':
      return 'bg-category-history-icon-bg text-category-history-text border-category-history-border/40 dark:bg-category-history-icon-bg-dark dark:text-category-history-text-dark dark:border-category-history-border/20';
    case 'Physical Science':
      return 'bg-category-physical-science-icon-bg text-category-physical-science-text border-category-physical-science-border/40 dark:bg-category-physical-science-icon-bg-dark dark:text-category-physical-science-text-dark dark:border-category-physical-science-border/20';
    case 'Society':
      return 'bg-category-society-icon-bg text-category-society-text border-category-society-border/40 dark:bg-category-society-icon-bg-dark dark:text-category-society-text-dark dark:border-category-society-border/20';
    case 'Space':
      return 'bg-category-space-icon-bg text-category-space-text border-category-space-border/40 dark:bg-category-space-icon-bg-dark dark:text-category-space-text-dark dark:border-category-space-border/20';
    default:
      return 'bg-base-200 text-base-content/85 border-base-300';
  }
};

// Rarity style config for row items
const getRarityConfig = (rarity: string) => {
  switch (rarity) {
    case 'Legendary':
      return {
        badgeClass: 'badge-warning text-warning-content border-warning font-black shadow-sm shadow-warning/20',
        rowClass: 'border-l-4 border-l-warning bg-amber-50/50 dark:bg-amber-950/10 hover:bg-amber-100/40 dark:hover:bg-amber-900/20 border-amber-100 dark:border-amber-900/30',
        textClass: 'text-amber-800 dark:text-amber-400 font-bold',
        shimmerClass: 'shimmer-gold'
      };
    case 'Epic':
      return {
        badgeClass: 'badge-neutral text-neutral-content border-neutral font-extrabold shadow-sm shadow-neutral/20',
        rowClass: 'border-l-4 border-l-purple-500 bg-purple-50/30 dark:bg-purple-950/10 hover:bg-purple-100/30 dark:hover:bg-purple-900/20 border-purple-100 dark:border-purple-900/30',
        textClass: 'text-purple-800 dark:text-purple-400 font-bold',
        shimmerClass: 'shimmer-purple'
      };
    case 'Rare':
      return {
        badgeClass: 'badge-primary text-primary-content border-primary font-bold shadow-sm shadow-primary/20',
        rowClass: 'border-l-4 border-l-primary bg-blue-50/30 dark:bg-blue-950/10 hover:bg-blue-100/30 dark:hover:bg-blue-900/20 border-blue-100 dark:border-blue-900/30',
        textClass: 'text-blue-800 dark:text-blue-400 font-semibold',
        shimmerClass: 'shimmer-blue'
      };
    case 'Common':
    default:
      return {
        badgeClass: 'badge-ghost text-base-content/70 border-base-300 font-normal',
        rowClass: 'border-l-4 border-l-base-300 bg-base-100 dark:bg-base-900/40 hover:bg-base-200/50 border-base-200 dark:border-base-800/60',
        textClass: 'text-base-content font-medium',
        shimmerClass: ''
      };
  }
};

// Check if card has a custom CSS gradient background or a standard image URL
const getCardImageStyle = (image: string) => {
  if (!image) {
    return {
      background: 'linear-gradient(135deg, var(--color-base-300), var(--color-primary))'
    };
  }
  if (image.startsWith('linear-gradient') || image.startsWith('url(')) {
    return { backgroundImage: image };
  }
  return { backgroundImage: `url("${image}")` };
};

const isCSSImage = (image: string) => {
  return !image || image.startsWith('linear-gradient') || image.startsWith('url(');
};

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
      await gameStore.claimArticlesForProfile(realCardIds);
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

const handleDismiss = () => {
  emit('dismiss');
};
</script>

<template>
  <!-- TRY AGAIN / LOST SCREEN (Figma Redesign) -->
  <div v-if="lost" class="try-again-screen-container select-none">
    <!-- 1. Card Stack (homeHero) -->
    <div class="card-stack-container">
      <!-- Left Card -->
      <div v-if="stackCards.left" class="card-stack-item card-stack-item--left">
        <CardComp :card="stackCards.left" :show-link="false" class="scaled-card-left" />
      </div>
      
      <!-- Right Card -->
      <div v-if="stackCards.right" class="card-stack-item card-stack-item--right">
        <CardComp :card="stackCards.right" :show-link="false" class="scaled-card-right" />
      </div>

      <!-- Center Card -->
      <div v-if="stackCards.center" class="card-stack-item card-stack-item--center">
        <CardComp :card="stackCards.center" :show-link="false" class="scaled-card-center" />
      </div>
    </div>

    <!-- 2. Results Info Section -->
    <div class="results-info-container">
      <!-- Category Badge Box -->
      <div class="category-badge-box">
        <span class="category-badge-text">{{ category || 'General Knowledge' }}</span>
      </div>

      <!-- Stats Box Row -->
      <div class="stats-row">
        <!-- Collected Box -->
        <div class="stat-box">
          <span class="stat-label">Collected</span>
          <span class="stat-value">{{ gameStats.score ?? 0 }}</span>
        </div>
        <!-- Fakes Box -->
        <div class="stat-box">
          <span class="stat-label">Fakes</span>
          <span class="stat-value">{{ identifiedFakes?.length ?? 0 }}</span>
        </div>
      </div>
    </div>

    <!-- 3. Message Text -->
    <div class="try-again-message">
      Better luck next time!
    </div>

    <!-- 4. Retry Button -->
    <button @click="handleDismiss" class="try-again-button">
      Try again to collect cards
    </button>
  </div>

  <!-- WIN / CLAIM / GACHA SCREEN -->
  <div v-else class="flex-grow flex flex-col gap-6 py-4 select-none">
    
    <!-- CELEBRATION HEADER -->
    <header class="text-center">
      <span class="text-5xl drop-shadow-md">🏆</span>
      <h2 class="font-serif text-2xl font-black mt-3 mb-1 text-primary">
        {{ gameType === 'fakeout' ? 'Game Summary!' : 'Gacha Complete!' }}
      </h2>
    </header>

    <!-- LIST OF UNLOCKED REAL CARDS -->
    <div class="flex flex-col gap-3">
      <h3 class="text-xs font-black text-secondary uppercase tracking-widest text-left pl-1">
        Real Cards Unlocked
      </h3>
      
      <div 
        class="border border-base-300 rounded-xl bg-base-100 shadow-inner overflow-hidden max-h-[300px] overflow-y-auto"
      >
        <div v-if="unlockedCards.length === 0" class="text-xs text-secondary italic text-center py-10 font-sans">
          No real cards unlocked this time. Keep trying!
        </div>
        
        <div v-else class="flex flex-col">
          <div 
            v-for="(card, index) in unlockedCards"
            :key="card.id"
            class="flex items-center justify-between p-3 border-b border-base-200 last:border-b-0 transition-all duration-300 animate-card-reveal"
            :class="[
              getRarityConfig(card.rarity).rowClass,
              getRarityConfig(card.rarity).shimmerClass
            ]"
            :style="{ animationDelay: `${index * 80}ms` }"
          >
            <!-- Card Thumbnail & Details -->
            <div class="flex items-center gap-3 text-left">
              <!-- Mini Thumbnail Image -->
              <div 
                class="w-10 h-10 rounded border border-base-300 flex-shrink-0 overflow-hidden bg-base-200 flex items-center justify-center shadow-inner"
              >
                <div 
                  v-if="isCSSImage(card.image)"
                  class="w-full h-full"
                  :style="getCardImageStyle(card.image)"
                  style="background-size: cover; background-position: center;"
                ></div>
                <img 
                  v-else
                  :src="card.image"
                  referrerpolicy="no-referrer"
                  class="w-full h-full object-cover"
                  alt="Mini Card Thumbnail"
                />
              </div>
              
              <!-- Info details -->
              <div class="flex flex-col">
                <span class="font-serif text-xs font-black leading-tight" :class="getRarityConfig(card.rarity).textClass">
                  {{ card.title }}
                </span>
                <div class="flex gap-1.5 mt-0.5 items-center">
                  <span class="text-[8px] badge badge-xs border py-1" :class="getCategoryClass(card.category)">
                    {{ card.category }}
                  </span>
                </div>
              </div>
            </div>
            
            <!-- Rarity Badge on Right -->
            <span class="badge badge-xs text-[8px] uppercase py-2 px-1.5" :class="getRarityConfig(card.rarity).badgeClass">
              {{ card.rarity }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- LIST OF IDENTIFIED FAKES (Fakeout Only) -->
    <div v-if="gameType === 'fakeout' && identifiedFakes && identifiedFakes.length > 0" class="flex flex-col gap-3">
      <h3 class="text-xs font-black text-secondary uppercase tracking-widest text-left pl-1">
        Spotted the Fakes!
      </h3>
      
      <div 
        class="border border-base-300 rounded-xl bg-base-100 shadow-inner overflow-hidden max-h-[180px] overflow-y-auto"
      >
        <div class="flex flex-col">
          <div 
            v-for="(card, index) in identifiedFakes"
            :key="card.id"
            class="flex items-center justify-between p-3 border-b border-base-200 last:border-b-0 hover:bg-base-200/50 transition-all duration-300 animate-card-reveal"
            :style="{ animationDelay: `${(index + unlockedCards.length) * 80}ms` }"
          >
            <div class="flex items-center gap-3 text-left">
              <span class="text-base p-1.5 bg-error/10 border border-error/20 text-error rounded-lg">
                🔍
              </span>
              <div class="flex flex-col">
                <span class="font-serif text-xs font-black leading-tight text-base-content/80 line-through decoration-error/50">
                  {{ card.title }}
                </span>
                <span class="text-[8px] text-error font-sans font-black uppercase mt-0.5 tracking-wider">
                  Fake Entry Spotted
                </span>
              </div>
            </div>
            
            <span class="badge badge-error badge-outline badge-xs text-[8px] uppercase py-2 font-black">
              Correct
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- MAIN CLAIMING AND ACTION BLOCK -->
    <div class="card card-bordered bg-base-100 border-base-300 shadow-md p-5 text-center mt-2">
      
      <!-- Option 1: Unclaimed State -->
      <div v-if="!isClaimed && !showLoginPrompt" class="flex flex-col gap-3">
        <h4 class="font-serif font-black text-sm text-base-content leading-tight">
          {{ unlockedCards.length > 0 ? 'Ready to Claim Your Discoveries?' : 'No Discoveries to Claim' }}
        </h4>
        <p class="text-xs text-secondary leading-relaxed font-sans font-light">
          {{ unlockedCards.length > 0 
            ? 'Add these articles to your Wikipedia binder collection and collect points to unlock more rewards.'
            : 'Get answers correct in the game to unlock cards that you can claim here!'
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

        <button 
          @click="handleDismiss"
          class="btn btn-outline border-base-300 w-full uppercase font-bold text-xs"
        >
          🔄 Return to Home Screen
        </button>
      </div>

      <!-- Option 2: Guest Authentication Prompt Dialog inside Claim card -->
      <div v-else-if="!isClaimed && showLoginPrompt" class="flex flex-col gap-3 animate-fade-in">
        <h4 class="font-serif font-black text-sm text-primary leading-tight">
          Sign In to Claim Cards
        </h4>
        <p class="text-xs text-secondary leading-relaxed font-sans font-light">
          To claim these cards and add them to your collection, please log in with your email. This ensures your discoveries are securely saved.
        </p>
        
        <div class="flex flex-col gap-2 mt-2">
          <button 
            @click="handleOpenAuth"
            class="btn btn-primary w-full uppercase font-bold text-xs text-white"
          >
            🔑 Log In to Claim
          </button>
          
          <button 
            @click="showLoginPrompt = false" 
            class="btn btn-ghost btn-xs text-secondary hover:bg-transparent mt-1"
          >
            ← Cancel
          </button>
        </div>
      </div>

      <!-- Option 3: Successfully Claimed State -->
      <div v-else class="flex flex-col gap-3 animate-fade-in">
        <span class="text-4xl animate-bounce">✨</span>
        <h4 class="font-serif font-black text-sm text-success leading-tight">
          Discoveries Claimed!
        </h4>
        <p class="text-xs text-secondary leading-relaxed font-sans font-light">
          Your unlocked cards have been successfully saved to your cloud profile binder!
        </p>
        
        <div class="flex flex-col gap-2 mt-2">
          <button 
            @click="handleViewBinder"
            class="btn btn-primary w-full uppercase font-bold text-xs text-white"
          >
            📖 Open Binder & View Cards
          </button>

          <button 
            @click="handleDismiss"
            class="btn btn-outline border-base-300 w-full uppercase font-bold text-xs"
          >
            Back to Home
          </button>
        </div>
      </div>
      
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
</style>
