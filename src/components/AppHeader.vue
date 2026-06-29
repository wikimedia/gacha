<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore';
import { useGameStore } from '../stores/useGameStore';
import type { Category } from '../stores/useGameStore';
import { 
  PhX, 
  PhUser, 
  PhInfo, 
  PhMonitor, 
  PhArrowRight, 
  PhWarningCircle, 
  PhArrowLeft, 
  PhCaretLeft,
  PhCaretRight,
  PhCheck,
  PhExport,
  PhStar,
  PhGlobeHemisphereWest,
  PhHeart,
  PhHandTap,
  PhLightning
} from '@phosphor-icons/vue';

const props = withDefaults(defineProps<{
  displayedPoints?: number;
  gachaActive?: boolean;
  isAnimating?: boolean;
  activeMainCategory?: Category;
  gameActive?: boolean;
  binderColor?: string;
  currentRound?: number;
  totalRounds?: number;
}>(), {
  gachaActive: false,
  isAnimating: false,
  gameActive: false,
  binderColor: '#4a6783',
  currentRound: 1,
  totalRounds: 10
});

const emit = defineEmits<{
  (e: 'activate'): void;
  (e: 'login-success'): void;
  (e: 'logout'): void;
  (e: 'edit-profile'): void;
  (e: 'quit-game'): void;
  (e: 'edit-profile-field', field: 'username' | 'bio' | 'showcase' | 'binderColor'): void;
  (e: 'update-binder-color', color: string): void;
  (e: 'share-profile'): void;
}>();

const authStore = useAuthStore();
const gameStore = useGameStore();
const router = useRouter();
const route = useRoute();

const handleActivateClick = () => {
  if (route.path !== '/') {
    router.push({ path: '/', query: { triggerGacha: 'true' } });
  } else {
    emit('activate');
  }
};

const handleLogout = async () => {
  await authStore.logout();
  emit('logout');
};

const dbUsername = computed(() => {
  return authStore.user?.username || null;
});

const isOwnProfile = computed(() => {
  if (!authStore.isLoggedIn || !authStore.user) return false;
  const routeId = route.params.id as string;
  if (!routeId) return false;
  
  const cleanRouteId = routeId.startsWith('@') ? routeId.slice(1) : routeId;
  const cleanUserUsername = authStore.user.username;
  const cleanUserId = authStore.user.id;
  
  return cleanRouteId.toLowerCase() === cleanUserUsername.toLowerCase() || 
         cleanRouteId.toLowerCase() === cleanUserId.toLowerCase();
});

const points = computed(() => {
  return props.displayedPoints !== undefined ? props.displayedPoints : gameStore.gdPoints;
});

const confirmQuitGame = () => {
  if (window.confirm("Are you sure you want to quit? Your progress in this run will be lost.")) {
    emit('quit-game');
  }
};



// Auth modal state
const showAuthModal = ref(false);
const showInfoModal = ref(false);
const authEmail = ref('');
const otpSent = ref(false);
const isVerifying = ref(false);
const authError = ref('');

// Info modal slideshow state
const currentSlide = ref(0);
const slides = [
  {
    title: 'Collect Unique Cards',
    description: 'Collect cards based on real Wikipedia articles. Each card is unique. If you find one, you’re the only player in the world who owns it.',
  },
  {
    title: 'Ranked by Popularity',
    description: 'Cards are ranked 1 to 5 stars based on how popular the article is on Wikipedia.',
  },
  {
    title: 'Swipe Right for Real',
    description: 'Swipe right if you think a card is real to collect it!',
  },
  {
    title: 'Swipe Left for Fake',
    description: 'Swipe left if you think a card is made up. Fake articles always have a visual or textual “tell.”',
  },
  {
    title: '10 Cards, 3 Chances',
    description: 'Each round has 10 cards. You get 3 chances per round.',
  },
  {
    title: 'Unlock Fact Frenzy',
    description: 'Earn 1 point for every real card you collect. Reach 100 points to unlock Fact Frenzy, a 5-second tap rush where you grab as many cards as possible.',
  },
  {
    title: 'Build Your Collection',
    description: 'Build your collection. Trust your instincts. Go wild.',
  },
];

const nextSlide = () => {
  if (currentSlide.value < slides.length - 1) {
    currentSlide.value++;
  }
};

const prevSlide = () => {
  if (currentSlide.value > 0) {
    currentSlide.value--;
  }
};

// Swipe navigation for the info slideshow (in addition to the arrow buttons).
// Works for touch and mouse drag; pointer handlers are gated to mouse so a
// touch swipe doesn't get counted twice (touch fires both event families).
const SWIPE_THRESHOLD = 40;
let swipeStartX = 0;
let swipeActive = false;

