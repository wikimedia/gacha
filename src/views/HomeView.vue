<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore';
import { useGameStore } from '../stores/useGameStore';
import type { Card } from '../stores/useGameStore';
import CardComp from '../components/Card.vue';
import CardsUnlocked from '../components/CardsUnlocked.vue';
import PageLayout from '../components/PageLayout.vue';
import Loader from '../components/Loader.vue';

const route = useRoute();
const router = useRouter();

const authStore = useAuthStore();
const gameStore = useGameStore();

const isLoading = ref(true);

// Active Category for Fakeout Game
const selectedCategory = ref<'Science' | 'Civilization' | 'Nature' | null>(null);

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
const showCardsUnlocked = ref(false);
const cardsUnlockedGameType = ref<'fakeout' | 'gacha'>('fakeout');
const identifiedFakesThisGame = ref<Card[]>([]);
const gameLost = ref(false);
const isGlobeJiggling = ref(false);

interface FloatingText {
  id: number;
  x: number;
  y: number;
}
const floatingTexts = ref<FloatingText[]>([]);
let nextFloatingTextId = 0;

// Post-Game Flow & Gacha Tease States
const pointsBeforeGame = ref(gameStore.gdPoints);
const displayedPoints = ref(gameStore.gdPoints);
const isUnlockedJustNow = ref(false);
const headerRef = ref<any>(null);
const isAnimatingPoints = ref(false);

const animateProgressBar = (start: number, end: number) => {
  if (start >= end) {
    displayedPoints.value = end;
    isAnimatingPoints.value = false;
    return;
  }
  
  isUnlockedJustNow.value = false;
  displayedPoints.value = start;
  isAnimatingPoints.value = true;
  
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
      isAnimatingPoints.value = false;
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

// Reactively sync displayed points in real time
watch(() => gameStore.gdPoints, (newPoints) => {
  displayedPoints.value = newPoints;
});

const checkTriggerGacha = () => {
  if (route.query.triggerGacha === 'true') {
    if (gameStore.gdPoints >= 100) {
      router.replace({ query: {} });
      startGachaDrop();
    }
  }
};

watch([() => authStore.isLoggedIn, () => gameStore.gdPoints], () => {
  checkTriggerGacha();
});

// DEV / DEBUG BUILD HELPERS
const isDev = true;

const triggerDebugGacha = () => {
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
  const categories: Array<'Science' | 'Civilization' | 'Nature'> = ['Science', 'Civilization', 'Nature'];
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
  try {
    await gameStore.loadCardsFromDatabase();
  } finally {
    isLoading.value = false;
  }
  
  setInterval(() => {
    updateCooldowns();
  }, 1000);
 
  checkTriggerGacha();
});

