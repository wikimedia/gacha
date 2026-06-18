<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore';
import { useGameStore } from '../stores/useGameStore';
import type { Card } from '../stores/useGameStore';

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
}>();

const emit = defineEmits<{
  (e: 'claim', claimedCards: Card[]): void;
  (e: 'dismiss'): void;
  (e: 'open-auth'): void;
}>();

const router = useRouter();
const authStore = useAuthStore();
const gameStore = useGameStore();

const isClaimed = ref(false);
const isClaiming = ref(false);
const showLoginPrompt = ref(false);

// Watch for authentication state changes. If they log in while on this screen and
// the login prompt is open, we automatically proceed with the claim process.
watch(() => authStore.isLoggedIn, (loggedIn) => {
  if (loggedIn && showLoginPrompt.value) {
    showLoginPrompt.value = false;
    handleClaim();
  }
});

// Category color configurations for small badge borders/backgrounds
const getCategoryClass = (category: string) => {
  switch (category) {
    case 'Animals':
      return 'bg-[#fce8e6] text-[#a50e0e] border-[#fad2cf]';
    case 'Earth':
      return 'bg-[#fef7e0] text-[#b06000] border-[#fde89e]';
    case 'Entertainment':
      return 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]';
    case 'History':
      return 'bg-[#ffe6cc] text-[#a34f00] border-[#ffcc99]';
    case 'Physical Science':
      return 'bg-[#e4f7fb] text-[#007b83] border-[#a2e2eb]';
    case 'Society':
      return 'bg-[#e8f0fe] text-[#174ea6] border-[#aecbfa]';
    case 'Space':
      return 'bg-[#fdebe8] text-[#c23b34] border-[#fbcfc9]';
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

// Trigger the claim flow
const handleClaim = async () => {
  // If the user is not logged in, prompt them to sign in
  if (!authStore.isLoggedIn) {
    showLoginPrompt.value = true;
    return;
  }

  isClaiming.value = true;
  
  try {
    // 1. Collect all real cards in the game store
    const realCardIds: string[] = [];
    props.unlockedCards.forEach(card => {
      gameStore.collectCard(card);
      realCardIds.push(card.id);
    });

    // 2. Claim all real cards in Supabase for this profile
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
  <div class="flex-grow flex flex-col gap-6 py-4 select-none">
    
    <!-- CELEBRATION HEADER -->
    <header class="text-center">
      <span class="text-5xl drop-shadow-md">{{ lost ? '💔' : '🏆' }}</span>
      <h2 class="font-serif text-2xl font-black mt-3 mb-1" :class="lost ? 'text-error' : 'text-primary'">
        {{ lost ? 'Game Over!' : (gameType === 'fakeout' ? 'Game Summary!' : 'Gacha Complete!') }}
      </h2>
      

    </header>

    <!-- LIST OF UNLOCKED REAL CARDS -->
    <div class="flex flex-col gap-3">
      <h3 class="text-xs font-black text-secondary uppercase tracking-widest text-left pl-1">
        {{ lost ? 'Cards You Could Have Claimed' : 'Real Cards Unlocked' }}
      </h3>
      
      <div 
        class="border border-base-300 rounded-xl bg-base-100 shadow-inner overflow-hidden max-h-[300px] overflow-y-auto"
      >
        <div v-if="unlockedCards.length === 0" class="text-xs text-secondary italic text-center py-10 font-sans">
          {{ lost ? 'No cards were unlocked before the mistake. Keep trying!' : 'No real cards unlocked this time. Keep trying!' }}
        </div>
        
        <div v-else class="flex flex-col">
          <div 
            v-for="(card, index) in unlockedCards"
            :key="card.id"
            class="flex items-center justify-between p-3 border-b border-base-200 last:border-b-0 transition-all duration-300 animate-card-reveal"
            :class="[
              lost ? 'grayscale opacity-60 border-l-4 border-l-error bg-base-100 dark:bg-base-900/40 hover:bg-base-200/30' : getRarityConfig(card.rarity).rowClass,
              lost ? '' : getRarityConfig(card.rarity).shimmerClass
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
                <span class="font-serif text-xs font-black leading-tight" :class="lost ? 'text-base-content/60 font-semibold' : getRarityConfig(card.rarity).textClass">
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
            <span v-if="lost" class="badge badge-error badge-outline badge-xs text-[8px] uppercase py-2 font-black">
              🔒 Locked
            </span>
            <span v-else class="badge badge-xs text-[8px] uppercase py-2 px-1.5" :class="getRarityConfig(card.rarity).badgeClass">
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
            :class="{ 'grayscale opacity-60': lost }"
            :style="{ animationDelay: `${(index + unlockedCards.length) * 80}ms` }"
          >
            <div class="flex items-center gap-3 text-left">
              <!-- Magnifying glass / target indicator -->
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
            
            <span v-if="lost" class="badge badge-ghost badge-xs text-[8px] uppercase py-2 font-black opacity-60">
              🔒 Locked
            </span>
            <span v-else class="badge badge-error badge-outline badge-xs text-[8px] uppercase py-2 font-black">
              Correct
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- MAIN CLAIMING AND ACTION BLOCK -->
    <div class="card card-bordered bg-base-100 border-base-300 shadow-md p-5 text-center mt-2">
      
      <!-- Option 4: Lost / Tease State -->
      <div v-if="lost" class="flex flex-col gap-3 animate-fade-in">
        <h4 class="font-serif font-black text-sm text-error leading-tight">
          A Single Mistake Cost You!
        </h4>
        <p class="text-xs text-secondary leading-relaxed font-sans font-light">
          {{ unlockedCards.length > 0 
            ? "You got a card wrong, ending your run. You missed the chance to claim the cards you got right!"
            : "You got a card wrong, ending your run. No cards were earned this time."
          }}
        </p>
        
        <div class="flex flex-col gap-2 mt-2">
          <!-- Try Again button -->
          <button 
            @click="handleDismiss"
            class="btn btn-error btn-outline w-full uppercase font-bold text-xs"
          >
            🔄 Try Again
          </button>
        </div>
      </div>

      <!-- Option 1: Unclaimed State -->
      <div v-else-if="!isClaimed && !showLoginPrompt" class="flex flex-col gap-3">
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
          <!-- Button to trigger login modal -->
          <button 
            @click="handleOpenAuth"
            class="btn btn-primary w-full uppercase font-bold text-xs text-white"
          >
            🔑 Log In to Claim
          </button>
          
          <!-- Back button -->
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
          <!-- View Binder -->
          <button 
            @click="handleViewBinder"
            class="btn btn-primary w-full uppercase font-bold text-xs text-white"
          >
            📖 Open Binder & View Cards
          </button>

          <!-- Back to categories/home -->
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
</style>