const beginSwipe = (x: number) => {
  swipeStartX = x;
  swipeActive = true;
};

const endSwipe = (x: number) => {
  if (!swipeActive) return;
  swipeActive = false;
  const dx = x - swipeStartX;
  if (Math.abs(dx) < SWIPE_THRESHOLD) return;
  if (dx < 0) nextSlide();
  else prevSlide();
};

const onSwipeTouchStart = (e: TouchEvent) => beginSwipe(e.changedTouches[0].clientX);
const onSwipeTouchEnd = (e: TouchEvent) => endSwipe(e.changedTouches[0].clientX);
const onSwipePointerDown = (e: PointerEvent) => { if (e.pointerType === 'mouse') beginSwipe(e.clientX); };
const onSwipePointerUp = (e: PointerEvent) => { if (e.pointerType === 'mouse') endSwipe(e.clientX); };

watch(showInfoModal, (isOpen) => {
  if (isOpen) {
    currentSlide.value = 0;
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});


const closeModal = () => {
  showAuthModal.value = false;
  otpSent.value = false;
  authEmail.value = '';
  authError.value = '';
};

// Real Supabase OTP Email Auth flow
const handleSendOtp = async () => {
  if (!authEmail.value.trim() || !authEmail.value.includes('@')) return;
  
  isVerifying.value = true;
  authError.value = '';
  try {
    await authStore.sendOtp(authEmail.value.trim());
    otpSent.value = true;
  } catch (err: any) {
    authError.value = err.message || 'Failed to send verification link.';
  } finally {
    isVerifying.value = false;
  }
};



const clearBadge = () => {
  gameStore.clearNewCards();
};

watch(() => route.name, (newName) => {
  if (newName === 'profile') {
    clearBadge();
  }
}, { immediate: true });

defineExpose({
  openAuthModal() {
    showAuthModal.value = true;
  },
  openInfoModal() {
    showInfoModal.value = true;
  }
});
</script>

<template>
  <header class="w-full z-40 select-none pointer-events-none sticky top-0">
    <!-- Figma Mock Header (Stacked overlay with icons) -->
    <div class="gacha-header-overlay pointer-events-auto">
      
      <!-- Left: Profile Menu Button / Dropdown OR Exit Button / Back Home Button -->
      <div v-if="gameActive" class="z-50">
        <button 
          class="header-icon-btn"
          @click="confirmQuitGame"
          aria-label="Quit Game"
        >
          <!-- 'X' close Phosphor icon -->
          <PhX :size="18" weight="bold" />
        </button>
      </div>
      <div v-else-if="route.name === 'profile'" class="z-50">
        <router-link 
          to="/"
          class="header-icon-btn"
          aria-label="Back to Home"
        >
          <!-- 'X' close Phosphor icon -->
          <PhX :size="18" weight="bold" />
        </router-link>
      </div>
      <div v-else class="dropdown dropdown-bottom dropdown-start z-50">
        <label 
          tabindex="0" 
          class="header-icon-btn relative"
          @click="clearBadge"
          @focusin="clearBadge"
        >
          <!-- User Profile Silhouette icon -->
          <PhUser :size="18" weight="bold" />
          <span 
            v-if="gameStore.hasNewCards" 
            class="profile-badge-dot"
          ></span>
        </label>
        
        <ul 
          tabindex="0" 
          class="dropdown-content menu p-3 shadow-xl bg-base-100 rounded-box border border-base-300 w-64 mt-2 gap-2 text-sm text-left"
        >

          <!-- Points tracker -->
          <li class="px-4 py-2 border-b border-base-200">
            <div class="flex justify-between items-center w-full p-0 pointer-events-none select-none">
              <span class="text-[10px] font-bold text-secondary uppercase tracking-wider">Gacha Points</span>
              <span class="text-xs font-black text-primary" :class="{ 'animate-pulse text-warning': points >= 100 }">{{ points }}/100</span>
            </div>
            
            <button 
              v-if="points >= 100"
              @click.stop="handleActivateClick"
              class="btn btn-primary btn-xs w-full mt-3 text-[10px] font-black uppercase text-white gacha-gradient-animation select-none shadow hover:scale-105 active:scale-95 transition-transform"
            >
              ⚡ Fact Frenzy ⚡
            </button>
            <div 
              v-else 
              class="text-[9px] text-secondary text-center mt-2 font-sans font-medium flex items-center justify-center gap-1 pointer-events-none select-none"
            >
              <span>🔒</span>
              <span>You need 100 points start a Fact Frenzy</span>
            </div>
          </li>

          <!-- Actions -->
          <li v-if="authStore.isLoggedIn">
            <router-link :to="'/@' + (dbUsername || authStore.user?.username)" class="font-medium text-base-content py-2 px-3 hover:bg-base-200 rounded">
              📖 View Collection
            </router-link>
          </li>
          <li v-if="authStore.isLoggedIn && route.name === 'profile' && isOwnProfile">
            <button @click="emit('edit-profile')" class="font-medium text-base-content py-2 px-3 hover:bg-base-200 rounded">
              ✏️ Edit Profile
            </button>
          </li>
          <li v-if="!authStore.isLoggedIn">
            <button 
              @click="showAuthModal = true"
              class="btn btn-primary btn-sm btn-outline w-full mt-1.5 uppercase font-bold text-xs"
            >
              Log In / Sign Up
            </button>
          </li>
          <li v-else>
            <button @click="handleLogout" class="text-error hover:bg-base-200 active:bg-base-300 active:scale-[0.98] transition-all duration-75 font-bold py-2 px-3 rounded border-t border-base-200 pt-2 mt-1">
              🚪 Log Out
            </button>
          </li>
        </ul>
      </div>

      <!-- Center: Progress Indicator (during game) or title -->
      <div v-if="gameActive" class="game-progress-bar">
        <div
          v-for="i in totalRounds"
          :key="i"
          class="game-progress-segment"
          :class="{
            'game-progress-segment--completed': i < currentRound,
            'game-progress-segment--current': i === currentRound,
            'game-progress-segment--upcoming': i > currentRound
          }"
        />
      </div>
      <router-link 
        v-else
        to="/" 
        class="font-serif font-black text-xl text-[#fdf4eb] tracking-widest no-underline hover:opacity-85 select-none"
      >
        World of Wikipedia
      </router-link>

      <!-- Right: Info Dialog Trigger OR Share button -->
      <div v-if="route.name === 'profile'" class="relative z-50">
        <button 
          class="header-icon-btn"
          @click="emit('share-profile')"
          aria-label="Share Profile Link"
          title="Share Profile Link"
        >
          <PhExport :size="18" weight="bold" />
        </button>
      </div>
      <button 
        v-else
        class="header-icon-btn"
        @click="showInfoModal = true"
      >
        <!-- 'i' info Phosphor icon -->
        <PhInfo :size="18" weight="bold" />
      </button>

    </div>

    <!-- AUTHENTICATION DIALOG / MODAL (DaisyUI Dialog Modal) -->
    <dialog class="modal modal-bottom sm:modal-middle" :class="{ 'modal-open': showAuthModal }">
      <div class="modal-box bg-base-100 border border-base-300 p-6 shadow-2xl relative text-left">
        <!-- Close button -->
        <button 
          @click="closeModal" 
          class="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
        >
          ✕
        </button>

        <h3 class="font-serif text-lg font-bold border-b border-base-300 pb-2 text-primary">
          Sign In to Moonflower
        </h3>
        
        <p class="text-xs text-secondary mt-3 mb-4 leading-relaxed font-sans font-light">
          Authenticating with your email allows you to claim and save your binder items and points securely in the cloud across all devices.
        </p>

        <!-- Error Notice Block -->
        <div 
          v-if="authError" 
          class="alert alert-error text-xs p-3 rounded mb-4 font-sans font-semibold flex items-start gap-1"
        >
          <span>⚠️ {{ authError }}</span>
        </div>

        <!-- Step 1: Request Sign-In Link -->
        <form v-if="!otpSent" @submit.prevent="handleSendOtp" class="flex flex-col gap-4 mt-2">
          <div class="form-control w-full">
            <label class="label py-1">
              <span class="label-text font-bold text-xs uppercase text-neutral-content/80">Email Address</span>
            </label>
            <input 
              v-model="authEmail"
              type="email" 
              placeholder="e.g. scholar@wikipedia.org"
              required
              class="input input-bordered w-full input-sm font-sans"
            >
          </div>

          <button 
            type="submit"
            :disabled="isVerifying"
            class="btn btn-primary btn-sm w-full font-bold uppercase mt-2 text-white"
          >
            <span v-if="isVerifying" class="loading loading-spinner loading-xs"></span>
            {{ isVerifying ? 'Sending Link...' : 'Send Sign-In Link' }}
          </button>
        </form>

        <!-- Step 2: Link Sent Status -->
        <div v-else class="flex flex-col gap-4 mt-2 font-sans">
          <div class="bg-base-200 border border-base-300 p-4 rounded text-xs text-base-content leading-relaxed">
            <p class="mb-2">📬 We've sent a magic sign-in link to <strong class="text-primary">{{ authEmail }}</strong>.</p>
            <p class="mb-2">Please check your inbox (and spam folder) and click the link to log in.</p>
            <p class="text-secondary">Once you click the link, you will be automatically logged in here, and this window will update.</p>
          </div>
          
          <div class="flex justify-between text-[10px] px-1">
            <button 
              type="button" 
              @click="otpSent = false" 
              class="link link-primary font-semibold no-underline hover:underline"
            >
              ← Change email
            </button>
            <button 
              type="button" 
              @click="handleSendOtp" 
              class="link link-primary font-semibold no-underline hover:underline"
            >
              Resend email
            </button>
          </div>

          <button 
            type="button"
            @click="closeModal"
            class="btn btn-outline btn-sm w-full font-bold uppercase mt-2"
          >
            Close Window
          </button>
        </div>
      </div>

      <form method="dialog" class="modal-backdrop" @click="closeModal">
        <button>close</button>
      </form>
    </dialog>

    <!-- INFO HOW TO PLAY DIALOG (Custom Fullscreen Overlay) -->
    <Teleport to="body">
      <Transition name="dialog-fade">
        <div 
          v-if="showInfoModal" 
          class="fixed inset-0 z-50 bg-[#3f3f35]/95 backdrop-blur-md flex flex-col justify-between py-6 px-6 text-[#fdf4eb]"
          role="dialog"
          aria-modal="true"
        >
          <!-- Top bar -->
          <div class="flex items-center justify-between w-full max-w-sm mx-auto flex-shrink-0">
            <!-- Left spacer to center the title -->
            <div class="w-8 h-8 opacity-0"></div>
            
            <h3 class="font-serif font-black text-xl text-[#fdf4eb] text-center tracking-wide leading-none m-0">
              How to Play
            </h3>
            
            <!-- Close button -->
            <button 
              @click="showInfoModal = false"
              class="flex items-center justify-center w-8 h-8 rounded-full border border-transparent hover:bg-white/10 text-[#fdf4eb] active:scale-90 transition-all cursor-pointer"
              aria-label="Close dialog"
            >
              <PhX :size="20" weight="bold" />
            </button>
          </div>

          <!-- Middle: Illustration + Text (swipe left/right to navigate) -->
          <div
            class="flex-grow flex flex-col items-center justify-center w-full max-w-sm mx-auto my-auto py-2 touch-pan-y"
            @touchstart.passive="onSwipeTouchStart"
            @touchend="onSwipeTouchEnd"
            @pointerdown="onSwipePointerDown"
            @pointerup="onSwipePointerUp"
          >
            <!-- Slide illustration container -->
            <div class="w-full max-w-[246px] h-[229px] flex items-center justify-center bg-[#eaecf0]/10 border border-[#c4b69d]/20 rounded-md relative overflow-hidden select-none">
              <!-- Slide 1: Unique Wikipedia Card -->
              <div v-if="currentSlide === 0" class="flex items-center justify-center w-full h-full relative">
                <div class="mini-card mini-card-float">
                  <div class="mini-card-header bg-[#4a6783]"></div>
                  <div class="mini-card-img bg-slate-200">
                    <PhGlobeHemisphereWest :size="22" weight="regular" color="#4a6783" />
                  </div>
                  <div class="mini-card-line w-full bg-slate-300"></div>
                  <div class="mini-card-line w-5/6 bg-slate-300"></div>
                  <div class="mini-card-line w-2/3 bg-slate-300"></div>
                  <div class="unique-badge font-sans font-black uppercase text-[8px] tracking-wider text-[#d4a843] border border-[#d4a843] px-1 py-0.5 rounded bg-[#fdf4eb] shadow-md absolute -top-2 -right-2 rotate-[10deg]">
                    1 / 1
                  </div>
                </div>
                <!-- Sparkles -->
                <div class="star-particle absolute top-6 right-14 text-[#d4a843] animate-ping">✦</div>
                <div class="star-particle absolute bottom-7 left-14 text-[#d4a843] animate-ping" style="animation-delay: 0.6s">✦</div>
              </div>

              <!-- Slide 2: 1–5 Star Rarity -->
              <div v-if="currentSlide === 1" class="flex flex-col items-center justify-center w-full h-full gap-5 select-none">
                <div class="flex items-end gap-1.5">
                  <PhStar
                    v-for="n in 5"
                    :key="n"
                    :size="22 + n * 4"
                    weight="fill"
                    class="star-pop text-[#d4a843]"
                    :style="{ animationDelay: (n * 0.15) + 's' }"
                  />
                </div>
                <div class="text-[10px] font-sans font-black uppercase tracking-wider text-[#fdf4eb]/70 flex items-center gap-1.5">
                  <PhStar :size="11" weight="fill" class="text-[#d4a843]" /> More stars = more views
                </div>
              </div>

              <!-- Slide 3: Real Card Animation -->
              <div v-if="currentSlide === 2" class="flex items-center justify-center w-full h-full relative">
                <div class="mini-card mini-card-real">
                  <div class="mini-card-header bg-[#4a6783]"></div>
                  <div class="mini-card-img bg-slate-200">
                    <PhMonitor :size="20" weight="regular" color="#718096" />
                  </div>
                  <div class="mini-card-line w-full bg-slate-300"></div>
                  <div class="mini-card-line w-5/6 bg-slate-300"></div>
                  <div class="mini-card-line w-2/3 bg-slate-300"></div>
                  <div class="real-badge font-sans font-black uppercase text-[8px] tracking-wider text-[#177860] border border-[#177860] px-1 py-0.5 rounded bg-[#fdf4eb] shadow-md absolute top-12 left-1/2 -translate-x-1/2 rotate-[-12deg] flex items-center gap-0.5">
                    ✓ Fact
                  </div>
                </div>
                <!-- Swipe arrow pointing right -->
                <div class="absolute right-3 text-[#177860]/80 animate-pulse flex flex-col items-center select-none">
                  <PhArrowRight :size="24" weight="bold" />
                  <span class="text-[8px] font-bold uppercase tracking-wider mt-0.5">Fact</span>
                </div>
              </div>

              <!-- Slide 4: Fake Card Animation -->
              <div v-if="currentSlide === 3" class="flex items-center justify-center w-full h-full relative">
                <div class="mini-card mini-card-fake">
                  <div class="mini-card-header bg-[#4a6783]"></div>
                  <div class="mini-card-img bg-slate-200">
                    <PhWarningCircle :size="20" weight="regular" color="#718096" />
                  </div>
                  <div class="mini-card-line w-full bg-slate-300"></div>
                  <div class="mini-card-line w-5/6 bg-slate-300"></div>
                  <div class="mini-card-line w-2/3 bg-slate-300"></div>
                  <div class="fake-badge font-sans font-black uppercase text-[8px] tracking-wider text-[#bf3c2c] border border-[#bf3c2c] px-1 py-0.5 rounded bg-[#fdf4eb] shadow-md absolute top-12 left-1/2 -translate-x-1/2 rotate-[12deg] flex items-center gap-0.5">
                    ✗ Fake
                  </div>
                </div>
                <!-- Swipe arrow pointing left -->
                <div class="absolute left-3 text-[#bf3c2c]/80 animate-pulse flex flex-col items-center select-none">
                  <PhArrowLeft :size="24" weight="bold" />
                  <span class="text-[8px] font-bold uppercase tracking-wider mt-0.5">Fake</span>
                </div>
              </div>

              <!-- Slide 5: 10 Cards, 3 Chances -->
              <div v-if="currentSlide === 4" class="flex flex-col items-center justify-center w-full h-full gap-6 select-none">
                <!-- Fanned deck of 10 -->
                <div class="relative w-[120px] h-[112px]">
                  <div class="mini-card !w-[72px] !h-[100px] absolute left-1/2 top-1.5 -translate-x-1/2 -rotate-[14deg] origin-bottom">
                    <div class="mini-card-header bg-[#4a6783]"></div>
                    <div class="mini-card-img bg-slate-200"></div>
                    <div class="mini-card-line w-full bg-slate-300"></div>
                    <div class="mini-card-line w-2/3 bg-slate-300"></div>
                  </div>
                  <div class="mini-card !w-[72px] !h-[100px] absolute left-1/2 top-0 -translate-x-1/2 rotate-[14deg] origin-bottom">
                    <div class="mini-card-header bg-[#4a6783]"></div>
                    <div class="mini-card-img bg-slate-200"></div>
                    <div class="mini-card-line w-full bg-slate-300"></div>
                    <div class="mini-card-line w-2/3 bg-slate-300"></div>
                  </div>
                  <div class="mini-card !w-[72px] !h-[100px] absolute left-1/2 top-0 -translate-x-1/2">
                    <div class="mini-card-header bg-[#4a6783]"></div>
                    <div class="mini-card-img bg-slate-200"></div>
                    <div class="mini-card-line w-full bg-slate-300"></div>
                    <div class="mini-card-line w-2/3 bg-slate-300"></div>
                  </div>
                  <div class="unique-badge font-sans font-black uppercase text-[10px] tracking-wider text-[#4a6783] border border-[#4a6783] px-1.5 py-0.5 rounded bg-[#fdf4eb] shadow-md absolute -bottom-1 left-1/2 -translate-x-1/2">
                    × 10
                  </div>
                </div>
                <!-- 3 chances -->
                <div class="flex items-center gap-2">
                  <PhHeart
                    v-for="n in 3"
                    :key="n"
                    :size="16"
                    weight="fill"
                    class="heart-pop text-[#bf3c2c]"
                    :style="{ animationDelay: (n * 0.2) + 's' }"
                  />
                </div>
              </div>
              <!-- Slide 6: Fact Frenzy -->
              <div v-if="currentSlide === 5" class="flex items-center justify-center w-full h-full relative">
                <div class="mini-card mini-card-gacha">
                  <div class="mini-card-header bg-[#d4a843]"></div>
                  <div class="mini-card-img bg-[#fdf6e3] text-[#d4a843] flex items-center justify-center">
                    <PhLightning :size="22" weight="fill" />
                  </div>
                  <div class="mini-card-line w-full bg-[#d4a843]/30"></div>
                  <div class="mini-card-line w-5/6 bg-[#d4a843]/30"></div>
                  <div class="mini-card-line w-2/3 bg-[#d4a843]/30"></div>
                </div>
                <!-- Tap ripple -->
                <div class="absolute right-5 bottom-7 text-[#d4a843] flex items-center justify-center">
                  <span class="tap-ripple"></span>
                  <PhHandTap :size="26" weight="fill" class="relative tap-bob" />
                </div>
                <!-- 100 pts unlock badge -->
                <div class="unique-badge font-sans font-black uppercase text-[9px] tracking-wider text-[#d4a843] border border-[#d4a843] px-1.5 py-0.5 rounded bg-[#fdf4eb] shadow-md absolute top-7 left-6 -rotate-[8deg]">
                  100 pts → 0:05
                </div>
                <div class="star-particle absolute top-6 right-16 text-[#d4a843] animate-ping">★</div>
                <div class="star-particle absolute bottom-6 left-16 text-[#d4a843] animate-ping" style="animation-delay: 0.5s">★</div>
              </div>

              <!-- Slide 7: Build Your Collection -->
              <div v-if="currentSlide === 6" class="flex items-center justify-center w-full h-full relative">
                <div class="collection-fan relative w-[150px] h-[112px]">
                  <div class="mini-card mini-card-fake !w-[64px] !h-[92px] absolute left-1/2 top-2 -translate-x-1/2 -rotate-[20deg] origin-bottom">
                    <div class="mini-card-header bg-[#4a6783]"></div>
                    <div class="mini-card-img bg-slate-200"></div>
                    <div class="mini-card-line w-full bg-slate-300"></div>
                  </div>
                  <div class="mini-card mini-card-real !w-[64px] !h-[92px] absolute left-1/2 top-2 -translate-x-1/2 rotate-[20deg] origin-bottom">
                    <div class="mini-card-header bg-[#4a6783]"></div>
                    <div class="mini-card-img bg-slate-200"></div>
                    <div class="mini-card-line w-full bg-slate-300"></div>
                  </div>
                  <div class="mini-card mini-card-gacha !w-[68px] !h-[96px] absolute left-1/2 top-0 -translate-x-1/2 z-10">
                    <div class="mini-card-header bg-[#d4a843]"></div>
                    <div class="mini-card-img bg-[#fdf6e3] text-[#d4a843] flex items-center justify-center">
                      <PhStar :size="18" weight="fill" />
                    </div>
                    <div class="mini-card-line w-full bg-[#d4a843]/30"></div>
                  </div>
                </div>
                <div class="star-particle absolute top-4 left-10 text-[#d4a843] animate-ping">✦</div>
                <div class="star-particle absolute top-10 right-10 text-[#d4a843] animate-ping" style="animation-delay: 0.4s">★</div>
                <div class="star-particle absolute bottom-5 left-1/2 text-[#d4a843] animate-ping" style="animation-delay: 0.8s">✦</div>
              </div>
            </div>

            <!-- Slide details (Text below the card) -->
            <div class="text-center w-full max-w-[280px] mt-6 min-h-[120px] flex flex-col justify-start">
              <h4 class="font-serif font-black text-xl text-[#fdf4eb] leading-tight mb-2">
                {{ slides[currentSlide].title }}
              </h4>
              <p class="text-sm text-[#fdf4eb]/80 leading-relaxed font-sans px-2">
                {{ slides[currentSlide].description }}
              </p>
            </div>
          </div>

          <!-- Bottom Navigation controller -->
          <div class="flex items-center justify-between w-full max-w-xs mx-auto px-4 mt-auto flex-shrink-0">
            <!-- Prev button -->
            <button 
              @click="prevSlide"
              class="w-10 h-10 flex items-center justify-center rounded-full border border-[#fdf4eb]/20 text-[#fdf4eb] hover:bg-white/10 active:scale-90 transition-all cursor-pointer disabled:opacity-20 disabled:pointer-events-none"
              :disabled="currentSlide === 0"
              aria-label="Previous step"
            >
              <PhCaretLeft :size="20" weight="bold" />
            </button>

            <!-- Step indicator dots -->
            <div class="flex gap-3">
              <button 
                v-for="(_, index) in slides" 
                :key="index"
                @click="currentSlide = index"
                class="w-2.5 h-2.5 rounded-full transition-all cursor-pointer"
                :class="currentSlide === index ? 'bg-[#fdf4eb] scale-125' : 'bg-[#fdf4eb]/40 hover:bg-[#fdf4eb]/60'"
                :aria-label="'Go to step ' + (index + 1)"
              ></button>
            </div>

            <!-- Next button / Done -->
            <button 
              @click="currentSlide === slides.length - 1 ? showInfoModal = false : nextSlide()"
              class="w-10 h-10 flex items-center justify-center rounded-full border border-[#fdf4eb]/20 text-[#fdf4eb] hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
              aria-label="Next step"
            >
              <PhCaretRight v-if="currentSlide < slides.length - 1" :size="20" weight="bold" />
              <PhCheck v-else :size="20" weight="bold" />
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

  </header>
