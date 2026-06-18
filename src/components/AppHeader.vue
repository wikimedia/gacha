<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore';
import { useGameStore } from '../stores/useGameStore';
import type { Category } from '../stores/useGameStore';
import { supabase } from '../supabase';
import BaseDialog from './BaseDialog.vue';

const props = withDefaults(defineProps<{
  displayedPoints?: number;
  gachaActive?: boolean;
  isAnimating?: boolean;
  activeMainCategory?: Category;
  gameActive?: boolean;
}>(), {
  gachaActive: false,
  isAnimating: false,
  gameActive: false
});

const emit = defineEmits<{
  (e: 'activate'): void;
  (e: 'login-success'): void;
  (e: 'logout'): void;
  (e: 'edit-profile'): void;
  (e: 'quit-game'): void;
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

// Points display fallback to store
const points = computed(() => props.displayedPoints !== undefined ? props.displayedPoints : gameStore.gdPoints);

// Check if viewing own profile
const isOwnProfile = computed(() => {
  if (route.name !== 'profile') return false;
  if (!authStore.isLoggedIn || !authStore.user) return false;
  const profileId = (route.params.id as string) || '';
  if (!profileId) return false;
  return authStore.user.username.toLowerCase() === profileId.toLowerCase() ||
         authStore.user.id.toLowerCase() === profileId.toLowerCase();
});

// Fetch display username from Supabase profile table
const dbUsername = ref<string | null>(null);

const fetchProfileUsername = async () => {
  if (!authStore.isLoggedIn || !authStore.user) {
    dbUsername.value = null;
    return;
  }
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', authStore.user.id)
      .maybeSingle();
    if (!error && data) {
      dbUsername.value = data.username;
    }
  } catch (err) {
    console.error('Failed to fetch profile username:', err);
  }
};

// Re-fetch when auth state changes
watch(() => authStore.isLoggedIn, (loggedIn) => {
  if (loggedIn) {
    fetchProfileUsername();
  } else {
    dbUsername.value = null;
  }
}, { immediate: true });

