<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore';
import { useGameStore } from '../stores/useGameStore';
import type { Card } from '../stores/useGameStore';
import CardComp from '../components/Card.vue';
import PageLayout from '../components/PageLayout.vue';

const route = useRoute();
const router = useRouter();

const authStore = useAuthStore();
const gameStore = useGameStore();

// Active Category for Fakeout Game
const selectedCategory = ref<'Science' | 'History' | 'Pop Culture' | 'Geography' | null>(null);

// Game States
const gameActive = ref(false);
const currentRound = ref(1);
const gameDeck = ref<Card[]>([]);
const visibleDeck = computed(() => {
  return gameDeck.value.slice(currentRound.value - 1, currentRound.value + 2);
});
const currentCard = ref<Card | null>(null);
const gameScore = ref(0);
const collectedThisGame = ref<Card[]>([]);
const roundAnswered = ref(false);
const playerChoiceReal = ref<boolean | null>(null);
const swipeOffset = ref(0);
const isSwiping = ref(false);
const touchStartX = ref(0);

// Stamp feedback states
const roundWasCorrect = ref(false);
const stampAngle = ref(0);
const swipeDirection = ref<'left' | 'right' | null>(null);

// Cooldown ticking
const cooldownTimers = ref<Record<string, number>>({});

// Gacha Drop States
const gachaActive = ref(false);
const gachaTimer = ref(10);
const gachaTapCount = ref(0);
const gachaDroppedCards = ref<Card[]>([]);
const showGachaSummary = ref(false);
const isGlobeJiggling = ref(false);

// Post-Game Flow & Gacha Tease States
const pointsBeforeGame = ref(gameStore.gdPoints);
const displayedPoints = ref(gameStore.gdPoints);
const isUnlockedJustNow = ref(false);
const headerRef = ref<any>(null);

const animateProgressBar = (start: number, end: number) => {
  if (start >= end) {
    displayedPoints.value = end;
    return;
  }
  
  isUnlockedJustNow.value = false;
  displayedPoints.value = start;
  
  const duration = 1500;
  const startTime = performance.now();

  const update = (now: number) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    
    const currentVal = Math.round(start + (end - start) * easeProgress);
    
    if (currentVal >= 100 && displayedPoints.value < 100) {
      isUnlockedJustNow.value = true;
      setTimeout(() => {
        isUnlockedJustNow.value = false;
      }, 2500);
    }
    
    displayedPoints.value = currentVal;
    
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      displayedPoints.value = end;
      if (end >= 100 && !isUnlockedJustNow.value && start < 100) {
        isUnlockedJustNow.value = true;
        setTimeout(() => {
          isUnlockedJustNow.value = false;
        }, 2500);
      }
    }
  };
  
  requestAnimationFrame(update);
};

// Reactively sync displayed points when not in-game
watch(() => gameStore.gdPoints, (newPoints) => {
  if (!gameActive.value) {
    displayedPoints.value = newPoints;
  }
});

const checkTriggerGacha = () => {
  if (route.query.triggerGacha === 'true') {
    if (authStore.isLoggedIn && gameStore.gdPoints >= 100) {
      router.replace({ query: {} });
      startGachaDrop();
    }
  }
};

watch([() => authStore.isLoggedIn, () => gameStore.gdPoints], () => {
  checkTriggerGacha();
});

// DEV / DEBUG BUILD HELPERS
const isDev = import.meta.env.DEV;

const triggerDebugGacha = () => {
  if (!authStore.isLoggedIn) {
    authStore.login('DevTester');
  }
  if (gameStore.gdPoints < 100) {
    gameStore.addPoints(100 - gameStore.gdPoints);
  }
  displayedPoints.value = gameStore.gdPoints;
  startGachaDrop();
};

const addDebugPoints = () => {
  gameStore.addPoints(100);
  displayedPoints.value = gameStore.gdPoints;
};