</template>

<style scoped>
.gacha-header-overlay {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 28rem; /* max-w-md */
  margin: 0 auto;
  padding: 1rem 1rem 0.5rem 1rem;
  background: transparent;
  user-select: none;
}



.profile-badge-dot {
  position: absolute;
  bottom: -2.5px;
  right: -2.5px;
  width: 9px;
  height: 9px;
  background-color: #4A9EAA;
  border-radius: 50%;
  border: 1.5px solid #24221f;
  box-shadow: 0 0 6px rgba(74, 158, 170, 0.6);
  animation: pulse-badge 2s infinite ease-in-out;
}

@keyframes pulse-badge {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 4px rgba(74, 158, 170, 0.6);
  }
  50% {
    transform: scale(1.2);
    box-shadow: 0 0 10px rgba(74, 158, 170, 0.9);
  }
}

/* --- Game Progress Indicator (segmented bar) --- */
.game-progress-bar {
  display: flex;
  align-items: stretch;
  flex: 0 0 auto;
  margin: 0 12px;
  height: 26px;
  border: 1.5px solid #fdf4eb;
  border-radius: 2px;
  overflow: hidden;
  background: transparent;
}

.game-progress-segment {
  width: 24px;
  flex-shrink: 0;
  transition: background-color 0.3s ease;
  border-right: 1.5px solid #fdf4eb;
}