// Category selection & game initialization
const startFakeoutGame = (category: 'Science' | 'Civilization' | 'Nature') => {
  if (gameStore.isCooldownActive(category)) return;
  
  pointsBeforeGame.value = gameStore.gdPoints;
  selectedCategory.value = category;
  gameActive.value = true;
  currentRound.value = 1;
  gameScore.value = 0;
  collectedThisGame.value = [];
  identifiedFakesThisGame.value = [];
  gameLost.value = false;
  showCardsUnlocked.value = false;
  roundAnswered.value = false;
  playerChoiceReal.value = null;
  
  // Prepare game deck: 10 random cards from this category
  const catCards = gameStore.gameCards.filter((c: any) => c.category === category);
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
    // Earn point in game store locally without DB write to prevent race conditions during fast play
    gameStore.addPoints(1, false);
    displayedPoints.value = gameStore.gdPoints;
    
    // Track cards guessed correctly
    if (card.isReal) {
      collectedThisGame.value.push(card);
    } else {
      identifiedFakesThisGame.value.push(card);
    }
  } else {
    gameLost.value = true;
  }

  // Tighten up loop: automatically advance to the next card or end game after 1 second!
  setTimeout(() => {
    if (!isCorrect) {
      endFakeoutGame();
    } else {
      nextRound();
    }
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
  
  updateCooldowns();
  
  // Persist points and game state to backend/localStorage when game ends
  gameStore.persistState();
  
  // Transition to unified CardsUnlocked UI
  cardsUnlockedGameType.value = 'fakeout';
  showCardsUnlocked.value = true;
};

const handleClaimSuccess = (claimedCards: Card[]) => {
  console.log('Cards claimed successfully:', claimedCards);
};

const handleCardsUnlockedDismiss = () => {
  showCardsUnlocked.value = false;
  selectedCategory.value = null;
  // If Fake Out, run the progress bar animation returning to Home
  if (cardsUnlockedGameType.value === 'fakeout') {
    animateProgressBar(pointsBeforeGame.value, gameStore.gdPoints);
  }
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
  
  // Spend points
  if (gameStore.spendPoints(100)) {
    gachaActive.value = true;
    gachaTimer.value = 10;
    gachaTapCount.value = 0;
    gachaDroppedCards.value = [];
    showGachaSummary.value = false;
    showCardsUnlocked.value = false;
    
    displayedPoints.value = gameStore.gdPoints;
    isUnlockedJustNow.value = false;
    
    // 10 second ticking timer
    const interval = setInterval(() => {
      gachaTimer.value -= 1;
      if (gachaTimer.value <= 0) {
        clearInterval(interval);
        gachaActive.value = false;
        
        // Transition to unified CardsUnlocked UI
        cardsUnlockedGameType.value = 'gacha';
        showCardsUnlocked.value = true;
      }
    }, 1000);
  }
};

const handleGachaGlobeTap = (event?: MouseEvent) => {
  if (!gachaActive.value) return;
  
  gachaTapCount.value += 1;
  isGlobeJiggling.value = true;
  setTimeout(() => {
    isGlobeJiggling.value = false;
  }, 150);
  
  // Calculate relative click coordinates
  let x = 96;
  let y = 96;
  if (event && event.currentTarget) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    x = event.clientX - rect.left;
    y = event.clientY - rect.top;
  } else {
    x = 80 + Math.random() * 32;
    y = 80 + Math.random() * 32;
  }
  
  const id = nextFloatingTextId++;
  floatingTexts.value.push({ id, x, y });
  
  setTimeout(() => {
    floatingTexts.value = floatingTexts.value.filter(t => t.id !== id);
  }, 800);
  
  // Select a card at random from the database-backed deck, filtering only for real cards
  const realCards = gameStore.gameCards.filter((c: any) => c.isReal);
  if (realCards.length === 0) return;
  const randomCard = realCards[Math.floor(Math.random() * realCards.length)];
  
  // Insert at front of display deck (do not collect immediately in store)
  gachaDroppedCards.value.unshift(randomCard);
};

const getCategoryDetails = (cat: 'Civilization' | 'Science' | 'Nature') => {
  switch (cat) {
    case 'Civilization':
      return {
        emoji: '🏛️',
        bgClass: 'bg-category-civilization-hp-bg hover:bg-category-civilization-hp-bg-hover dark:bg-category-civilization-hp-dark-bg dark:hover:bg-category-civilization-hp-dark-bg-hover',
        borderClass: 'border-category-civilization-hp-border hover:border-category-civilization-hp-border-hover dark:border-category-civilization-hp-border/30 dark:hover:border-category-civilization-hp-border-hover',
        textClass: 'text-category-civilization-hp-text dark:text-category-civilization-hp-text-dark',
        iconBg: 'bg-category-civilization-hp-icon-bg text-category-civilization-hp-text dark:bg-category-civilization-hp-icon-bg-dark dark:text-category-civilization-hp-text-dark',
        arrowColorClass: 'text-category-civilization-hp-border group-hover:text-category-civilization-hp-text dark:text-category-civilization-hp-border/50 dark:group-hover:text-category-civilization-hp-text-dark',
        titleColorClass: 'text-category-civilization-hp-text group-hover:text-category-civilization-hp-text dark:text-category-civilization-hp-text-dark'
      };
    case 'Science':
      return {
        emoji: '🧪',
        bgClass: 'bg-category-science-hp-bg hover:bg-category-science-hp-bg-hover dark:bg-category-science-hp-dark-bg dark:hover:bg-category-science-hp-dark-bg-hover',
        borderClass: 'border-category-science-hp-border hover:border-category-science-hp-border-hover dark:border-category-science-hp-border/30 dark:hover:border-category-science-hp-border-hover',
        textClass: 'text-category-science-hp-text dark:text-category-science-hp-text-dark',
        iconBg: 'bg-category-science-hp-icon-bg text-category-science-hp-text dark:bg-category-science-hp-icon-bg-dark dark:text-category-science-hp-text-dark',
        arrowColorClass: 'text-category-science-hp-border group-hover:text-category-science-hp-text dark:text-category-science-hp-border/50 dark:group-hover:text-category-science-hp-text-dark',
        titleColorClass: 'text-category-science-hp-text group-hover:text-category-science-hp-text dark:text-category-science-hp-text-dark'
      };
    case 'Nature':
      return {
        emoji: '🌍',
        bgClass: 'bg-category-nature-hp-bg hover:bg-category-nature-hp-bg-hover dark:bg-category-nature-hp-dark-bg dark:hover:bg-category-nature-hp-dark-bg-hover',
        borderClass: 'border-category-nature-hp-border hover:border-category-nature-hp-border-hover dark:border-category-nature-hp-border/30 dark:hover:border-category-nature-hp-border-hover',
        textClass: 'text-category-nature-hp-text dark:text-category-nature-hp-text-dark',
        iconBg: 'bg-category-nature-hp-icon-bg text-category-nature-hp-text dark:bg-category-nature-hp-icon-bg-dark dark:text-category-nature-hp-text-dark',
        arrowColorClass: 'text-category-nature-hp-border group-hover:text-category-nature-hp-text dark:text-category-nature-hp-border/50 dark:group-hover:text-category-nature-hp-text-dark',
        titleColorClass: 'text-category-nature-hp-text group-hover:text-category-nature-hp-text dark:text-category-nature-hp-text-dark'
      };
  }
};
</script>