// Cooldown tracking
const updateCooldowns = () => {
  const categories: Array<'Science' | 'History' | 'Pop Culture' | 'Geography'> = ['Science', 'History', 'Pop Culture', 'Geography'];
  categories.forEach(cat => {
    cooldownTimers.value[cat] = gameStore.getCooldownTimeRemaining(cat);
  });
};

// Cooldown decrement loop
onMounted(async () => {
  authStore.initAuth();
  gameStore.loadGuestState();
  updateCooldowns();
  
  displayedPoints.value = gameStore.gdPoints;
  
  // Load dynamic articles from Supabase (failsafe fallback to MOCK_CARDS built-in)
  await gameStore.loadCardsFromDatabase();
  
  setInterval(() => {
    updateCooldowns();
  }, 1000);

  checkTriggerGacha();
});

// Category selection & game initialization
const startFakeoutGame = (category: 'Science' | 'History' | 'Pop Culture' | 'Geography') => {
  if (gameStore.isCooldownActive(category)) return;
  
  pointsBeforeGame.value = gameStore.gdPoints;
  selectedCategory.value = category;
  gameActive.value = true;
  currentRound.value = 1;
  gameScore.value = 0;
  collectedThisGame.value = [];
  roundAnswered.value = false;
  playerChoiceReal.value = null;
  
  // Prepare game deck: 10 random cards from this category
  const catCards = gameStore.gameCards.filter(c => c.category === category);
  // Shuffle cards
  const shuffled = [...catCards].sort(() => Math.random() - 0.5);
  // Take up to 10
  gameDeck.value = shuffled.slice(0, 10);
  
  loadRound();
};

const loadRound = () => {
  if (currentRound.value > gameDeck.value.length) {
    endFakeoutGame();
    return;
  }
  
  currentCard.value = gameDeck.value[currentRound.value - 1];
  roundAnswered.value = false;
  playerChoiceReal.value = null;
  swipeOffset.value = 0;
  swipeDirection.value = null;
};

// Submit Swipe/Answer Choice
const handleSwipeChoice = (isRealChoice: boolean) => {
  if (roundAnswered.value || !currentCard.value) return;
  
  playerChoiceReal.value = isRealChoice;
  roundAnswered.value = true;
  swipeDirection.value = isRealChoice ? 'right' : 'left';
  
  const card = currentCard.value;
  const isCorrect = isRealChoice === card.isReal;
  
  roundWasCorrect.value = isCorrect;
  stampAngle.value = Math.floor(Math.random() * 30) - 15; // Random angle between -15 and 15 degrees
  
  if (isCorrect) {
    gameScore.value += 1;
    // Earn point in game store
    gameStore.addPoints(1);
    
    // If it's a real card, collect it!
    if (card.isReal) {
      gameStore.collectCard(card.id);
      collectedThisGame.value.push(card);
    }
  }

  // Tighten up loop: automatically advance to the next card after 1 second!
  setTimeout(() => {
    nextRound();
  }, 1000);
};

const nextRound = () => {
  currentRound.value += 1;
  loadRound();
};

const endFakeoutGame = () => {
  gameActive.value = false;
  if (selectedCategory.value) {
    gameStore.setCooldown(selectedCategory.value);
  }
  
  // Claim collected articles for this user's profile in Supabase
  if (collectedThisGame.value.length > 0) {
    const collectedQids = collectedThisGame.value.map(c => c.id);
    gameStore.claimArticlesForProfile(collectedQids);
  }
  
  selectedCategory.value = null;
  updateCooldowns();
  
  animateProgressBar(pointsBeforeGame.value, gameStore.gdPoints);
};

// Touch/Swipe Gesture Handlers for Mobile Swiping Feel
const handleTouchStart = (e: TouchEvent) => {
  if (roundAnswered.value) return;
  touchStartX.value = e.touches[0].clientX;
  isSwiping.value = true;
};

const handleTouchMove = (e: TouchEvent) => {
  if (!isSwiping.value || roundAnswered.value) return;
  const diffX = e.touches[0].clientX - touchStartX.value;
  swipeOffset.value = diffX;
};

