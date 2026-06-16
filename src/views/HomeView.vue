<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore';
import { useGameStore, CATEGORIES } from '../stores/useGameStore';
import type { Card, Category } from '../stores/useGameStore';
import CardComp from '../components/Card.vue';
import CardsUnlocked from '../components/CardsUnlocked.vue';
import PageLayout from '../components/PageLayout.vue';
import Loader from '../components/Loader.vue';

const route = useRoute();
const router = useRouter();

const authStore = useAuthStore();
const gameStore = useGameStore();

const isLoading = ref(true);

// Active Category for Fakeout Game (tracks game session)
const selectedCategory = ref<Category | null>(null);

// Subcategories definition matching Figma website UX / UI page
interface SubCategoryDef {
  id: string;
  name: string;
  mainCategory: Category;
  thumbnail: string;
  bgCollage: string;
}

const subCategories: SubCategoryDef[] = [
  {
    id: 'culture',
    name: 'People / Culture',
    mainCategory: 'The Human',
    thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/b/b3/Rick_Astley_in_2016_%28cropped%29.jpg',
    bgCollage: '/History-mainImg.png'
  },
  {
    id: 'history',
    name: 'History / Society',
    mainCategory: 'The Human',
    thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/6/62/Julius_Caesar_statue_Rome.jpg',
    bgCollage: '/History-mainImg.png'
  },
  {
    id: 'physics',
    name: 'Physical Science',
    mainCategory: 'The Sciences',
    thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/0/08/South_Atlantic_Ocean_iceberg.jpg',
    bgCollage: '/Earth-mainImg.png'
  },
  {
    id: 'biology',
    name: 'Life Science',
    mainCategory: 'The Sciences',
    thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/1/18/Vombatus_ursinus_-Maria_Island_National_Park.jpg',
    bgCollage: '/Earth-mainImg.png'
  },
  {
    id: 'earth',
    name: 'Earth',
    mainCategory: 'The World',
    thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Everest_North_Face_toward_Base_Camp_Tibet_Rotated.jpg',
    bgCollage: '/Earth-mainImg.png'
  },
  {
    id: 'space',
    name: 'Space',
    mainCategory: 'The Sciences',
    thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/e/e9/Apollo_11_bootprint.jpg',
    bgCollage: '/Earth-mainImg.png'
  }
];

// Active subcategory on the home screen (History / Society by default)
const activeSubCategory = ref<SubCategoryDef>(subCategories[1]);

// Dynamic tint background color for paper texture based on category
const homepageBgColor = computed(() => {
  if (gachaActive.value || showCardsUnlocked.value) {
    return undefined;
  }
  const cat = gameActive.value ? selectedCategory.value : activeSubCategory.value.mainCategory;
  if (!cat) return undefined;
  
  if (cat === 'The Human') {
    return '#fdf3db';
  } else if (cat === 'The Sciences') {
    return '#e7f1fd';
  } else if (cat === 'The World') {
    return '#e8f7e2';
  }
  return undefined;
});

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