.game-progress-segment:last-child {
  border-right: none;
}

.game-progress-segment--completed {
  background-color: #4a6783;
}

.game-progress-segment--current {
  background-color: #4a6783;
}

.game-progress-segment--upcoming {
  background-color: rgba(74, 103, 131, 0.25);
}

/* --- How to Play Slideshow Animations & Custom Dialog --- */
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.25s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

.mini-card {
  position: relative;
  width: 80px;
  height: 112px;
  background-color: #fdf4eb;
  border: 1.5px solid #c4b69d;
  border-radius: 4px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  padding: 6px;
  user-select: none;
  box-sizing: border-box;
}

.mini-card-header {
  width: 24px;
  height: 4px;
  border-radius: 1px;
  margin-bottom: 6px;
  flex-shrink: 0;
}

.mini-card-img {
  width: 100%;
  height: 44px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
  flex-shrink: 0;
}

.mini-card-line {
  height: 3px;
  border-radius: 1px;
  margin-bottom: 4px;
  flex-shrink: 0;
}

.mini-card-line:last-child {
  margin-bottom: 0;
}

.mini-card-real {
  animation: swipeRight 2.2s ease-in-out infinite;
}

.mini-card-fake {
  animation: swipeLeft 2.2s ease-in-out infinite;
}

