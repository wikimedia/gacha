<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '../stores/useAuthStore';
import { useGameStore } from '../stores/useGameStore';
import { CdxDialog } from '@wikimedia/codex';

const props = withDefaults(defineProps<{
  displayedPoints?: number;
  gachaActive?: boolean;
}>(), {
  gachaActive: false
});

const emit = defineEmits<{
  (e: 'activate'): void;
  (e: 'login-success'): void;
  (e: 'logout'): void;
}>();

const authStore = useAuthStore();
const gameStore = useGameStore();

// Points display fallback to store
const points = computed(() => props.displayedPoints !== undefined ? props.displayedPoints : gameStore.gdPoints);

// Auth modal state
const showAuthModal = ref(false);
const authEmail = ref('');
const otpCode = ref('');
const otpSent = ref(false);
const isVerifying = ref(false);

// Lock shaking micro-interaction state
const isLockShaking = ref(false);

const triggerLockShake = () => {
  if (isLockShaking.value) return;
  isLockShaking.value = true;
  setTimeout(() => {
    isLockShaking.value = false;
  }, 400);
};

// Supabase OTP Email Auth flow simulations
const handleSendOtp = () => {
  if (!authEmail.value.trim() || !authEmail.value.includes('@')) return;
  
  isVerifying.value = true;
  setTimeout(() => {
    otpSent.value = true;
    isVerifying.value = false;
  }, 600);
};

const handleVerifyOtp = () => {
  if (!otpCode.value.trim() || otpCode.value.trim().length < 6) return;
  
  authStore.login(authEmail.value.trim());
  showAuthModal.value = false;
  
  // Clear states
  authEmail.value = '';
  otpCode.value = '';
  otpSent.value = false;
  
  emit('login-success');
};

const handleLogout = () => {
  authStore.logout();
  emit('logout');
};
</script>

<template>
  <header class="sticky top-0 z-40">
    <!-- Standard Gacha Teaser Header: active during navigation & games -->
    <div 
      v-if="!gachaActive"
      class="gacha-tease-container bg-white border-b border-[#a2a9b1] px-3 py-2 flex items-center justify-between gap-3 shadow-sm select-none"
      :class="{ 'gacha-tease-container--unlocked': points >= 100 }"
    >
      <!-- Left: Brand Title & Dynamic Microcopy -->
      <router-link to="/" class="flex flex-col text-left leading-tight min-w-0 flex-shrink no-underline hover:opacity-85">
        <span class="font-serif font-extrabold text-[12px] text-black tracking-tight leading-none">Moonflower</span>
        <div class="flex items-center text-[9px] font-sans font-bold mt-0.5 min-w-0">
          <span v-if="points < 100" class="text-wiki-muted truncate">
            {{ 100 - points }} Points to Gacha
          </span>
          <span v-else class="text-wiki-blue uppercase tracking-wider truncate">
            ★ Ready!
          </span>
        </div>
      </router-link>

      <!-- Middle: Segmented Static Goal Tracker (10 flat blocks) -->
      <div class="flex-grow flex items-center h-2 max-w-[140px] min-w-[50px] gap-0.5" role="img" aria-label="Gacha Drop progress blocks">
        <div 
          class="flex-grow h-full rounded-[1px] transition-colors duration-200"
          v-for="i in 10" 
          :key="i"
          :class="[
            points >= i * 10 
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
            v-if="points >= 100"
            @click="emit('activate')"
            class="w-full text-center flex items-center justify-center py-0.5 px-0.5 text-[9px] rounded-sm transition-all duration-200 min-h-[24px] btn-activate-excited select-none focus:outline-none"
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
      <router-link to="/" class="flex items-center gap-1.5 no-underline hover:opacity-85">
        <div class="w-5 h-5 rounded-full border border-[#a2a9b1] flex items-center justify-center bg-[#eaecf0] font-serif text-[11px] text-black font-bold">
          W
        </div>
        <span class="text-xs font-bold font-serif text-black leading-none">Moonflower</span>
      </router-link>
      <span class="text-[9px] text-wiki-muted font-sans uppercase font-bold tracking-wider">
        Gacha drop mode
      </span>
    </div>

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
  </header>
</template>

<style scoped>
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