const handleTouchEnd = () => {
  if (!isSwiping.value || roundAnswered.value) return;
  isSwiping.value = false;
  evaluateSwipe();
};

// Mouse Drag Gesture Handlers for Desktop Browser Swiping Feel
const handleMouseDown = (e: MouseEvent) => {
  if (roundAnswered.value) return;
  touchStartX.value = e.clientX;
  isSwiping.value = true;
  // Prevent text selection during drag
  e.preventDefault();
};

const handleMouseMove = (e: MouseEvent) => {
  if (!isSwiping.value || roundAnswered.value) return;
  const diffX = e.clientX - touchStartX.value;
  swipeOffset.value = diffX;
};

const handleMouseUp = () => {
  if (!isSwiping.value || roundAnswered.value) return;
  isSwiping.value = false;
  evaluateSwipe();
};

const evaluateSwipe = () => {
  // Threshold to trigger swipe action (100px)
  if (swipeOffset.value > 100) {
    // Swipe Right -> Choose Real
    handleSwipeChoice(true);
  } else if (swipeOffset.value < -100) {
    // Swipe Left -> Choose Fake
    handleSwipeChoice(false);
  } else {
    // Return to center
    swipeOffset.value = 0;
  }
};

// Gacha Drop Logic
const startGachaDrop = () => {
  if (gameStore.gdPoints < 100) return;
  
  // If guest, block and request sign-up/login
  if (!authStore.isLoggedIn) {
    headerRef.value?.openAuthModal();
    return;
  }
  
  // Spend points
  if (gameStore.spendPoints(100)) {
    gachaActive.value = true;
    gachaTimer.value = 10;
    gachaTapCount.value = 0;
    gachaDroppedCards.value = [];
    showGachaSummary.value = false;
    
    displayedPoints.value = gameStore.gdPoints;
    isUnlockedJustNow.value = false;
    
    // 10 second ticking timer
    const interval = setInterval(() => {
      gachaTimer.value -= 1;
      if (gachaTimer.value <= 0) {
        clearInterval(interval);
        gachaActive.value = false;
        showGachaSummary.value = true;
        
        // Claim all dropped articles for this user's profile in Supabase
        const droppedQids = gachaDroppedCards.value.map(c => c.id);
        if (droppedQids.length > 0) {
          gameStore.claimArticlesForProfile(droppedQids);
        }
      }
    }, 1000);
  }
};

const handleGachaGlobeTap = () => {
  if (!gachaActive.value) return;
  
  gachaTapCount.value += 1;
  isGlobeJiggling.value = true;
  setTimeout(() => {
    isGlobeJiggling.value = false;
  }, 150);
  
  // Select a card at random from the database-backed deck, filtering only for real cards
  const realCards = gameStore.gameCards.filter(c => c.isReal);
  if (realCards.length === 0) return;
  const randomCard = realCards[Math.floor(Math.random() * realCards.length)];
  
  // Collect the card in inventory
  gameStore.collectCard(randomCard.id);
  
  // Insert at front of display deck
  gachaDroppedCards.value.unshift(randomCard);
};