.mini-card-gacha {
  background-color: #fdf6e3;
  border-color: #d4a843;
  box-shadow: 0 0 15px rgba(212, 168, 67, 0.5);
  animation: floatGlow 3s ease-in-out infinite;
}

@keyframes swipeRight {
  0%, 100% {
    transform: translateX(0) rotate(0deg);
    border-color: #c4b69d;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  50% {
    transform: translateX(24px) rotate(8deg);
    border-color: #177860;
    box-shadow: 0 4px 12px rgba(23, 120, 96, 0.4);
  }
}

@keyframes swipeLeft {
  0%, 100% {
    transform: translateX(0) rotate(0deg);
    border-color: #c4b69d;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  50% {
    transform: translateX(-24px) rotate(-8deg);
    border-color: #bf3c2c;
    box-shadow: 0 4px 12px rgba(191, 60, 44, 0.4);
  }
}

@keyframes floatGlow {
  0%, 100% {
    transform: translateY(0);
    box-shadow: 0 0 12px rgba(212, 168, 67, 0.4);
  }
  50% {
    transform: translateY(-8px);
    box-shadow: 0 0 24px rgba(212, 168, 67, 0.8);
  }
}

.star-particle {
  pointer-events: none;
  font-size: 14px;
}

/* Slide 1 — unique card gently floats (no gold glow; that's the gacha card) */
.mini-card-float {
  animation: floatGentle 3s ease-in-out infinite;
}

