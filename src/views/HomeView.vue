<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../stores/useAuthStore';
import { useGameStore, MOCK_CARDS } from '../stores/useGameStore';
import type { Card } from '../stores/useGameStore';
import CardComp from '../components/Card.vue';
import AppHeader from '../components/AppHeader.vue';

const authStore = useAuthStore();
const gameStore = useGameStore();

// Active Category for Fakeout Game
const selectedCategory = ref<'Science' | 'History' | 'Pop Culture' | 'Geography' | null>(null);

// Game States
const gameActive = ref(false);
const currentRound = ref(1);
const gameDeck = ref<Card[]>([]);
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
const isLockShaking = ref(false);

const triggerLockShake = () => {
  if (isLockShaking.value) return;
  isLockShaking.value = true;
  setTimeout(() => {
    isLockShaking.value = false;
  }, 400);
};

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

const handleAuthSuccess = () => {
  updateCooldowns();
  displayedPoints.value = gameStore.gdPoints;
};

const handleLogout = () => {
  updateCooldowns();
  displayedPoints.value = gameStore.gdPoints;
};

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
onMounted(() => {
  authStore.initAuth();
  gameStore.loadGuestState();
  updateCooldowns();
  
  displayedPoints.value = gameStore.gdPoints;
  
  setInterval(() => {
    updateCooldowns();
  }, 1000);
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
  const catCards = MOCK_CARDS.filter(c => c.category === category);
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
    showAuthModal.value = true;
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
  
  // Select a card at random
  const randomCard = MOCK_CARDS[Math.floor(Math.random() * MOCK_CARDS.length)];
  
  // Collect the card in inventory
  gameStore.collectCard(randomCard.id);
  
  // Insert at front of display deck
  gachaDroppedCards.value.unshift(randomCard);
};
</script>

<template>
  <div class="min-h-screen bg-[#f8f9fa] flex flex-col font-sans text-wiki-text">
    
    <!-- UNIFIED WIKIPEDIA CORE HEADER (GACHA TEASER IS THE GLOBAL HEADER ALWAYS) -->
    <header class="sticky top-0 z-40">
      <!-- Standard Gacha Teaser Header: active during navigation & games -->
      <div 
        v-if="!gachaActive && !showGachaSummary"
        class="gacha-tease-container bg-white border-b border-[#a2a9b1] px-3 py-2 flex items-center justify-between gap-3 shadow-sm select-none"
        :class="{ 'gacha-tease-container--unlocked': displayedPoints >= 100 }"
      >
        <!-- Left: Brand Title & Dynamic Microcopy -->
        <div class="flex flex-col text-left leading-tight min-w-0 flex-shrink">
          <span class="font-serif font-extrabold text-[12px] text-black tracking-tight leading-none">Moonflower</span>
          <div class="flex items-center text-[9px] font-sans font-bold mt-0.5 min-w-0">
            <span v-if="displayedPoints < 100" class="text-wiki-muted truncate">
              {{ 100 - displayedPoints }} Points to Gacha
            </span>
            <span v-else class="text-wiki-blue uppercase tracking-wider truncate">
              ★ Ready!
            </span>
          </div>
        </div>

        <!-- Middle: Segmented Static Goal Tracker (10 flat blocks) -->
        <div class="flex-grow flex items-center h-2 max-w-[140px] min-w-[50px] gap-0.5" role="img" aria-label="Gacha Drop progress blocks">
          <div 
            class="flex-grow h-full rounded-[1px] transition-colors duration-200"
            v-for="i in 10" 
            :key="i"
            :class="[
              displayedPoints >= i * 10 
                ? 'bg-wiki-blue' 
                : 'bg-[#eaecf0] border border-[#d8dade]'
            ]"
          ></div>
        </div>

        <!-- Right: Action Button & Login/Profile Group -->
        <div class="flex items-center gap-2 flex-shrink-0">
          <!-- Gacha Action Button (w-[80px]) -->
          <div class="w-[80px]">
            <!-- Active progressive primary button styled like Log In but excited -->
            <button 
              v-if="displayedPoints >= 100"
              @click="startGachaDrop"
              class="w-full text-center flex items-center justify-center py-0.5 px-0.5 text-[9px] rounded-sm transition-all duration-200 min-h-[24px] btn-activate-excited select-none focus:outline-none"
              :class="{ 'gacha-unlock-pop': isUnlockedJustNow }"
            >
              ⚡ Activate
            </button>
            
            <!-- Disabled locked state button -->
            <button 
              v-else
              @click="triggerLockShake"
              class="w-full bg-[#eaecf0] text-[#72777d] border border-[#c8ccd1] cursor-not-allowed font-semibold text-[10px] py-0.5 px-1.5 rounded-sm flex items-center justify-center gap-1 select-none focus:outline-none min-h-[24px]"
            >
              <span 
                class="inline-block transition-transform duration-200"
                :class="{ 'animate-lock-shake text-wiki-red': isLockShaking }"
              >
                🔒
              </span>
              <span>Locked</span>
            </button>
          </div>

          <!-- Vertical Divider -->
          <div class="h-4 w-[1px] bg-[#eaecf0]"></div>

          <!-- Login / User Profile Avatar (to the right of locked button) -->
          <div class="flex items-center flex-shrink-0">
            <button 
              v-if="!authStore.isLoggedIn"
              @click="showAuthModal = true"
              class="w-[80px] text-center flex items-center justify-center py-0.5 px-1.5 text-[10px] font-semibold text-wiki-blue hover:text-white hover:bg-wiki-blue border border-wiki-blue rounded-sm transition-colors duration-200 min-h-[24px]"
            >
              Log In
            </button>
            
            <div v-else class="flex items-center gap-1.5">
              <!-- Profile Quick Link -->
              <router-link 
                :to="'/@' + authStore.user?.username"
                class="w-6 h-6 rounded-full overflow-hidden border border-[#a2a9b1] hover:opacity-80 transition-opacity flex items-center justify-center"
              >
                <img :src="authStore.user?.profilePic" alt="Avatar" class="w-full h-full object-cover">
              </router-link>
              
              <!-- Compact text-based logout button -->
              <button 
                @click="handleLogout"
                class="text-[9px] text-wiki-muted hover:text-wiki-red font-sans leading-none"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Simplified header during active Gacha Drop Frenzy or Summary -->
      <div 
        v-else
        class="bg-white border-b border-[#a2a9b1] px-3 py-2 flex items-center justify-between shadow-sm select-none"
      >
        <div class="flex items-center gap-1.5">
          <div class="w-5 h-5 rounded-full border border-[#a2a9b1] flex items-center justify-center bg-[#eaecf0] font-serif text-[11px] text-black font-bold">
            W
          </div>
          <span class="text-xs font-bold font-serif text-black leading-none">Moonflower</span>
        </div>
        <span class="text-[9px] text-wiki-muted font-sans uppercase font-bold tracking-wider">
          Gacha drop mode
        </span>
      </div>
    </header>

    <!-- MAIN APP WRAPPER -->
    <main class="flex-grow p-4 max-w-md mx-auto w-full flex flex-col justify-between relative">

      <!-- FAKEOUT GAME CATEGORY SELECTION -->
      <section v-if="!gameActive && !gachaActive && !showGachaSummary" class="flex-grow flex flex-col gap-6 justify-center py-6">
        
        <!-- Welcome Wiki Box -->
        <div class="bg-white wiki-border p-4 rounded-sm text-left">
          <h2 class="wiki-serif text-xl border-b border-[#a2a9b1] pb-1 text-black font-normal">
            Welcome to Moonflower
          </h2>
          <p class="text-xs text-wiki-muted mt-2 leading-relaxed font-sans font-light">
            Test your knowledge of the absurd and collect real items for your personal Wikipedia Binder. Identify the altered entries to secure items and acquire **GD Points**.
          </p>
          
          <!-- Debug trigger button -->
          <div v-if="isDev" class="mt-4 pt-3 border-t border-[#eaecf0] flex gap-2">
            <button 
              @click="triggerDebugGacha"
              class="px-2 py-1 text-[10px] font-bold text-wiki-red border border-wiki-red rounded-sm hover:bg-red-50 transition-colors cursor-pointer"
            >
              🛠️ [DEV] Force Gacha
            </button>
            <button 
              @click="addDebugPoints"
              class="px-2 py-1 text-[10px] font-bold text-wiki-blue border border-wiki-blue rounded-sm hover:bg-blue-50 transition-colors cursor-pointer"
            >
              🛠️ [DEV] +100 GP
            </button>
          </div>
        </div>

        <!-- Gacha drop handled exclusively in the header -->

        <!-- Category Lists -->
        <div>
          <h3 class="text-xs font-semibold text-wiki-muted uppercase tracking-wider mb-3 text-left">
            Select category to play
          </h3>
          <div class="flex flex-col gap-2.5">
            <button
              v-for="cat in ['History', 'Science', 'Pop Culture', 'Geography']"
              :key="cat"
              @click="startFakeoutGame(cat as any)"
              :disabled="!!cooldownTimers[cat]"
              class="w-full bg-white wiki-border p-3.5 flex items-center justify-between text-left rounded-sm transition-all duration-200 select-none"
              :class="[
                cooldownTimers[cat] 
                  ? 'opacity-65 cursor-not-allowed bg-gray-50' 
                  : 'hover:bg-wiki-bg active:bg-[#eaecf0]'
              ]"
            >
              <div class="flex flex-col">
                <span class="font-serif font-bold text-sm text-black">{{ cat }}</span>
                <span v-if="cooldownTimers[cat]" class="text-[10px] text-wiki-red font-sans">
                  Cooldown: {{ cooldownTimers[cat] }}s
                </span>
                <span v-else class="text-[10px] text-wiki-muted font-sans font-light">
                  10 cards • swipe mode
                </span>
              </div>
              
              <div class="flex items-center gap-2">
                <span v-if="cooldownTimers[cat]" class="text-xs">🔒</span>
                <span v-else class="text-wiki-blue font-bold text-lg">→</span>
              </div>
            </button>
          </div>
        </div>

        <!-- Binder Button for logged-in user -->
        <router-link
          v-if="authStore.isLoggedIn"
          :to="'/@' + authStore.user?.username"
          class="w-full bg-[#eaecf0] hover:bg-[#d8dade] text-black font-sans font-semibold text-xs py-3 rounded-sm border border-[#a2a9b1] text-center"
        >
          📖 Open My Collection Binder
        </router-link>
      </section>

      <!-- FAKEOUT GAME SWIPING MECHANIC -->
      <section v-if="gameActive && currentCard" class="flex-grow flex flex-col justify-between py-2">
        <!-- Game Header -->
        <div class="flex items-center justify-between text-xs px-2 mb-2 font-sans font-semibold text-wiki-muted">
          <span>Category: <strong class="text-black">{{ selectedCategory }}</strong></span>
          <span>Round {{ currentRound }}/10</span>
          <span>Score: {{ gameScore }}</span>
        </div>

        <!-- Swiping Card Area -->
        <div class="flex-grow flex items-center justify-center my-4 relative min-h-[410px]">
          
          <!-- Stable centered wrapper container to guarantee 100% stable layout boundaries -->
          <div class="relative w-full max-w-[280px] h-[380px]">
            
            <div class="stack select-none w-full h-full">
              
              <template v-for="(card, index) in gameDeck" :key="card.id">
                <div
                  v-if="index >= currentRound - 1 && index < currentRound + 2"
                  class="relative"
                  :class="[
                    // Active Card (Top Card)
                    index === currentRound - 1
                      ? (roundAnswered 
                          ? 'z-30 transition-all duration-300 ease-in opacity-0 pointer-events-none' 
                          : (isSwiping ? 'z-30 duration-0' : 'z-30 transition-transform duration-200 ease-out'))
                      : '',
                    
                    // Card 2 (Underneath)
                    index === currentRound
                      ? 'opacity-60 scale-[0.96] translate-y-3 pointer-events-none select-none z-20 transition-all duration-300'
                      : '',
                      
                    // Card 3 (Deepest)
                    index === currentRound + 1
                      ? 'opacity-30 scale-[0.92] translate-y-6 pointer-events-none select-none z-10 transition-all duration-300'
                      : ''
                  ]"
                  :style="{ 
                    transform: index === currentRound - 1
                      ? (roundAnswered
                          ? (swipeDirection === 'right' ? 'translateX(600px) rotate(45deg)' : 'translateX(-600px) rotate(-45deg)')
                          : `translateX(${swipeOffset}px) rotate(${swipeOffset / 12}deg)`)
                      : ''
                  }"
                  @touchstart="index === currentRound - 1 ? handleTouchStart($event) : null"
                  @touchmove="index === currentRound - 1 ? handleTouchMove($event) : null"
                  @touchend="index === currentRound - 1 ? handleTouchEnd() : null"
                  @mousedown="index === currentRound - 1 ? handleMouseDown($event) : null"
                  @mousemove="index === currentRound - 1 ? handleMouseMove($event) : null"
                  @mouseup="index === currentRound - 1 ? handleMouseUp() : null"
                  @mouseleave="index === currentRound - 1 ? handleMouseUp() : null"
                >
                  <!-- Render CardComp with 3D Tilt disabled during swiping -->
                  <CardComp :card="card" :show-link="false" :disable-hover3d="true" />

                  <!-- Swiping Indicators Overlay -->
                  <div 
                    v-if="index === currentRound - 1 && swipeOffset !== 0 && !roundAnswered"
                    class="absolute inset-0 flex items-center justify-center rounded-sm font-bold text-2xl uppercase pointer-events-none z-40"
                    :class="[
                      swipeOffset > 30 ? 'bg-wiki-green bg-opacity-20 text-wiki-green' : '',
                      swipeOffset < -30 ? 'bg-wiki-red bg-opacity-20 text-wiki-red' : ''
                    ]"
                  >
                    <div v-if="swipeOffset > 30" class="px-4 py-2 border-4 border-wiki-green bg-white rounded-md">
                      ✓ Real
                    </div>
                    <div v-if="swipeOffset < -30" class="px-4 py-2 border-4 border-wiki-red bg-white rounded-md">
                      ✕ Fake
                    </div>
                  </div>
                </div>
              </template>
              
            </div>

            <!-- Rubber Stamp Overlay (positioned absolutely inside the relative wrapper, outside the stack!) -->
            <div 
              v-if="roundAnswered" 
              class="absolute inset-0 flex items-center justify-center pointer-events-none z-40"
            >
              <div 
                class="px-6 py-3 border-8 font-mono font-extrabold text-4xl uppercase tracking-widest bg-white bg-opacity-95 shadow-xl select-none animate-stamp-scale"
                :class="[
                  roundWasCorrect 
                    ? 'border-wiki-green text-wiki-green' 
                    : 'border-wiki-red text-wiki-red'
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
            class="flex-1 bg-white hover:bg-red-50 text-wiki-red font-bold text-xs py-3 border border-wiki-red rounded-sm transition-colors duration-200"
          >
            ✕ Fake
          </button>
          
          <button 
            @click="handleSwipeChoice(true)"
            class="flex-1 bg-white hover:bg-green-50 text-wiki-green font-bold text-xs py-3 border border-wiki-green rounded-sm transition-colors duration-200"
          >
            ✓ Real
          </button>
        </div>
      </section>

      <!-- GACHA DROP TICKING GAMEPLAY -->
      <section v-if="gachaActive" class="flex-grow flex flex-col justify-between py-4 text-center">
        <div>
          <span class="text-xs uppercase text-wiki-muted tracking-widest font-sans font-semibold">
            Tapping Frenzy Activated!
          </span>
          <!-- Countdown Clock -->
          <div class="text-5xl font-mono font-bold text-wiki-red mt-2 animate-pulse">
            {{ gachaTimer }}s
          </div>
          
          <p class="text-xs text-wiki-muted mt-2 font-sans font-light">
            Continuous tapping on the Wikipedia globe generates random cards!
          </p>
        </div>

        <!-- Large Tap-to-Gacha Globe -->
        <div class="my-6 flex items-center justify-center">
          <button 
            @click="handleGachaGlobeTap"
            class="w-48 h-48 rounded-full border-4 border-wiki-blue bg-white flex flex-col items-center justify-center shadow-lg transition-transform duration-75 active:scale-95"
            :class="{ 'animate-pulse-shake': isGlobeJiggling }"
          >
            <span class="text-wiki-blue text-5xl font-bold font-serif select-none">W</span>
            <span class="text-xs uppercase tracking-widest text-wiki-muted font-bold font-sans mt-2 select-none">TAP HERE!</span>
            <span class="text-[10px] text-wiki-blue font-sans font-semibold mt-1 select-none">Taps: {{ gachaTapCount }}</span>
          </button>
        </div>

        <!-- Recent Drops Carousel View -->
        <div class="h-24 overflow-x-auto whitespace-nowrap py-1 border-t border-b border-[#a2a9b1] flex gap-2 items-center px-1">
          <div v-if="gachaDroppedCards.length === 0" class="text-xs text-wiki-muted italic mx-auto">
            Start tapping the globe!
          </div>
          <div 
            v-for="(card, i) in gachaDroppedCards.slice(0, 5)" 
            :key="i"
            class="inline-block px-3 py-1.5 bg-white border border-[#a2a9b1] rounded-sm text-xs text-left w-32 shadow-sm animate-fade-in"
          >
            <span class="text-[8px] text-wiki-muted uppercase font-bold tracking-wider">{{ card.rarity }}</span>
            <div class="font-serif font-bold text-black text-xs truncate">{{ card.title }}</div>
          </div>
        </div>
      </section>

      <!-- GACHA DROP SUMMARY SCREEN -->
      <section v-if="showGachaSummary" class="flex-grow flex flex-col justify-between py-4">
        <div class="text-center">
          <span class="text-3xl">🎉</span>
          <h2 class="wiki-serif text-xl border-b border-[#a2a9b1] pb-1 text-black font-normal mt-2">
            Gacha Frenzy Complete!
          </h2>
          <p class="text-xs text-wiki-muted mt-2 font-sans font-light">
            You tapped the globe <strong class="text-black font-semibold">{{ gachaTapCount }} times</strong>, collecting <strong class="text-black font-semibold">{{ gachaDroppedCards.length }} new entries</strong> for your binder!
          </p>
        </div>

        <!-- List of Collected Cards -->
        <div class="my-6 overflow-y-auto max-h-[300px] border border-[#a2a9b1] rounded-sm bg-white p-2">
          <div v-if="gachaDroppedCards.length === 0" class="text-xs text-wiki-muted italic text-center py-4">
            No cards collected. Tap faster next time!
          </div>
          <div 
            v-else
            v-for="(card, index) in gachaDroppedCards" 
            :key="index"
            class="flex items-center justify-between p-2 border-b border-[#eaecf0] last:border-b-0 hover:bg-[#f8f9fa]"
          >
            <div class="text-left">
              <span class="text-[8px] px-1 py-0.5 rounded-sm bg-[#eaecf0] font-sans font-semibold uppercase text-wiki-muted mr-1.5">
                {{ card.rarity }}
              </span>
              <strong class="font-serif text-xs text-black">{{ card.title }}</strong>
            </div>
            <span class="text-[10px] text-wiki-muted font-sans">{{ card.category }}</span>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <router-link
            :to="'/@' + authStore.user?.username"
            class="w-full bg-wiki-blue hover:bg-wiki-blueHover text-white font-sans font-semibold text-xs py-3 rounded-sm border border-wiki-blue text-center"
          >
            📖 Open Binder & View Cards
          </router-link>
          
          <button 
            @click="showGachaSummary = false"
            class="w-full bg-white hover:bg-[#eaecf0] text-black font-sans font-semibold text-xs py-3 rounded-sm border border-[#a2a9b1]"
          >
            Back to Home
          </button>
        </div>
      </section>

    </main>

    <!-- AUTHENTICATION DIALOG / MODAL overlay (Simulated Supabase OTP Flow) -->
    <cdx-dialog
      v-model:open="showAuthModal"
      title="Sign In to Moonflower"
      @close="showAuthModal = false; otpSent = false; authEmail = ''; otpCode = '';"
    >
      <p class="text-xs text-wiki-muted mb-4 leading-relaxed font-sans font-light">
        Guests use localStorage. Authenticating with your email merges your local binder items and points across devices, allowing you to access Gacha drops securely.
      </p>

      <!-- Step 1: Request OTP Email -->
      <form v-if="!otpSent" @submit.prevent="handleSendOtp" class="flex flex-col gap-4">
        <div>
          <label class="block text-xs font-semibold text-wiki-text font-sans uppercase mb-1">
            Email Address
          </label>
          <input 
            v-model="authEmail"
            type="email" 
            placeholder="e.g. scholar@moonflower.org"
            required
            class="w-full px-3 py-2 bg-white wiki-border text-sm rounded-sm font-sans focus:outline-none focus:border-wiki-blue"
          >
        </div>

        <button 
          type="submit"
          :disabled="isVerifying"
          class="w-full bg-wiki-blue hover:bg-wiki-blueHover text-white font-bold text-xs py-2.5 rounded-sm border border-wiki-blue transition-colors font-sans disabled:opacity-50"
        >
          {{ isVerifying ? 'Sending Passcode...' : 'Send One-Time Passcode' }}
        </button>
      </form>

      <!-- Step 2: Verify OTP Passcode -->
      <form v-else @submit.prevent="handleVerifyOtp" class="flex flex-col gap-4">
        <p class="text-xs text-wiki-text leading-relaxed font-sans font-medium bg-[#f0f4fd] border border-[#a2a9b1] p-2.5 rounded-sm">
          📬 We've sent a 6-digit one-time passcode to <strong class="text-wiki-blue">{{ authEmail }}</strong>. Enter the passcode below to verify your identity.
        </p>
        
        <div>
          <label class="block text-xs font-semibold text-wiki-text font-sans uppercase mb-1">
            One-Time Passcode (OTP)
          </label>
          <input 
            v-model="otpCode"
            type="text" 
            placeholder="123456"
            maxlength="6"
            required
            class="w-full px-3 py-2 bg-white wiki-border text-base rounded-sm font-mono font-bold tracking-widest text-center focus:outline-none focus:border-wiki-blue"
          >
        </div>

        <div class="flex justify-between text-[10px] font-sans -mt-2">
          <button 
            type="button" 
            @click="otpSent = false; otpCode = '';" 
            class="text-wiki-blue hover:underline font-semibold"
          >
            ← Change email
          </button>
          <button 
            type="button" 
            @click="handleSendOtp" 
            class="text-wiki-blue hover:underline font-semibold"
          >
            Resend email
          </button>
        </div>

        <button 
          type="submit"
          class="w-full bg-wiki-blue hover:bg-wiki-blueHover text-white font-bold text-xs py-2.5 rounded-sm border border-wiki-blue transition-colors font-sans"
        >
          Verify & Access Binder
        </button>
      </form>
    </cdx-dialog>

  </div>
