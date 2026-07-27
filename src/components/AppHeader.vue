<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore';
import { useGameStore } from '../stores/useGameStore';
import type { Category } from '../stores/useGameStore';
import AppIcon from './AppIcon.vue';
import {
  cdxIconClose,
  cdxIconUserAvatarOutline,
  cdxIconInfo,
  cdxIconShare,
  cdxIconBook,
  cdxIconHand,
  cdxIconHelp,
  cdxIconHeartOutline,
  cdxIconMagicWand
} from '@wikimedia/codex-icons';
import BaseSheet from './BaseSheet.vue';
import CreditsSheet from './CreditsSheet.vue';

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
const showCreditsModal = ref(false);
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
          <AppIcon :icon="cdxIconClose" :size="18" />
        </button>
      </div>
      <div v-else-if="route.name === 'profile'" class="z-50">
        <router-link 
          to="/"
          class="header-icon-btn"
          aria-label="Back to Home"
        >
          <!-- 'X' close Phosphor icon -->
          <AppIcon :icon="cdxIconClose" :size="18" />
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
          <AppIcon :icon="cdxIconUserAvatarOutline" :size="18" />
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
            'game-progress-segment--upcoming': i >= currentRound
          }"
        />
      </div>
      <router-link 
        v-else
        to="/" 
        class="font-serif font-normal text-[26px] leading-9 text-ink no-underline hover:opacity-85 select-none"
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
          <AppIcon :icon="cdxIconShare" :size="18" />
        </button>
      </div>
      <button
        v-else
        class="header-icon-btn"
        @click="showCreditsModal = true"
        aria-label="Credits & attribution"
      >
        <AppIcon :icon="cdxIconInfo" :size="18" />
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
          Sign In to Collect Cards
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

    <!-- HOW TO PLAY — single-frame tutorial in a bottom sheet -->
    <BaseSheet
      :open="showInfoModal"
      title="How to Play"
      @close="showInfoModal = false"
    >
      <div class="tutorial">
        <!-- Card fan illustration (cards + Fact/Fake badges baked in) -->
        <img
          src="/tutorial.png"
          alt="Example real and fake article cards"
          class="tutorial-cards"
        />

        <ul class="tutorial-steps">
          <li class="tutorial-step">
            <span class="tutorial-step-icon">
              <AppIcon :icon="cdxIconBook" :size="18" />
            </span>
            <span class="tutorial-step-text">Collect real Wikipedia articles</span>
          </li>
          <li class="tutorial-step">
            <span class="tutorial-step-icon">
              <AppIcon :icon="cdxIconHand" :size="18" />
            </span>
            <span class="tutorial-step-text">Swipe right for facts and left for fakes</span>
          </li>
          <li class="tutorial-step">
            <span class="tutorial-step-icon">
              <AppIcon :icon="cdxIconHelp" :size="18" />
            </span>
            <span class="tutorial-step-text">Every fake card has a clue</span>
          </li>
          <li class="tutorial-step">
            <span class="tutorial-step-icon">
              <AppIcon :icon="cdxIconHeartOutline" :size="18" />
            </span>
            <span class="tutorial-step-text">You get 3 lives total</span>
          </li>
          <li class="tutorial-step">
            <span class="tutorial-step-icon">
              <AppIcon :icon="cdxIconMagicWand" :size="18" />
            </span>
            <span class="tutorial-step-text">Only one version of each card exists</span>
          </li>
        </ul>

        <button class="tutorial-start" @click="showInfoModal = false">
          Start
        </button>
      </div>
    </BaseSheet>

    <!-- CREDITS / ATTRIBUTION BOTTOM SHEET (opened from the info button) -->
    <CreditsSheet
      :open="showCreditsModal"
      :category="activeMainCategory"
      @close="showCreditsModal = false"
    />

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
  padding: 1rem;
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
  border: 1.5px solid var(--color-ink);
  border-radius: 4px;
  overflow: hidden;
  background: transparent;
}

.game-progress-segment {
  width: 24px;
  flex-shrink: 0;
  transition: background-color 0.3s ease;
  border-right: 1.5px solid var(--color-ink);
}

.game-progress-segment:last-child {
  border-right: none;
}

.game-progress-segment--completed {
  background-color: #4a6783;
}

.game-progress-segment--upcoming {
  background-color: rgba(74, 103, 131, 0.25);
}

/* --- How to Play tutorial (rendered inside BaseSheet) --- */
.tutorial {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 8px 24px 24px;
}

/* Card fan illustration (cards + Fact/Fake badges baked into the export) */
.tutorial-cards {
  width: 292px;
  max-width: 100%;
  height: auto;
  user-select: none;
  -webkit-user-drag: none;
}

.tutorial-steps {
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tutorial-step {
  display: flex;
  align-items: center;
  gap: 16px;
}

.tutorial-step-icon {
  /* Warm tan chip that lifts the icon off the sheet's paper background. */
  --tutorial-icon-bg: #e5d8c6;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background-color: var(--tutorial-icon-bg);
  color: var(--color-ink);
}

.tutorial-step-text {
  flex: 1 0 0;
  min-width: 0;
  font-family: var(--font-sans);
  font-weight: 400;
  font-size: 14px;
  line-height: 22px;
  color: var(--color-ink);
}

.tutorial-start {
  width: 100%;
  height: 44px;
  border: none;
  border-radius: var(--radius-button);
  background-color: var(--color-rust);
  color: var(--color-white);
  font-family: var(--font-serif);
  font-weight: 700;
  font-size: 14px;
  line-height: 20px;
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.1s ease;
}

.tutorial-start:hover { background-color: var(--color-rust-dark); }
.tutorial-start:active { transform: scale(0.98); }


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
  font-family: var(--font-serif);
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

