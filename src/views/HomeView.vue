<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore';
import { useGameStore, CATEGORIES, CATEGORY_SLUG, categoryToSlug, slugToCategory, MAX_LIVES } from '../stores/useGameStore';
import type { Card, Category } from '../stores/useGameStore';
import { CATEGORY_HOME_CONFIG, type TopicOption } from '../data/categories';
import CardComp from '../components/Card.vue';
import CardsUnlocked from '../components/CardsUnlocked.vue';
import PageLayout from '../components/PageLayout.vue';
import Loader from '../components/Loader.vue';
import BaseButton from '../components/BaseButton.vue';
import TopicPickerSheet from '../components/TopicPickerSheet.vue';
import { trackEvent } from '../analytics';
import { useCardFit } from '../utils/useCardFit';
import { PhThumbsUp, PhThumbsDown, PhDotsThreeOutline } from '@phosphor-icons/vue';
import AppIcon from '../components/AppIcon.vue';
import { cdxIconPlay, cdxIconSuccess, cdxIconClear } from '@wikimedia/codex-icons';

const route = useRoute();
const router = useRouter();

const authStore = useAuthStore();
const gameStore = useGameStore();

const isLoading = ref(true);

// Active Category for Fakeout Game (tracks game session)
const selectedCategory = ref<Category | null>(null);

// Topic picker ("More" sheet). When a game is launched from a fine-grained
// topic rather than one of the six categories, we track its label for the
// results badge and analytics (there's no Category for it).
const showTopicSheet = ref(false);
const selectedTopicLabel = ref<string | null>(null);

// Subcategories definition matching Figma website UX / UI page
interface SubCategoryDef {
  id: string;
  name: string;
  mainCategory: Category;
  thumbnail: string;
  bgCollage: string;
}

// Selector entries in CATEGORIES order; display data lives in
// src/data/categories.ts, and `id` is the category's CSS-palette slug.
const subCategories: SubCategoryDef[] = CATEGORIES.map((cat) => {
  const config = CATEGORY_HOME_CONFIG[cat];
  return {
    id: CATEGORY_SLUG[cat],
    name: config.name,
    mainCategory: cat,
    thumbnail: config.thumbnail,
    bgCollage: config.bgCollage
  };
});

// Active subcategory on the home screen (Sports by default)
const activeSubCategory = ref<SubCategoryDef>(subCategories[0]);

// Activate a tile and scroll it to the center of the strip.
const selectSubCategory = (subCat: SubCategoryDef, event: Event) => {
  activeSubCategory.value = subCat;
  const tile = event.currentTarget as HTMLElement;
  const carousel = tile.parentElement;
  if (!carousel) return;
  const tileRect = tile.getBoundingClientRect();
  const carouselRect = carousel.getBoundingClientRect();
  carousel.scrollLeft +=
    tileRect.left + tileRect.width / 2 - (carouselRect.left + carouselRect.width / 2);
};



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

// Result feedback states
const roundWasCorrect = ref(false);
const swipeDirection = ref<'left' | 'right' | null>(null);

// Fact Frenzy States
const gachaActive = ref(false);
const gachaTimer = ref(5);
const gachaTapCount = ref(0);
const gachaDroppedCards = ref<Card[]>([]);
const showGachaSummary = ref(false);
const showCardsUnlocked = ref(false);
const cardsUnlockedGameType = ref<'fakeout' | 'gacha'>('fakeout');
const identifiedFakesThisGame = ref<Card[]>([]);
const encounteredCardsThisGame = ref<{ card: Card; isCorrect: boolean }[]>([]);
const gameLost = ref(false);
const incorrectCount = ref(0);
// Lives left in the current run; the run is lost once this hits 0.
const livesRemaining = computed(() => Math.max(0, MAX_LIVES - incorrectCount.value));
const isStartingGame = ref(false);
// Timestamp (ms) when the current fakeout game started, for measuring play duration.
const gameStartTime = ref(0);
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