</template>

<style scoped>
/* Evaluation animations */
.animate-fade-in {
  animation: fadeIn 0.25s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.97); }
  to { opacity: 1; transform: scale(1); }
}

.animate-stamp-scale {
  animation: stampScale 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

@keyframes stampScale {
  0% { transform: scale(3.5); opacity: 0; }
  100% { opacity: 1; }
}

/* Excited Activate button pulse */
@keyframes activeExcitedPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(51, 102, 204, 0.4);
    border-color: #36c;
  }
  50% {
    box-shadow: 0 0 8px 3px rgba(68, 127, 245, 0.7);
    border-color: #447ff5;
  }
  100% {
    box-shadow: 0 0 0 0 rgba(51, 102, 204, 0.4);
    border-color: #36c;
  }
}

.btn-activate-excited {
  background: linear-gradient(135deg, #36c 0%, #447ff5 50%, #36c 100%);
  background-size: 200% auto;
  color: #ffffff !important;
  border: 1px solid #36c;
  font-weight: 800;
  cursor: pointer;
  animation: activeExcitedPulse 1.8s infinite ease-in-out, gradientShift 3s infinite linear;
}

.btn-activate-excited:hover {
  background: linear-gradient(135deg, #447ff5 0%, #5d92ff 50%, #447ff5 100%);
  transform: scale(1.03) !important;
  box-shadow: 0 0 10px 4px rgba(68, 127, 245, 0.85);
}
</style>