const displayUsername = computed(() => dbUsername.value || authStore.user?.username || '');



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
    title: '1. Identify Real Articles',
    description: 'Swipe Right (or click Real) if you think the card is a genuine, unedited Wikipedia article.',
  },
  {
    title: '2. Spot the Fakes',
    description: 'Swipe Left (or click Fake) if you think the card contains fabricated facts or details.',
  },
  {
    title: '3. Survive 10 Rounds',
    description: 'Each category game consists of 10 rounds. A single mistake will end the run.',
  },
  {
    title: '4. Claim Your Cards',
    description: 'Earn points to activate the Gacha Drop, where you can tap the globe to acquire real Wikipedia cards for your collection!',
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

watch(showInfoModal, (isOpen) => {
  if (isOpen) {
    currentSlide.value = 0;
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

const confirmQuitGame = () => {
  if (window.confirm("Are you sure you want to quit? Your progress in this run will be lost.")) {
    emit('quit-game');
  }
};

defineExpose({
  openAuthModal() {
    showAuthModal.value = true;
  }
});
</script>

<template>
  <header class="w-full z-40 select-none pointer-events-none sticky top-0">
    <!-- Figma Mock Header (Stacked overlay with icons) -->
    <div class="gacha-header-overlay pointer-events-auto">
      
      <!-- Left: Profile Menu Button / Dropdown OR Exit Button -->
      <div v-if="gameActive" class="z-50">
        <button 
          class="header-icon-btn"
          @click="confirmQuitGame"
          aria-label="Quit Game"
        >
          <!-- 'X' close SVG icon -->
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div v-else class="dropdown dropdown-bottom dropdown-start z-50">
        <label 
          tabindex="0" 
          class="header-icon-btn"
        >
          <!-- User Profile Silhouette icon -->
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </label>
        
        <ul 
          tabindex="0" 
          class="dropdown-content menu p-3 shadow-xl bg-base-100 rounded-box border border-base-300 w-64 mt-2 gap-2 text-sm text-left"
        >
          <!-- User info -->
          <li class="px-4 py-2 border-b border-base-200">
            <div v-if="authStore.isLoggedIn" class="p-0">
              <div class="font-bold text-[10px] text-secondary uppercase tracking-wider">Logged In As</div>
              <div class="font-serif font-black text-primary text-base mt-0.5 truncate">{{ displayUsername }}</div>
            </div>
            <div v-else class="p-0">
              <div class="font-bold text-[10px] text-secondary uppercase tracking-wider">Playing As</div>
              <div class="font-serif font-black text-secondary text-base mt-0.5">Guest Scholar</div>
            </div>
          </li>
          
          <!-- Points tracker -->
          <li class="px-4 py-2 border-b border-base-200">
            <div class="flex justify-between items-center w-full p-0">
              <span class="text-[10px] font-bold text-secondary uppercase tracking-wider">Gacha Points</span>
              <span class="text-xs font-black text-primary" :class="{ 'animate-pulse text-warning': points >= 100 }">{{ points }}/100</span>
            </div>
            <progress 
              class="progress progress-primary w-full h-2 mt-1.5" 
              :value="points" 
              max="100"
            ></progress>
            
            <!-- Activate Gacha Drop Button -->
            <button 
              v-if="points >= 100"
              @click.stop="handleActivateClick"
              class="btn btn-primary btn-xs w-full mt-3 text-[10px] font-black uppercase text-white gacha-gradient-animation select-none shadow hover:scale-105 active:scale-95 transition-transform"
            >
              ⚡ Activate Gacha Drop
            </button>
            <div 
              v-else 
              class="text-[9px] text-secondary text-center mt-2 font-sans font-medium flex items-center justify-center gap-1"
            >
              <span>🔒</span>
              <span>Reach 100 points to unlock Gacha Drop!</span>
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
            <button @click="handleLogout" class="text-error hover:bg-error/10 font-bold py-2 px-3 rounded border-t border-base-200 pt-2 mt-1">
              🚪 Log Out
            </button>
          </li>
        </ul>
      </div>

      <!-- Center: GOTCHA! Serif Title -->
      <router-link 
        to="/" 
        class="font-serif font-black text-xl text-[#fdf4eb] tracking-widest no-underline hover:opacity-85 select-none"
      >
        GOTCHA!
      </router-link>

      <!-- Right: Info Dialog Trigger -->
      <button 
        class="header-icon-btn"
        @click="showInfoModal = true"
      >
        <!-- 'i' info SVG icon -->
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
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
              placeholder="e.g. scholar@moonflower.org"
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

    <!-- INFO HOW TO PLAY DIALOG (Custom BaseDialog) -->
    <BaseDialog 
      :show="showInfoModal" 
      title="How to Play" 
      @close="showInfoModal = false"
    >
      <div class="flex flex-col items-center">
        <!-- Slide illustration container -->
        <div class="w-full h-44 flex items-center justify-center bg-[#eaecf0] border border-[#c4b69d]/40 rounded-sm relative overflow-hidden mb-4 select-none">
          <!-- Slide 1: Real Card Animation -->
          <div v-if="currentSlide === 0" class="illustration-real flex items-center justify-center w-full h-full">
            <div class="mini-card relative w-20 h-28 bg-[#fdf4eb] border border-[#c4b69d] rounded-sm shadow-md flex flex-col justify-between p-1.5 animate-swipe-right">
              <div class="w-full h-2 bg-gray-300 rounded-xs mb-1"></div>
              <div class="w-full h-12 bg-gray-200 rounded-xs flex items-center justify-center text-[8px] text-gray-400">Image</div>
              <div class="w-full h-1 bg-gray-300 rounded-xs mt-1"></div>
              <div class="w-full h-4 bg-gray-200 rounded-xs"></div>
            </div>
            <!-- Swipe arrow pointing right -->
            <div class="absolute right-4 text-[#177860] animate-pulse flex flex-col items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
              <span class="text-[9px] font-bold uppercase tracking-wider mt-0.5">Real</span>
            </div>
          </div>

          <!-- Slide 2: Fake Card Animation -->
          <div v-if="currentSlide === 1" class="illustration-fake flex items-center justify-center w-full h-full">
            <div class="mini-card relative w-20 h-28 bg-[#fdf4eb] border border-[#c4b69d] rounded-sm shadow-md flex flex-col justify-between p-1.5 animate-swipe-left">
              <div class="w-full h-2 bg-gray-300 rounded-xs mb-1"></div>
              <div class="w-full h-12 bg-gray-200 rounded-xs flex items-center justify-center text-[8px] text-gray-400">Image</div>
              <div class="w-full h-1 bg-gray-300 rounded-xs mt-1"></div>
              <div class="w-full h-4 bg-gray-200 rounded-xs"></div>
            </div>
            <!-- Swipe arrow pointing left -->
            <div class="absolute left-4 text-[#bf3c2c] animate-pulse flex flex-col items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
              <span class="text-[9px] font-bold uppercase tracking-wider mt-0.5">Fake</span>
            </div>
          </div>

          <!-- Slide 3: Survive 10 Rounds Animation -->
          <div v-if="currentSlide === 2" class="illustration-rounds flex flex-col items-center justify-center w-full h-full gap-3">
            <div class="text-3xl font-serif font-black text-[#4a6783] tracking-widest animate-pulse">
              Round 7 / 10
            </div>
            <div class="w-40 h-2 bg-gray-300 rounded-full overflow-hidden">
              <div class="h-full bg-[#4a6783] transition-all duration-500" style="width: 70%"></div>
            </div>
            <span class="text-[10px] text-gray-500 uppercase tracking-widest font-sans animate-bounce">⚡ Hardcore: 1 mistake Ends Run</span>
          </div>

          <!-- Slide 4: Gacha Card Glow Animation -->
          <div v-if="currentSlide === 3" class="illustration-gacha flex items-center justify-center w-full h-full">
            <div class="mini-card relative w-20 h-28 bg-[#fdf6e3] border-2 border-[#d4a843] rounded-sm shadow-[0_0_15px_rgba(212,168,67,0.6)] flex flex-col justify-between p-1.5 animate-float-glow">
              <div class="w-full h-2 bg-[#d4a843]/40 rounded-xs mb-1"></div>
              <div class="w-full h-12 bg-[#fdf4eb] rounded-xs flex items-center justify-center text-[8px] text-[#b8912e] font-serif font-bold">★ ★ ★ ★ ★</div>
              <div class="w-full h-1 bg-[#d4a843]/40 rounded-xs mt-1"></div>
              <div class="w-full h-4 bg-[#fdf4eb] rounded-xs"></div>
            </div>
            <!-- Star particle decorations -->
            <div class="star-particle absolute top-8 left-16 text-[#d4a843] animate-ping">★</div>
            <div class="star-particle absolute bottom-8 right-16 text-[#d4a843] animate-ping" style="animation-delay: 0.5s">★</div>
          </div>
        </div>

        <!-- Slide details -->
        <h4 class="font-serif font-bold text-base text-[#3f3f35] text-center mb-1 w-full">
          {{ slides[currentSlide].title }}
        </h4>
        <p class="text-xs text-[#54595d] text-center leading-relaxed font-sans px-2 mb-6 min-h-[3rem] w-full">
          {{ slides[currentSlide].description }}
        </p>

        <!-- Navigation controller -->
        <div class="flex items-center justify-between w-full px-2 mt-auto">
          <!-- Prev button -->
          <button 
            @click="prevSlide"
            class="w-8 h-8 flex items-center justify-center border border-[#c4b69d]/40 text-[#54595d] hover:bg-black/5 active:scale-95 transition-all rounded-xs"
            :disabled="currentSlide === 0"
            :class="{ 'opacity-20 pointer-events-none': currentSlide === 0 }"
            aria-label="Previous step"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          <!-- Step indicator dots -->
          <div class="flex gap-2">
            <button 
              v-for="(_, index) in slides" 
              :key="index"
              @click="currentSlide = index"
              class="w-2.5 h-2.5 rounded-full transition-all"
              :class="currentSlide === index ? 'bg-[#4a6783] scale-110' : 'bg-gray-300 hover:bg-gray-400'"
              :aria-label="'Go to step ' + (index + 1)"
            ></button>
          </div>

          <!-- Next button or "Done" -->
          <button 
            @click="currentSlide === slides.length - 1 ? showInfoModal = false : nextSlide()"
            class="h-8 px-3 flex items-center justify-center border border-[#c4b69d]/40 text-[#54595d] hover:bg-black/5 active:scale-95 transition-all text-xs font-bold uppercase tracking-wider rounded-xs"
            aria-label="Next step"
          >
            <span v-if="currentSlide === slides.length - 1">Done</span>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>
    </BaseDialog>

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

.header-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: 1.5px solid #fdf4eb;
  border-radius: 2px;
  color: #fdf4eb;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: opacity 0.2s ease;
}

.header-icon-btn:hover {
  opacity: 0.8;
}

/* --- How to Play Slideshow Animations --- */
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

.animate-swipe-right {
  animation: swipeRight 2.2s ease-in-out infinite;
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

.animate-swipe-left {
  animation: swipeLeft 2.2s ease-in-out infinite;
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

.animate-float-glow {
  animation: floatGlow 3s ease-in-out infinite;
}

.star-particle {
  pointer-events: none;
  font-size: 14px;
}
</style>