onMounted(async () => {
  authStore.initAuth();
  gameStore.loadGuestState();

  displayedPoints.value = gameStore.gdPoints;

  // If we landed directly on /play/:category, keep the loader up until the game
  // has started (or we've redirected away) so the home screen doesn't flash.
  await syncGameToRoute();
  isLoading.value = false;

  checkTriggerGacha();
});

// React to /play/:category changes (direct links, back/forward, programmatic nav).
watch(() => route.params.category, () => {
  syncGameToRoute();
});

// Returning to the home route (e.g. clicking the header title from the results
// screen) must drop any active game or post-game results, not just change the
// URL. /play/:category and / both render this view, so the component is never
// remounted — we reset the in-component state here. (Fact Frenzy is left alone:
// it's launched on the home route via the triggerGacha query.)
watch(() => route.name, (name) => {
  if (name === 'home' && !gachaActive.value) {
    showCardsUnlocked.value = false;
    gameActive.value = false;
    selectedCategory.value = null;
    selectedTopicLabel.value = null;
  }
});

// ── First-session "How to Play" instructions ─────────────────────
// Pop the existing How-to-Play modal (owned by AppHeader) the first time a
// guest presses Play. Logged-in users never see it, and it only fires once
// per browser (tracked via localStorage).
const INSTRUCTIONS_SEEN_KEY = 'moonflower_seen_instructions';

const maybeShowInstructions = () => {
  if (authStore.isLoggedIn) return;
  if (localStorage.getItem(INSTRUCTIONS_SEEN_KEY)) return;
  localStorage.setItem(INSTRUCTIONS_SEEN_KEY, '1');
  headerRef.value?.openInfoModal();
};

// Scale the swipe card to the space left between the header and the buttons.
const cardAreaRef = ref<HTMLElement | null>(null);
const cardFitVars = useCardFit(cardAreaRef);

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

// Core game initialization, shared by category and topic games. `fetchPool`
// returns the candidate card pool; `category`/`topicLabel` identify the run for
// the results badge and analytics (exactly one is set).
const beginGame = async (
  fetchPool: () => Promise<Card[]>,
  { category, topicLabel }: { category?: Category; topicLabel?: string }
) => {
  isStartingGame.value = true;
  try {
    // Fetch a fresh randomized pool each game so the cards vary between games.
    // Fall back to the cached sample if the fetch is empty (offline/mock).
    let poolCards = await fetchPool();
    if (poolCards.length === 0 && category) {
      poolCards = gameStore.gameCards.filter((c: Card) => c.category === category);
    }

    // Build the deck: a fully shuffled, balanced mix of real and fake cards
    const reals = shuffle(poolCards.filter((c: Card) => c.isReal));
    const fakes = shuffle(poolCards.filter((c: Card) => !c.isReal));

    // Aim for an even real/fake split; if one side is short, backfill from the other
    let numReal = Math.min(TARGET_REAL, reals.length);
    let numFake = Math.min(DECK_SIZE - numReal, fakes.length);
    numReal = Math.min(reals.length, DECK_SIZE - numFake);

    // Combine and shuffle again so reals and fakes are interleaved
    const deckFakes = fakes.slice(0, numFake);
    const deck = shuffle([...reals.slice(0, numReal), ...deckFakes]);

    // Remember the fakes shown this game so future pools avoid repeating them.
    gameStore.markFakesSeen(deckFakes.map((c: Card) => c.id));

    gameStartTime.value = performance.now();
    trackEvent('start_fakeout_game', {
      fakeout_category: category || topicLabel,
      logged_in: authStore.isLoggedIn,
    });

    pointsBeforeGame.value = gameStore.gdPoints;
    selectedCategory.value = category ?? null;
    selectedTopicLabel.value = topicLabel ?? null;
    gameActive.value = true;
    currentRound.value = 1;
    gameScore.value = 0;
    collectedThisGame.value = [];
    identifiedFakesThisGame.value = [];
    encounteredCardsThisGame.value = [];
    gameLost.value = false;
    incorrectCount.value = 0;
    showCardsUnlocked.value = false;
    roundAnswered.value = false;
    playerChoiceReal.value = null;
    gameDeck.value = deck;

    loadRound();
  } finally {
    isStartingGame.value = false;
  }
};