<template>
  <PageLayout
    ref="headerRef"
    :displayed-points="displayedPoints" 
    :gacha-active="gachaActive || showCardsUnlocked" 
    :is-animating="isAnimatingPoints"
    :hide-header="showCardsUnlocked && gameLost"
    @activate="startGachaDrop" 
  >
    <Loader v-if="isLoading" />

    <template v-else>
      <!-- FAKEOUT GAME CATEGORY SELECTION -->
      <section v-if="!gameActive && !gachaActive && !showCardsUnlocked" class="flex-grow flex flex-col gap-6 justify-center py-6">
        
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
              v-for="cat in (['Civilization', 'Nature', 'Science'] as const)"
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
                  class="font-serif font-black text-base leading-tight"
                  :class="[cooldownTimers[cat] ? 'text-base-content/40' : getCategoryDetails(cat).textClass]"
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

      </section>

      <!-- FAKEOUT GAME SWIPING MECHANIC -->
      <section v-if="gameActive && currentCard" class="flex-grow flex flex-col justify-between py-2 w-full">
        <!-- Game Header -->
        <div class="flex flex-col w-full max-w-[315px] mx-auto mb-3">
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
        <div class="flex-grow flex items-center justify-center my-2 relative min-h-[480px]">
          
          <!-- Centered wrapper container -->
          <div class="relative w-full max-w-[315px] h-[440px]">
            
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
          class="flex gap-4 px-2 my-2 z-20 transition-all duration-200 w-full max-w-[315px] mx-auto"
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
            @click="handleGachaGlobeTap($event)"
            class="btn btn-circle btn-primary w-48 h-48 shadow-2xl flex flex-col items-center justify-center border-4 border-primary/25 transition-transform active:scale-95 relative overflow-visible"
            :class="{ 'animate-pulse-shake': isGlobeJiggling }"
          >
            <span class="text-white text-6xl font-black font-serif select-none">W</span>
            <span class="text-[10px] uppercase tracking-widest text-white/80 font-black font-sans mt-3 select-none">TAP HERE!</span>
            <span class="text-xs text-white font-sans font-bold mt-1.5 select-none">Taps: {{ gachaTapCount }}</span>
            
            <!-- Floating +1s -->
            <span 
              v-for="item in floatingTexts" 
              :key="item.id" 
              class="absolute pointer-events-none text-2xl font-black text-warning animate-float-up z-50 select-none"
              :style="{ left: `${item.x}px`, top: `${item.y}px` }"
            >
              +1
            </span>
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

      <!-- UNIFIED CARDS UNLOCKED UI -->
      <CardsUnlocked
        v-slot:default
        v-if="showCardsUnlocked"
        :unlocked-cards="cardsUnlockedGameType === 'fakeout' ? collectedThisGame : gachaDroppedCards"
        :identified-fakes="cardsUnlockedGameType === 'fakeout' ? identifiedFakesThisGame : []"
        :game-type="cardsUnlockedGameType"
        :game-stats="{
          score: gameScore,
          totalRounds: gameDeck.length,
          taps: gachaDroppedCards.length
        }"
        :lost="gameLost"
        @claim="handleClaimSuccess"
        @dismiss="handleCardsUnlockedDismiss"
        @open-auth="headerRef?.openAuthModal()"
      />
    </template>

  </PageLayout>
</template>
