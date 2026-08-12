<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore';
import { useGameStore } from '../stores/useGameStore';
import { MAX_LIVES, type Category } from '../stores/useGameStore';
import AppIcon from './AppIcon.vue';
import {
  cdxIconClose,
  cdxIconUserAvatarOutline,
  cdxIconInfo,
  cdxIconShare,
  cdxIconPrevious,
  cdxIconHeart,
  cdxIconHeartOutline
} from '@wikimedia/codex-icons';
import InstructionsBody from './InstructionsBody.vue';
import CreditsSheet from './CreditsSheet.vue';
import BaseSheet from './BaseSheet.vue';

const props = withDefaults(defineProps<{
  displayedPoints?: number;
  gachaActive?: boolean;
  isAnimating?: boolean;
  activeMainCategory?: Category;
  gameActive?: boolean;
  resultsActive?: boolean;
  binderColor?: string;
  currentRound?: number;
  totalRounds?: number;
  lives?: number;
}>(), {
  gachaActive: false,
  isAnimating: false,
  gameActive: false,
  resultsActive: false,
  binderColor: '#4a6783',
  currentRound: 1,
  totalRounds: 10,
  lives: MAX_LIVES
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
    <div class="gacha-header-overlay pointer-events-auto" :class="{ 'gacha-header-overlay--solid': gachaActive }">
      
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

      <!-- Center: title (hidden during a game run) -->
      <router-link
        v-if="!gameActive"
        to="/"
        class="font-serif font-normal text-[26px] leading-9 text-ink no-underline hover:opacity-85 select-none"
      >
        World of Wikipedia
      </router-link>

      <!-- Right: in-game status (round counter + lives) OR share / info -->
      <div v-if="gameActive" class="game-status-group">
        <!-- Round counter: deck icon + "current / total" -->
        <div class="game-status-box">
          <img class="deck-icon" src="/cards.svg" width="18" height="18" alt="" aria-hidden="true" />
          <span class="game-counter">{{ currentRound }} / {{ totalRounds }}</span>
        </div>
        <!-- Lives remaining -->
        <div class="game-status-box game-status-box--lives" :aria-label="`${lives} of ${MAX_LIVES} lives remaining`">
          <span
            v-for="n in MAX_LIVES"
            :key="n"
            class="life-heart"
            :class="{ 'life-heart--lost': n <= MAX_LIVES - lives }"
          >
            <AppIcon :icon="n <= MAX_LIVES - lives ? cdxIconHeartOutline : cdxIconHeart" :size="18" />
          </span>
        </div>
      </div>
      <div v-else-if="route.name === 'profile'" class="relative z-50">
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
        v-else-if="!resultsActive"
        class="header-icon-btn"
        @click="showCreditsModal = true"
        aria-label="Credits & attribution"
      >
        <AppIcon :icon="cdxIconInfo" :size="18" />
      </button>
      <!-- Results screen: no info button, but keep a spacer so the title stays centered -->
      <div v-else class="header-icon-spacer" aria-hidden="true"></div>

    </div>

    <!-- AUTHENTICATION SHEET (standard bottom sheet) -->
    <BaseSheet :open="showAuthModal" title="Sign In to Collect Cards" @close="closeModal">
      <div class="px-4 pb-4 text-left">
        <p class="m-0 mb-4 text-sm leading-body text-secondary font-light">
          By authenticating with your email, you agree to have your account data, including your binder items and points, saved in the cloud across all devices.
        </p>

        <!-- Error Notice Block -->
        <div v-if="authError" class="auth-sheet__error mb-4 text-xs font-semibold">
          ⚠️ {{ authError }}
        </div>

        <!-- Step 1: Request Sign-In Link -->
        <form v-if="!otpSent" @submit.prevent="handleSendOtp" class="flex flex-col gap-4">
          <label class="flex flex-col gap-1">
            <span class="text-xs font-bold uppercase text-secondary">Email Address</span>
            <input
              v-model="authEmail"
              type="email"
              placeholder="e.g. scholar@wikipedia.org"
              required
              class="input input-bordered w-full input-sm font-sans"
            >
          </label>

          <button
            type="submit"
            :disabled="isVerifying"
            class="btn btn-primary btn-sm w-full font-bold uppercase text-white"
          >
            <span v-if="isVerifying" class="loading loading-spinner loading-xs"></span>
            {{ isVerifying ? 'Sending Link...' : 'Send Sign-Up Link' }}
          </button>
        </form>

        <!-- Step 2: Link Sent Status -->
        <div v-else class="flex flex-col gap-4">
          <div class="auth-sheet__status text-sm leading-body text-ink">
            <p class="m-0 mb-2">We've sent a magic sign-in link to <strong class="text-primary">{{ authEmail }}</strong>.</p>
            <p class="m-0 mb-2">Please check your inbox (and spam folder) and click the link to log in.</p>
            <p class="m-0 text-secondary">Once you click the link, you will be automatically logged in here, and this window will update.</p>
          </div>

          <div class="flex justify-between text-xs">
            <button
              type="button"
              @click="otpSent = false"
              class="text-primary font-semibold no-underline hover:underline"
            >
              ← Change email
            </button>
            <button
              type="button"
              @click="handleSendOtp"
              class="text-primary font-semibold no-underline hover:underline"
            >
              Resend email
            </button>
          </div>

          <button
            type="button"
            @click="closeModal"
            class="btn btn-outline btn-sm w-full font-bold uppercase"
          >
            Close Window
          </button>
        </div>
      </div>
    </BaseSheet>

    <!-- HOW TO PLAY — full-screen modal shown once on the first game (Rules
         heading + Start button). The footer's "Rules" link shows the same
         content in a bottom sheet instead (see AppFooter). -->
    <Teleport to="body">
      <Transition name="dialog-fade">
        <div
          v-if="showInfoModal"
          class="rules-modal"
          role="dialog"
          aria-modal="true"
          aria-label="How to play"
        >
          <button
            class="rules-modal__back"
            aria-label="Close How to Play"
            @click="showInfoModal = false"
          >
            <AppIcon :icon="cdxIconPrevious" :size="18" />
          </button>
          <div class="rules-modal__content">
            <InstructionsBody
              show-heading
              show-start-button
              @start="showInfoModal = false"
            />
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- CREDITS / ATTRIBUTION BOTTOM SHEET (opened from the info button) -->
    <CreditsSheet
      :open="showCreditsModal"
      :category="activeMainCategory"
      @close="showCreditsModal = false"
    />

  </header>
</template>

<style scoped>
/* Authentication sheet content blocks */
.auth-sheet__error {
  padding: 12px;
  border-radius: var(--radius-base);
  background-color: rgba(191, 60, 44, 0.1);
  border: 1px solid var(--color-red);
  color: var(--color-red);
}

.auth-sheet__status {
  padding: 16px;
  border-radius: var(--radius-base);
  background-color: var(--color-surface-subtle);
  border: 1px solid var(--color-border-neutral);
}

.gacha-header-overlay {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 28rem; /* max-w-md */
  margin: 0 auto;
  padding: 1rem 1rem 0rem 1rem;
  background: transparent;
  user-select: none;
}

/* On scrollable screens (gacha results), the sticky header needs an opaque
   background so content scrolling underneath is occluded rather than showing
   through. Matches the page background (--color-sand). */
.gacha-header-overlay--solid {
  background-color: var(--color-sand);
}

/* Invisible stand-in for the right-hand icon button, matching header-icon-btn
   size (32×32) so the centered title doesn't shift when the button is hidden. */
.header-icon-spacer {
  width: 32px;
  height: 32px;
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

/* --- In-game status (round counter + lives) --- */
.game-status-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.game-status-box {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 8px;
  box-sizing: border-box;
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-button);
  background: transparent;
  color: var(--color-ink);
}

.game-counter {
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 20px;
  color: var(--color-ink);
  white-space: nowrap;
}

.deck-icon {
  flex-shrink: 0;
}

.game-status-box--lives {
  gap: 6px;
}

/* Heart colour is meaningful only to this component (matches the mock). */
.life-heart {
  --color-heart: #a56553;
  display: inline-flex;
  color: var(--color-heart);
}

.life-heart--lost {
  color: var(--color-ink);
  opacity: 0.25;
}

/* --- How to Play modal (full-screen; content shared via InstructionsBody) --- */
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.25s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

.rules-modal {
  position: fixed;
  inset: 0;
  z-index: 60;
  background-color: var(--color-sand);
  display: flex;
  flex-direction: column;
  /* Short screens must scroll to reach the Start button. */
  overflow-y: auto;
}

.rules-modal__content {
  width: 100%;
  max-width: 28rem; /* match the app content column */
  margin: auto; /* center vertically within the viewport */
}

.rules-modal__back {
  /* Fixed: keeps its position when the content scrolls. */
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 9999px;
  background: transparent;
  color: var(--color-ink);
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.1s ease;
}

.rules-modal__back:hover { background-color: rgba(0, 0, 0, 0.06); }
.rules-modal__back:active { transform: scale(0.9); }

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