const getCategoryDetails = (cat: 'History' | 'Science' | 'Pop Culture' | 'Geography') => {
  switch (cat) {
    case 'History':
      return {
        emoji: '🏛️',
        bgClass: 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:hover:bg-amber-900/30',
        borderClass: 'border-amber-200 hover:border-amber-400 dark:border-amber-900/40 dark:hover:border-amber-700/60',
        textClass: 'text-amber-900 dark:text-amber-100',
        iconBg: 'bg-amber-100/80 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
        arrowColorClass: 'text-amber-200 group-hover:text-amber-400 dark:text-amber-900/40 dark:group-hover:text-amber-700/60',
        titleColorClass: 'text-amber-600 group-hover:text-amber-700 dark:text-amber-400 dark:group-hover:text-amber-300'
      };
    case 'Science':
      return {
        emoji: '🧪',
        bgClass: 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30',
        borderClass: 'border-emerald-200 hover:border-emerald-400 dark:border-emerald-900/40 dark:hover:border-emerald-700/60',
        textClass: 'text-emerald-900 dark:text-emerald-100',
        iconBg: 'bg-emerald-100/80 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
        arrowColorClass: 'text-emerald-200 group-hover:text-emerald-400 dark:text-emerald-900/40 dark:group-hover:text-emerald-700/60',
        titleColorClass: 'text-emerald-600 group-hover:text-emerald-700 dark:text-emerald-400 dark:group-hover:text-emerald-300'
      };
    case 'Pop Culture':
      return {
        emoji: '🍿',
        bgClass: 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/20 dark:hover:bg-purple-900/30',
        borderClass: 'border-purple-200 hover:border-purple-400 dark:border-purple-900/40 dark:hover:border-purple-700/60',
        textClass: 'text-purple-900 dark:text-purple-100',
        iconBg: 'bg-purple-100/80 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
        arrowColorClass: 'text-purple-200 group-hover:text-purple-400 dark:text-purple-900/40 dark:group-hover:text-purple-700/60',
        titleColorClass: 'text-purple-600 group-hover:text-purple-700 dark:text-purple-400 dark:group-hover:text-purple-300'
      };
    case 'Geography':
      return {
        emoji: '🌍',
        bgClass: 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-900/30',
        borderClass: 'border-blue-200 hover:border-blue-400 dark:border-blue-900/40 dark:hover:border-blue-700/60',
        textClass: 'text-blue-900 dark:text-blue-100',
        iconBg: 'bg-blue-100/80 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
        arrowColorClass: 'text-blue-200 group-hover:text-blue-400 dark:text-blue-900/40 dark:group-hover:text-blue-700/60',
        titleColorClass: 'text-blue-600 group-hover:text-blue-700 dark:text-blue-400 dark:group-hover:text-blue-300'
      };
  }
};
</script>