// Cooldown tracking
const updateCooldowns = () => {
  CATEGORIES.forEach(cat => {
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

// Game deck configuration
const DECK_SIZE = 10;
const TARGET_REAL = DECK_SIZE / 2; // aim for an even real/fake split, backfilled if one side is short

// Unbiased Fisher–Yates shuffle (sort(() => Math.random() - 0.5) is biased)
const shuffle = (arr: Card[]): Card[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Category selection & game initialization
const startFakeoutGame = async (category: Category) => {
  if (gameStore.isCooldownActive(category)) return;

  // Fetch a fresh randomized pool for this category each game so the cards vary
  // between games. Fall back to the cached sample if the fetch is empty (offline/mock).
  let catCards = await gameStore.fetchCategoryPool(category);
  if (catCards.length === 0) {
    catCards = gameStore.gameCards.filter((c: Card) => c.category === category);
  }

  // Build the deck: a fully shuffled, balanced mix of real and fake cards
  const reals = shuffle(catCards.filter((c: Card) => c.isReal));
  const fakes = shuffle(catCards.filter((c: Card) => !c.isReal));

  // Aim for an even real/fake split; if one side is short, backfill from the other
  let numReal = Math.min(TARGET_REAL, reals.length);
  let numFake = Math.min(DECK_SIZE - numReal, fakes.length);
  numReal = Math.min(reals.length, DECK_SIZE - numFake);

  // Combine and shuffle again so reals and fakes are interleaved
  const deck = shuffle([...reals.slice(0, numReal), ...fakes.slice(0, numFake)]);

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
  gameDeck.value = deck;

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
</script>

<template>
  <PageLayout
    ref="headerRef"
    :displayed-points="displayedPoints" 
    :gacha-active="gachaActive || showCardsUnlocked" 
    :is-animating="isAnimatingPoints"
    :hide-header="showCardsUnlocked && gameLost"
    :game-active="gameActive"
    :active-main-category="gameActive ? selectedCategory || undefined : activeSubCategory.mainCategory"
    :class="{ 'is-home-selection': !gameActive && !gachaActive && !showCardsUnlocked }"
    :background-color="homepageBgColor"
    @activate="startGachaDrop" 
    @quit-game="gameActive = false; selectedCategory = null"
  >
    <Loader v-if="isLoading" />

    <template v-else>
      <!-- FAKEOUT GAME CATEGORY SELECTION (Figma Redesign) -->
      <section v-if="!gameActive && !gachaActive && !showCardsUnlocked" class="flex-grow flex flex-col justify-between py-2 select-none">
        

        <!-- Dynamic Category Collage Area -->
        <div class="collage-container">
          <img 
            :src="activeSubCategory.bgCollage" 
            class="collage-image select-none" 
            alt="Category Collage" 
          />

          <!-- Play/Cooldown Button -->
          <div class="play-button-wrapper">
            <button 
              v-if="!cooldownTimers[activeSubCategory.mainCategory]"
              @click="startFakeoutGame(activeSubCategory.mainCategory)"
              class="collage-play-button flex items-center justify-center gap-1.5"
            >
              <!-- Simple play icon -->
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="12" viewBox="0 0 10 12" fill="none" class="play-icon">
                <path d="M1 1.5L9 6L1 10.5V1.5Z" fill="#FDF4EB" stroke="#FDF4EB" stroke-width="1.5" stroke-linejoin="round"/>
              </svg>
              Play
            </button>
            <button 
              v-else
              disabled
              class="collage-play-button is-cooldown flex items-center justify-center"
            >
              {{ cooldownTimers[activeSubCategory.mainCategory] }} Seconds
            </button>
          </div>
        </div>

        <!-- Horizontal Category Slider -->
        <div class="category-slider-wrapper">
          <div class="category-slider-carousel">
            <div
              v-for="subCat in subCategories"
              :key="subCat.id"
              @click="activeSubCategory = subCat"
              class="category-slider-item"
              :class="{ 'is-active': activeSubCategory.id === subCat.id }"
            >
              <div class="category-slider-thumbnail-wrapper">
                <img 
                  :src="subCat.thumbnail" 
                  class="category-slider-thumbnail" 
                  alt=""
                  loading="lazy"
                />
              </div>
              <span class="category-slider-label">
                {{ subCat.name }}
              </span>
            </div>
          </div>
        </div>

      </section>

      <!-- FAKEOUT GAME SWIPING MECHANIC -->
      <section v-if="gameActive && currentCard" class="flex-grow flex flex-col justify-between py-2 w-full">
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
                    ✓ True
                  </div>
                  <div v-if="swipeOffset < -30" class="px-4 py-2 border-4 border-error bg-white rounded shadow-md font-sans">
                    ✕ False
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

        <!-- Desktop Swiping Helpers (True/False Redesign) -->
        <div 
          class="gameplay-buttons-container"
          :class="[roundAnswered ? 'invisible opacity-0 pointer-events-none' : 'visible opacity-100']"
        >
          <button 
            @click="handleSwipeChoice(false)"
            class="gameplay-btn gameplay-btn-false"
          >
            <!-- Thumbs Down Icon -->
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" class="mix-blend-soft-light">
              <path d="M19 15h4V3h-4v12zm-22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" transform="rotate(180 12 12)"/>
            </svg>
            False
          </button>
          
          <button 
            @click="handleSwipeChoice(true)"
            class="gameplay-btn gameplay-btn-true"
          >
            <!-- Thumbs Up Icon -->
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" class="mix-blend-soft-light">
              <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
            </svg>
            True
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