// Category selection & game initialization
const startFakeoutGame = async (category: Category) => {
  if (isStartingGame.value) return;
  await beginGame(() => gameStore.fetchCategoryPool(category), { category });
};

// Launch a game filtered to a fine-grained topic (from the "More" picker).
// Not route-driven — topic games have no /play/:category URL — so we start the
// game directly and stay on the home route.
const startTopicGame = async (topic: TopicOption) => {
  if (isStartingGame.value) return;
  showTopicSheet.value = false;
  maybeShowInstructions();
  await beginGame(
    () => gameStore.fetchTopicPool(topic.code, topic.category),
    { topicLabel: topic.label }
  );
};

// Navigate to the slugified game URL; the route watcher below starts the game.
// Keeping start logic route-driven means the Play button and direct links
// (/play/<slug>) take the exact same path.
const playCategory = (category: Category) => {
  if (isStartingGame.value) return;
  maybeShowInstructions();
  router.push(`/play/${categoryToSlug(category)}`);
};

// Reconcile game state with the /play/:category route param. Runs on mount and
// whenever the param changes (direct navigation, back/forward, programmatic push).
const syncGameToRoute = async () => {
  const slug = route.params.category as string | undefined;
  if (!slug) return;

  const category = slugToCategory(slug);
  if (!category) {
    // Unknown slug — fall back to the home selection screen.
    router.replace('/');
    return;
  }

  // Reflect the category in the home selection UI.
  const sub = subCategories.find(s => s.mainCategory === category);
  if (sub) activeSubCategory.value = sub;

  // Don't restart a game that's already running for this category.
  if (gameActive.value && selectedCategory.value === category) return;

  await startFakeoutGame(category);
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

  // Track all encountered cards
  encounteredCardsThisGame.value.push({ card, isCorrect });

  if (isCorrect) {

    gameScore.value += 1;
    // Earn point in game store locally without DB write to prevent race conditions during fast play
    gameStore.addPoints(1, false);
    displayedPoints.value = gameStore.gdPoints;
    
    trackEvent('correct_fakeout_card', {
      logged_in: authStore.isLoggedIn,
      gameScore: gameScore.value,
      fakeout_category: selectedCategory.value || selectedTopicLabel.value,
      cardIsReal: card.isReal
    });

    // Track cards guessed correctly
    if (card.isReal) {
      collectedThisGame.value.push(card);
    } else {
      identifiedFakesThisGame.value.push(card);
    }
  } else {
    incorrectCount.value += 1;
    if (livesRemaining.value <= 0) {
      trackEvent('lose_fakeout_game', {
        logged_in: authStore.isLoggedIn,
        gameScore: gameScore.value,       
        fakeout_category: selectedCategory.value || selectedTopicLabel.value,
        failedCardIsReal: card.isReal
      });
      gameLost.value = true;
    }
  }

  // Tighten up loop: automatically advance to the next card or end game after 1 second!
  setTimeout(() => {
    if (livesRemaining.value <= 0) {
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

  trackEvent('end_fakeout_game', {
    logged_in: authStore.isLoggedIn,
    gameScore: gameScore.value,
    fakeout_category: selectedCategory.value || selectedTopicLabel.value,
    // Seconds elapsed since the game started, rounded to one decimal place.
    duration_sec: gameStartTime.value
      ? Math.round((performance.now() - gameStartTime.value) / 100) / 10
      : 0,
  });

  // Automatically collect all correctly guessed real cards (win or lose)
  if (collectedThisGame.value.length > 0) {
    const realCardIds: string[] = [];
    collectedThisGame.value.forEach(card => {
      gameStore.collectCard(card);
      realCardIds.push(card.id);
    });

    // If logged in, claim them in the database immediately
    if (authStore.isLoggedIn && realCardIds.length > 0) {
      gameStore.claimArticlesForProfile(realCardIds, collectedThisGame.value);
    }
  }
  
  // Persist points and game state to backend/localStorage when game ends
  gameStore.persistState();
  
  // Transition to unified CardsUnlocked UI
  cardsUnlockedGameType.value = 'fakeout';
  showCardsUnlocked.value = true;
};

const handleClaimSuccess = (claimedCards: Card[]) => {
  console.log('Cards claimed successfully:', claimedCards);
};

// Leave the game and restore the home URL. Called from the quit button and
// after dismissing the results screen so /play/<slug> doesn't linger.
const returnToHome = () => {
  if (route.name === 'play') {
    router.push('/');
  }
};

const quitGame = () => {
  gameActive.value = false;
  selectedCategory.value = null;
  selectedTopicLabel.value = null;
  returnToHome();
};

const handleCardsUnlockedDismiss = () => {
  showCardsUnlocked.value = false;
  selectedCategory.value = null;
  selectedTopicLabel.value = null;
  returnToHome();
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
  // Stop the horizontal drag from scrolling/rubber-banding the page on
  // iOS/Android (belt-and-suspenders with the card's touch-action: none).
  if (e.cancelable) e.preventDefault();
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

// Fact Frenzy Logic
// Pool of real cards pre-fetched when gacha starts, used by handleGachaGlobeTap
const gachaCardPool = ref<Card[]>([]);

const startGachaDrop = async () => {
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

    // Pre-fetch a pool of real cards for fact frenzy across random categories
    const randomCategory = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const pool = await gameStore.fetchCategoryPool(randomCategory);
    gachaCardPool.value = pool.filter((c: Card) => c.isReal);
    
    // 10 second ticking timer
    const interval = setInterval(() => {
      gachaTimer.value -= 1;
      if (gachaTimer.value <= 0) {
        clearInterval(interval);
        gachaActive.value = false;
        
        // Automatically collect all dropped cards
        if (gachaDroppedCards.value.length > 0) {
          const droppedIds: string[] = [];
          gachaDroppedCards.value.forEach(card => {
            gameStore.collectCard(card);
            droppedIds.push(card.id);
          });

          // If logged in, claim them in the database immediately
          if (authStore.isLoggedIn && droppedIds.length > 0) {
            gameStore.claimArticlesForProfile(droppedIds, gachaDroppedCards.value);
          }

          gameStore.persistState();
        }
        
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
  
  // Select a card at random from the pre-fetched gacha pool (real cards only)
  const realCards = gachaCardPool.value;
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
    :game-active="gameActive"
    :results-active="showCardsUnlocked"
    :active-main-category="gameActive ? selectedCategory || undefined : activeSubCategory.mainCategory"
    :current-round="currentRound"
    :total-rounds="gameDeck.length"
    :lives="livesRemaining"
    :class="{ 'is-home-selection': !gachaActive && !showCardsUnlocked }"
    @activate="startGachaDrop" 
    @quit-game="quitGame"
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
        </div>

        <!-- Horizontal Category Slider -->
        <div class="category-slider-wrapper">
          <div class="category-slider-carousel">
            <div
              v-for="subCat in subCategories"
              :key="subCat.id"
              @click="selectSubCategory(subCat, $event)"
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

            <!-- "More" tile: opens the fine-grained topic picker. A distinct
                 affordance — it opens a sheet rather than selecting a category. -->
            <div
              class="category-slider-item"
              role="button"
              tabindex="0"
              @click="showTopicSheet = true"
              @keydown.enter="showTopicSheet = true"
            >
              <div class="category-slider-thumbnail-wrapper category-slider-more">
                <PhDotsThreeOutline :size="28" weight="fill" />
              </div>
              <span class="category-slider-label">
                More
              </span>
            </div>
          </div>
        </div>
        <!-- Play Button -->
        <div class="play-button-wrapper">
          <BaseButton
            variant="primary"
            :loading="isStartingGame"
            @click="playCategory(activeSubCategory.mainCategory)"
          >
            <template #icon>
              <AppIcon :icon="cdxIconPlay" :size="18" class="play-icon" />
            </template>
            Play
          </BaseButton>
        </div>

      </section>

      <!-- FAKEOUT GAME SWIPING MECHANIC -->
      <section v-if="gameActive && currentCard" class="flex-grow flex flex-col justify-between py-2 w-full">
        <!-- Swiping Card Area -->
        <div
          ref="cardAreaRef"
          class="flex-grow flex items-center justify-center my-2 relative min-h-0"
          :style="cardFitVars"
        >
          
          <!-- Centered wrapper container -->
          <div class="relative w-full max-w-[var(--card-width)] h-[var(--card-height)]">
            
            <div class="stack select-none w-full h-full touch-none">
              
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
                <CardComp
                  :card="card"
                  :show-link="false"
                  :shiny-trigger="index === 0 ? 'on' : 'off'"
                />
              </div>
              
            </div>

          </div>

        </div>

        <!-- Footer: buttons plus the floating result toast. The toast is
             positioned absolutely so it never reflows the card above it. -->
        <div class="gameplay-footer">
        <!-- Correct / incorrect result toast (centered, just above the buttons) -->
        <Transition name="result-toast-pop">
          <div v-if="roundAnswered" class="round-result-slot">
            <div
              class="round-result-toast"
              :class="roundWasCorrect ? 'round-result-toast--correct' : 'round-result-toast--incorrect'"
              role="status"
            >
              <AppIcon
                class="round-result-toast__icon"
                :icon="roundWasCorrect ? cdxIconSuccess : cdxIconClear"
                :size="18"
              />
              <span class="round-result-toast__label">{{ roundWasCorrect ? 'Correct' : 'Incorrect' }}</span>
            </div>
          </div>
        </Transition>

        <!-- Desktop Swiping Helpers (True/False Redesign). Buttons stay
             visible but are disabled while the result toast is showing. -->
        <div class="gameplay-buttons-container">
          <BaseButton
            variant="false"
            :disabled="roundAnswered"
            @click="handleSwipeChoice(false)"
          >
            <template #icon>
              <!-- Thumbs Down Icon -->
              <PhThumbsDown :size="18" weight="fill" />
            </template>
            Fake
          </BaseButton>

          <BaseButton
            variant="true"
            :disabled="roundAnswered"
            @click="handleSwipeChoice(true)"
          >
            <template #icon>
              <!-- Thumbs Up Icon -->
              <PhThumbsUp :size="18" weight="fill" />
            </template>
            Fact
          </BaseButton>
        </div>
        </div>
      </section>

      <!-- Fact Frenzy TICKING GAMEPLAY -->
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

      <CardsUnlocked
        v-if="showCardsUnlocked"
        :unlocked-cards="cardsUnlockedGameType === 'fakeout' ? collectedThisGame : gachaDroppedCards"
        :identified-fakes="cardsUnlockedGameType === 'fakeout' ? identifiedFakesThisGame : []"
        :encountered-cards="cardsUnlockedGameType === 'fakeout' ? encounteredCardsThisGame : []"
        :game-type="cardsUnlockedGameType"
        :game-stats="{
          score: gameScore,
          totalRounds: gameDeck.length,
          taps: gachaDroppedCards.length
        }"
        :lost="gameLost"
        :category="selectedCategory || selectedTopicLabel || undefined"
        :failed-card="gameLost && currentCard ? currentCard : undefined"
        :deck="gameDeck"
        @claim="handleClaimSuccess"
        @dismiss="handleCardsUnlockedDismiss"
        @open-auth="headerRef?.openAuthModal()"
      />
    </template>

    <!-- Fine-grained topic picker, opened from the "More" slider tile. -->
    <TopicPickerSheet
      :open="showTopicSheet"
      :starting="isStartingGame"
      @select="startTopicGame"
      @close="showTopicSheet = false"
    />

  </PageLayout>
</template>