<template>
  <PageLayout
    ref="headerRef"
    :displayed-points="displayedPoints" 
    :gacha-active="gachaActive || showGachaSummary" 
    @activate="startGachaDrop" 
  >

      <!-- FAKEOUT GAME CATEGORY SELECTION -->
      <section v-if="!gameActive && !gachaActive && !showGachaSummary" class="flex-grow flex flex-col gap-6 justify-center py-6">
        
        <!-- Welcome DaisyUI Card -->
        <div class="card card-bordered bg-base-100 shadow-md">
          <div class="card-body p-5">
            <h2 class="card-title font-serif text-xl border-b border-base-300 pb-2 text-primary font-black">
              Welcome to Moonflower
            </h2>
            <p class="text-xs text-secondary leading-relaxed font-sans font-light mt-1">
              Test your knowledge of the absurd and collect real items for your personal Wikipedia Binder. Identify the altered entries to secure items and acquire **Points**.
            </p>
            
            <!-- Developer Controls Panel (Always Visible in Dev Mode) -->
            <div v-if="isDev" class="mt-4 p-3 bg-base-200/60 border border-base-300 rounded-lg flex flex-col gap-2">
              <div class="text-xs font-bold text-secondary flex items-center gap-1.5">
                🛠️ Developer Controls
              </div>
              <div class="flex gap-2">
                <button 
                  @click="triggerDebugGacha"
                  class="btn btn-error btn-outline btn-xs flex-1 uppercase font-bold text-[10px]"
                >
                  Force Gacha
                </button>
                <button 
                  @click="addDebugPoints"
                  class="btn btn-primary btn-outline btn-xs flex-1 uppercase font-bold text-[10px]"
                >
                  +100 Points
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Category Lists -->
        <div class="flex flex-col gap-3">
          <h3 class="text-xs font-black text-secondary uppercase tracking-widest text-left pl-1">
            Select category to play
          </h3>
          <div class="grid grid-cols-2 gap-4">
            <button
              v-for="cat in (['History', 'Science', 'Pop Culture', 'Geography'] as const)"
              :key="cat"
              @click="startFakeoutGame(cat)"
              :disabled="!!cooldownTimers[cat]"
              class="relative flex flex-col justify-between items-start p-4 h-36 rounded-xl border text-left transition-all duration-300 hover:scale-[1.03] active:scale-95 shadow-sm cursor-pointer group"
              :class="[
                cooldownTimers[cat]
                  ? 'bg-base-200 border-base-300 text-base-content/40 opacity-70 cursor-not-allowed'
                  : `${getCategoryDetails(cat).bgClass} ${getCategoryDetails(cat).borderClass} ${getCategoryDetails(cat).textClass}`
              ]"
            >
              <!-- Top Row: Emoji and Cooldown/Arrow -->
              <div class="flex justify-between items-center w-full">
                <!-- Emoji badge with smooth hover spin or lift -->
                <span 
                  class="text-2xl p-2.5 rounded-lg transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110 flex items-center justify-center"
                  :class="cooldownTimers[cat] ? 'bg-base-300 grayscale' : getCategoryDetails(cat).iconBg"
                >
                  {{ getCategoryDetails(cat).emoji }}
                </span>
                
                <!-- Action / Cooldown icon -->
                <div class="flex items-center">
                  <span v-if="cooldownTimers[cat]" class="text-xs">
                    🔒
                  </span>
                  <span 
                    v-else 
                    class="text-lg opacity-80 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
                    :class="getCategoryDetails(cat).arrowColorClass"
                  >
                    →
                  </span>
                </div>
              </div>
              
              <!-- Bottom Row: Title and details -->
              <div class="w-full mt-auto">
                <h4 
                  class="font-serif font-black text-base leading-tight text-base-content"
                  :class="{ 'opacity-40': cooldownTimers[cat] }"
                >
                  {{ cat }}
                </h4>
                <!-- Cooldown text if locked -->
                <div v-if="cooldownTimers[cat]" class="text-[9px] text-error font-sans font-bold mt-1.5 animate-pulse">
                  Locked ({{ cooldownTimers[cat] }}s)
                </div>
              </div>
            </button>
          </div>
        </div>

        <!-- Binder Button for logged-in user -->
        <router-link
          v-if="authStore.isLoggedIn"
          :to="authStore.user ? '/@' + authStore.user.username : '/'"
          class="btn btn-secondary btn-outline w-full uppercase font-bold text-xs shadow-sm mt-2 rounded"
        >
          📖 Open My Collection Binder
        </router-link>
      </section>

      <!-- FAKEOUT GAME SWIPING MECHANIC -->
      <section v-if="gameActive && currentCard" class="flex-grow flex flex-col justify-between py-2">
        <!-- Game Header -->
        <div class="flex flex-col w-full mb-3">
          <div class="flex items-center justify-between text-xs px-2 mb-2 font-sans font-bold text-secondary">
            <span>Category: <span class="text-base-content font-black">{{ selectedCategory }}</span></span>
            <span>Round {{ currentRound }}/10</span>
            <span>Score: {{ gameScore }}</span>
          </div>
          <!-- Game progress bar -->
          <progress 
            class="progress progress-primary w-full h-1.5 rounded" 
            :value="currentRound - 1" 
            max="10"
          ></progress>
        </div>

        <!-- Swiping Card Area -->
        <div class="flex-grow flex items-center justify-center my-2 relative min-h-[430px]">
          
          <!-- Centered wrapper container -->
          <div class="relative w-full max-w-[280px] h-[400px]">
            
            <div class="stack select-none w-full h-full">
              
              <div
                v-for="(card, index) in visibleDeck"
                :key="card.id"
                class="relative"
                :class="[
                  index === 0
                    ? (roundAnswered 
                        ? 'transition-all duration-300 ease-in opacity-0 pointer-events-none' 
                        : (isSwiping ? 'duration-0' : 'transition-transform duration-200 ease-out'))
                    : 'pointer-events-none select-none'
                ]"
                :style="{ 
                  opacity: index === 0 && roundAnswered ? 0 : 1,
                  transform: index === 0
                    ? (roundAnswered
                        ? (swipeDirection === 'right' ? 'translateX(600px) rotate(45deg)' : 'translateX(-600px) rotate(-45deg)')
                        : `translateX(${swipeOffset}px) rotate(${swipeOffset / 12}deg)`)
                    : ''
                }"
                @touchstart="index === 0 ? handleTouchStart($event) : null"
                @touchmove="index === 0 ? handleTouchMove($event) : null"
                @touchend="index === 0 ? handleTouchEnd() : null"
                @mousedown="index === 0 ? handleMouseDown($event) : null"
                @mousemove="index === 0 ? handleMouseMove($event) : null"
                @mouseup="index === 0 ? handleMouseUp() : null"
                @mouseleave="index === 0 ? handleMouseUp() : null"
              >
                <CardComp :card="card" :show-link="false" />
                
                <!-- Swiping Indicators Overlay -->
                <div 
                  v-if="index === 0 && swipeOffset !== 0 && !roundAnswered"
                  class="absolute inset-0 flex items-center justify-center font-bold text-2xl uppercase pointer-events-none z-40 transition-all rounded"
                  :class="[
                    swipeOffset > 30 ? 'bg-success/20 text-success' : '',
                    swipeOffset < -30 ? 'bg-error/20 text-error' : ''
                  ]"
                >
                  <div v-if="swipeOffset > 30" class="px-4 py-2 border-4 border-success bg-white rounded shadow-md font-sans">
                    ✓ Real
                  </div>
                  <div v-if="swipeOffset < -30" class="px-4 py-2 border-4 border-error bg-white rounded shadow-md font-sans">
                    ✕ Fake
                  </div>
                </div>
              </div>
              
            </div>

            <!-- Rubber Stamp Overlay inside wrapper -->
            <div 
              v-if="roundAnswered" 
              class="absolute inset-0 flex items-center justify-center pointer-events-none z-40"
            >
              <div 
                class="px-6 py-3 border-[6px] font-mono font-black text-3xl uppercase tracking-widest bg-white/95 shadow-xl select-none animate-stamp-scale"
                :class="[
                  roundWasCorrect 
                    ? 'border-success text-success' 
                    : 'border-error text-error'
                ]"
                :style="{ transform: `rotate(${stampAngle}deg)` }"
              >
                {{ roundWasCorrect ? 'CORRECT' : 'INCORRECT' }}
              </div>
            </div>

          </div>

        </div>

        <!-- Desktop Swiping Helpers (Standard Buttons) -->
        <div 
          class="flex gap-4 px-2 my-2 z-20 transition-all duration-200"
          :class="[roundAnswered ? 'invisible opacity-0 pointer-events-none' : 'visible opacity-100']"
        >
          <button 
            @click="handleSwipeChoice(false)"
            class="btn btn-error btn-outline flex-1 uppercase font-bold text-xs"
          >
            ✕ Fake
          </button>
          
          <button 
            @click="handleSwipeChoice(true)"
            class="btn btn-success btn-outline flex-1 uppercase font-bold text-xs"
          >
            ✓ Real
          </button>
        </div>
      </section>

      <!-- GACHA DROP TICKING GAMEPLAY -->
      <section v-if="gachaActive" class="flex-grow flex flex-col justify-between py-4 text-center">
        <div>
          <span class="badge badge-warning badge-outline uppercase tracking-widest font-black text-xs px-3 py-2">
            Tapping Frenzy Activated!
          </span>
          <!-- Countdown Clock -->
          <div class="text-6xl font-mono font-black text-error mt-4 animate-pulse">
            {{ gachaTimer }}s
          </div>
          
          <p class="text-xs text-secondary mt-3 font-sans font-light">
            Continuous tapping on the Wikipedia globe generates random cards!
          </p>
        </div>

        <!-- Large Tap-to-Gacha Globe -->
        <div class="my-6 flex items-center justify-center">
          <button 
            @click="handleGachaGlobeTap"
            class="btn btn-circle btn-primary w-48 h-48 shadow-2xl flex flex-col items-center justify-center border-4 border-primary/25 transition-transform active:scale-95"
            :class="{ 'animate-pulse-shake': isGlobeJiggling }"
          >
            <span class="text-white text-6xl font-black font-serif select-none">W</span>
            <span class="text-[10px] uppercase tracking-widest text-white/80 font-black font-sans mt-3 select-none">TAP HERE!</span>
            <span class="text-xs text-white font-sans font-bold mt-1.5 select-none">Taps: {{ gachaTapCount }}</span>
          </button>
        </div>

        <!-- Recent Drops Carousel View -->
        <div class="h-28 overflow-x-auto whitespace-nowrap py-2 border-t border-b border-base-300 flex gap-3 items-center px-2 bg-base-200/30 rounded">
          <div v-if="gachaDroppedCards.length === 0" class="text-xs text-secondary italic mx-auto">
            Start tapping the globe!
          </div>
          <div 
            v-for="(card, i) in gachaDroppedCards.slice(0, 5)" 
            :key="i"
            class="card card-bordered card-compact bg-white w-32 shadow flex-shrink-0 text-left p-2.5 animate-fade-in border-primary/20"
          >
            <span v-if="card.rarity !== 'Common'" class="text-[8px] badge badge-outline badge-xs font-bold font-sans uppercase mb-1">{{ card.rarity }}</span>
            <div class="font-serif font-black text-base-content text-xs truncate">{{ card.title }}</div>
            <div class="text-[8px] text-secondary font-sans mt-0.5 truncate">{{ card.category }}</div>
          </div>
        </div>
      </section>

      <!-- GACHA DROP SUMMARY SCREEN -->
      <section v-if="showGachaSummary" class="flex-grow flex flex-col justify-between py-4">
        <div class="text-center">
          <span class="text-4xl">🎉</span>
          <h2 class="font-serif text-2xl border-b border-base-300 pb-2 text-primary font-bold mt-2">
            Gacha Frenzy Complete!
          </h2>
          <p class="text-xs text-secondary mt-3 font-sans font-light leading-relaxed">
            You tapped the globe <strong class="text-base-content font-bold">{{ gachaTapCount }} times</strong>, collecting <strong class="text-base-content font-bold">{{ gachaDroppedCards.length }} new entries</strong> for your binder!
          </p>
        </div>

        <!-- List of Collected Cards -->
        <div class="my-6 overflow-y-auto max-h-[280px] border border-base-300 rounded bg-base-100 shadow-inner">
          <div v-if="gachaDroppedCards.length === 0" class="text-xs text-secondary italic text-center py-8">
            No cards collected. Tap faster next time!
          </div>
          <div 
            v-else
            v-for="(card, index) in gachaDroppedCards" 
            :key="index"
            class="flex items-center justify-between p-3 border-b border-base-200 last:border-b-0 hover:bg-base-200/50"
          >
            <div class="text-left flex items-center gap-2">
              <span v-if="card.rarity !== 'Common'" class="badge badge-xs uppercase text-[8px] font-sans font-bold py-1.5" :class="[
                card.rarity === 'Legendary' ? 'badge-warning' :
                card.rarity === 'Epic' ? 'badge-neutral' :
                card.rarity === 'Rare' ? 'badge-primary' : 'badge-ghost'
              ]">
                {{ card.rarity }}
              </span>
              <strong class="font-serif text-xs text-base-content font-semibold">{{ card.title }}</strong>
            </div>
            <span class="text-[9px] text-secondary font-sans uppercase font-bold">{{ card.category }}</span>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <router-link
            :to="authStore.user ? '/@' + authStore.user.username : '/'"
            class="btn btn-primary w-full uppercase font-bold text-xs text-white"
          >
            📖 Open Binder & View Cards
          </router-link>
          
          <button 
            @click="showGachaSummary = false"
            class="btn btn-outline border-base-300 w-full uppercase font-bold text-xs"
          >
            Back to Home
          </button>
        </div>
      </section>

  </PageLayout>
</template>
