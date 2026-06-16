<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore';
import { useGameStore } from '../stores/useGameStore';
import type { Category } from '../stores/useGameStore';
import { supabase } from '../supabase';

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

    <!-- INFO HOW TO PLAY DIALOG / MODAL (DaisyUI Dialog Modal) -->
    <dialog class="modal modal-bottom sm:modal-middle" :class="{ 'modal-open': showInfoModal }">
      <div class="modal-box bg-base-100 border border-base-300 p-6 shadow-2xl relative text-left">
        <!-- Close button -->
        <button 
          @click="showInfoModal = false" 
          class="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
        >
          ✕
        </button>

        <h3 class="font-serif text-lg font-bold border-b border-base-300 pb-2 text-primary">
          How to Play GOTCHA!
        </h3>
        
        <div class="text-xs text-base-content mt-4 space-y-4 font-sans leading-relaxed">
          <p>
            Welcome to <strong>Moonflower Wikipedia Gacha</strong>! Test your knowledge of the strange and historical by identifying which Wikipedia entries are real and which have been subtly altered ("fakes").
          </p>
          <div class="space-y-2.5">
            <div class="flex items-start gap-2">
              <span class="text-primary font-bold">1.</span>
              <span><strong>Swipe Right (or click Real)</strong> if you think the card is a genuine, unedited Wikipedia article.</span>
            </div>
            <div class="flex items-start gap-2">
              <span class="text-primary font-bold">2.</span>
              <span><strong>Swipe Left (or click Fake)</strong> if you think the card contains fabricated facts or details.</span>
            </div>
            <div class="flex items-start gap-2">
              <span class="text-primary font-bold">3.</span>
              <span>Each category game consists of <strong>10 rounds</strong>. A single mistake will end the run.</span>
            </div>
            <div class="flex items-start gap-2">
              <span class="text-primary font-bold">4.</span>
              <span>Correct answers earn you <strong>Gacha Points</strong>. Reach 100 points to activate the <strong>Gacha Drop</strong>, where you can tap the globe to acquire real Wikipedia cards for your collection!</span>
            </div>
          </div>
        </div>

        <button 
          @click="showInfoModal = false"
          class="btn btn-primary btn-sm w-full font-bold uppercase mt-6 text-white"
        >
          Got it!
        </button>
      </div>

      <form method="dialog" class="modal-backdrop" @click="showInfoModal = false">
        <button>close</button>
      </form>
    </dialog>

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
</style>

