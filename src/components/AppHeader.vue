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
  PhPencilSimple
} from '@phosphor-icons/vue';

const props = withDefaults(defineProps<{
  displayedPoints?: number;
  gachaActive?: boolean;
  isAnimating?: boolean;
  activeMainCategory?: Category;
  gameActive?: boolean;
  binderColor?: string;
}>(), {
  gachaActive: false,
  isAnimating: false,
  gameActive: false,
  binderColor: '#4a6783'
});

const emit = defineEmits<{
  (e: 'activate'): void;
  (e: 'login-success'): void;
  (e: 'logout'): void;
  (e: 'edit-profile'): void;
  (e: 'quit-game'): void;
  (e: 'edit-profile-field', field: 'username' | 'bio' | 'showcase'): void;
  (e: 'update-binder-color', color: string): void;
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

const displayUsername = computed(() => authStore.user?.username || '');



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

const confirmQuitGame = () => {
  if (window.confirm("Are you sure you want to quit? Your progress in this run will be lost.")) {
    emit('quit-game');
  }
};

const showHeaderEditDropdown = ref(false);

const binderColorsList = [
  { name: 'Classic Blue', hex: '#4a6783' },
  { name: 'Sage Green', hex: '#829466' },
  { name: 'Terracotta', hex: '#d9754b' },
  { name: 'Plum Rose', hex: '#917D8A' },
  { name: 'Charcoal', hex: '#3f3f35' },
  { name: 'Warm Sand', hex: '#bda380' }
];

const handleEditClick = (field: 'username' | 'bio' | 'showcase') => {
  showHeaderEditDropdown.value = false;
  emit('edit-profile-field', field);
};

const handleColorClick = (color: string) => {
  emit('update-binder-color', color);
};

const getContrastTextColor = (hexColor?: string) => {
  if (!hexColor) return '#fdf4eb';
  const color = hexColor.startsWith('#') ? hexColor.slice(1) : hexColor;
  if (color.length !== 6) return '#fdf4eb';
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  return y > 150 ? '#24221f' : '#fdf4eb';
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
          <!-- 'X' close Phosphor icon -->
          <PhX :size="18" weight="bold" />
        </button>
      </div>
      <div v-else class="dropdown dropdown-bottom dropdown-start z-50">
        <label 
          tabindex="0" 
          class="header-icon-btn"
        >
          <!-- User Profile Silhouette icon -->
          <PhUser :size="18" weight="bold" />
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

      <!-- Right: Info Dialog Trigger OR Edit pencil dropdown -->
      <div v-if="route.name === 'profile' && isOwnProfile" class="relative z-50">
        <button 
          class="header-icon-btn"
          @click="showHeaderEditDropdown = !showHeaderEditDropdown"
          aria-label="Edit Profile Options"
          :class="{ 'header-icon-btn--active': showHeaderEditDropdown }"
        >
          <PhPencilSimple :size="18" weight="bold" />
        </button>

        <!-- EDIT DROPDOWN MENU -->
        <transition name="dropdown-fade">
          <div 
            v-if="showHeaderEditDropdown" 
            class="edit-dropdown-menu" 
            :style="{ 
              '--binder-dropdown-bg': binderColor,
              '--binder-dropdown-text': getContrastTextColor(binderColor)
            }"
          >
            <div class="edit-dropdown-item" @click="handleEditClick('username')">
              Edit Name
            </div>
            <div class="edit-dropdown-item" @click="handleEditClick('bio')">
              Edit Description
            </div>
            <div class="edit-dropdown-item" @click="handleEditClick('showcase')">
              Change Showcase
            </div>
            <div class="edit-dropdown-item color-selection-item">
              <div class="text-[10px] uppercase font-bold tracking-wider mb-2 opacity-80">Change Binder Color</div>
              <div class="flex gap-2 flex-wrap">
                <button 
                  v-for="color in binderColorsList" 
                  :key="color.hex"
                  @click="handleColorClick(color.hex)"
                  class="w-6 h-6 rounded-full border-2 transition-all hover:scale-110 cursor-pointer"
                  :class="[binderColor === color.hex ? 'border-[#fdf4eb] scale-105' : 'border-transparent']"
                  :style="{ backgroundColor: color.hex }"
                  :title="color.name"
                ></button>
              </div>
            </div>
          </div>
        </transition>
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

          <!-- Middle: Illustration + Text -->
          <div class="flex-grow flex flex-col items-center justify-center w-full max-w-sm mx-auto my-auto py-2">
            <!-- Slide illustration container -->
            <div class="w-full max-w-[246px] h-[229px] flex items-center justify-center bg-[#eaecf0]/10 border border-[#c4b69d]/20 rounded-md relative overflow-hidden select-none">
              <!-- Slide 1: Real Card Animation -->
              <div v-if="currentSlide === 0" class="flex items-center justify-center w-full h-full relative">
                <div class="mini-card mini-card-real">
                  <div class="mini-card-header bg-[#4a6783]"></div>
                  <div class="mini-card-img bg-slate-200">
                    <PhMonitor :size="20" weight="regular" color="#718096" />
                  </div>
                  <div class="mini-card-line w-full bg-slate-300"></div>
                  <div class="mini-card-line w-5/6 bg-slate-300"></div>
                  <div class="mini-card-line w-2/3 bg-slate-300"></div>
                  <div class="real-badge font-sans font-black uppercase text-[8px] tracking-wider text-[#177860] border border-[#177860] px-1 py-0.5 rounded bg-[#fdf4eb] shadow-md absolute top-12 left-1/2 -translate-x-1/2 rotate-[-12deg] flex items-center gap-0.5">
                    ✓ Real
                  </div>
                </div>
                <!-- Swipe arrow pointing right -->
                <div class="absolute right-3 text-[#177860]/80 animate-pulse flex flex-col items-center select-none">
                  <PhArrowRight :size="24" weight="bold" />
                  <span class="text-[8px] font-bold uppercase tracking-wider mt-0.5">Real</span>
                </div>
              </div>

              <!-- Slide 2: Fake Card Animation -->
              <div v-if="currentSlide === 1" class="flex items-center justify-center w-full h-full relative">
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

              <!-- Slide 3: Survive 10 Rounds Animation -->
              <div v-if="currentSlide === 2" class="flex flex-col items-center justify-center w-full h-full gap-3 select-none">
                <div class="bg-[#fdf4eb] border border-[#c4b69d] rounded-sm shadow-md p-3 flex flex-col items-center w-36 gap-2">
                  <div class="text-[10px] font-serif font-black text-[#4a6783] tracking-wider uppercase">
                    Round 7 / 10
                  </div>
                  <div class="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div class="h-full bg-[#4a6783] rounded-full" style="width: 70%"></div>
                  </div>
                  <div class="text-[8px] text-[#bf3c2c] font-black uppercase tracking-wide flex items-center gap-1 mt-0.5">
                    ⚡ 1 mistake ends run
                  </div>
                </div>
              </div>

              <!-- Slide 4: Gacha Card Glow Animation -->
              <div v-if="currentSlide === 3" class="flex items-center justify-center w-full h-full relative">
                <div class="mini-card mini-card-gacha">
                  <div class="mini-card-header bg-[#d4a843]"></div>
                  <div class="mini-card-img bg-[#fdf6e3] text-[#d4a843] flex items-center justify-center font-serif font-black text-[8px]">
                    ★★★★★
                  </div>
                  <div class="mini-card-line w-full bg-[#d4a843]/30"></div>
                  <div class="mini-card-line w-5/6 bg-[#d4a843]/30"></div>
                  <div class="mini-card-line w-2/3 bg-[#d4a843]/30"></div>
                </div>
                <!-- Star particle decorations -->
                <div class="star-particle absolute top-8 left-16 text-[#d4a843] animate-ping">★</div>
                <div class="star-particle absolute bottom-8 right-16 text-[#d4a843] animate-ping" style="animation-delay: 0.5s">★</div>
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

.color-selection-item {
  cursor: default;
  border-bottom: none;
  background-color: rgba(0, 0, 0, 0.1);
  padding: 12px 16px;
}

.header-icon-btn--active {
  background-color: var(--binder-dropdown-text, #fdf4eb) !important;
  color: var(--binder-dropdown-bg, #4a6783) !important;
  border-color: var(--binder-dropdown-text, #fdf4eb) !important;
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