@keyframes floatGentle {
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-7px) rotate(2deg); }
}

/* Slide 2 — stars pop in sequence (staggered via inline animation-delay) */
.star-pop {
  animation: starPop 1.8s ease-in-out infinite;
}

@keyframes starPop {
  0%, 100% {
    transform: scale(0.78);
    opacity: 0.45;
  }
  50% {
    transform: scale(1.12);
    opacity: 1;
  }
}

/* Slide 5 — chance hearts pulse in sequence */
.heart-pop {
  animation: heartPop 1.6s ease-in-out infinite;
}

@keyframes heartPop {
  0%, 100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.25);
    opacity: 1;
  }
}

/* Slide 6 — Fact Frenzy tap: a finger that taps with an expanding ripple */
.tap-bob {
  animation: tapBob 1.2s ease-in-out infinite;
}

@keyframes tapBob {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(3px) scale(0.9); }
}

.tap-ripple {
  position: absolute;
  width: 26px;
  height: 26px;
  border-radius: 9999px;
  border: 2px solid #d4a843;
  animation: tapRipple 1.2s ease-out infinite;
}

@keyframes tapRipple {
  0% { transform: scale(0.5); opacity: 0.8; }
  70% { transform: scale(2.1); opacity: 0; }
  100% { transform: scale(2.1); opacity: 0; }
}

/* Slide 7 — collection fan does a celebratory wobble */
.collection-fan {
  animation: celebrateWobble 3s ease-in-out infinite;
  transform-origin: bottom center;
}

@keyframes celebrateWobble {
  0%, 100% { transform: rotate(0deg) translateY(0); }
  25% { transform: rotate(-2deg) translateY(-3px); }
  75% { transform: rotate(2deg) translateY(-3px); }
}

/* Edit Menu Dropdown Options Panel */
.edit-dropdown-menu {
  position: absolute;
  top: 38px;
  right: 0;
  background-color: var(--binder-dropdown-bg, #4a6783);
  border: 1.5px solid var(--binder-dropdown-text, #fdf4eb);
  border-radius: 4px;
  width: 210px;
  z-index: 50;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  pointer-events: auto;
}

.edit-dropdown-item {
  padding: 11px 16px;
  color: var(--binder-dropdown-text, #fdf4eb);
  font-family: var(--font-family-serif, Georgia, serif);
  font-size: 13px;
  font-weight: bold;
  text-align: left;
  cursor: pointer;
  border-bottom: 1px solid rgba(128, 128, 128, 0.25);
  transition: all 0.2s ease;
}

.edit-dropdown-item:hover:not(.color-selection-item) {
  background-color: rgba(255, 255, 255, 0.15);
}

/* If the text color is dark, override hover background and button border */
.edit-dropdown-menu[style*="--binder-dropdown-text:#24221f"] .edit-dropdown-item:hover:not(.color-selection-item),
.edit-dropdown-menu[style*="--binder-dropdown-text: #24221f"] .edit-dropdown-item:hover:not(.color-selection-item) {
  background-color: rgba(0, 0, 0, 0.08);
}

.hidden-color-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}



.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: all 0.2s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>

