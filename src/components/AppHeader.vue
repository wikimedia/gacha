<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '../stores/useAuthStore';
import { useGameStore } from '../stores/useGameStore';

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
const authError = ref('');

// Lock shaking micro-interaction state
const isLockShaking = ref(false);

const triggerLockShake = () => {
  if (isLockShaking.value) return;
  isLockShaking.value = true;
  setTimeout(() => {
    isLockShaking.value = false;
  }, 400);
};

const closeModal = () => {
  showAuthModal.value = false;
  otpSent.value = false;
  authEmail.value = '';
  otpCode.value = '';
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
    authError.value = err.message || 'Failed to send verification passcode.';
  } finally {
    isVerifying.value = false;
  }
};

const handleVerifyOtp = async () => {
  if (!otpCode.value.trim() || otpCode.value.trim().length < 6) return;
  
  isVerifying.value = true;
  authError.value = '';
  try {
    await authStore.verifyOtp(authEmail.value.trim(), otpCode.value.trim());
    closeModal();
    emit('login-success');
  } catch (err: any) {
    authError.value = err.message || 'Invalid passcode or authentication failure.';
  } finally {
    isVerifying.value = false;
  }
};

defineExpose({
  openAuthModal() {
    showAuthModal.value = true;
  }
});
</script>

<template>
  <header class="sticky top-0 z-40">
    <!-- Standard Gacha Teaser Header: active during navigation & games -->
    <div 
      v-if="!gachaActive"
      class="navbar bg-base-100 border-b border-base-300 px-4 py-2 shadow-sm select-none gap-2 justify-between flex-nowrap"
      :class="{ 'border-primary bg-primary/5': points >= 100 }"
    >
      <!-- Left: Brand Title & Dynamic Microcopy -->
      <router-link to="/" class="flex flex-col text-left leading-none flex-shrink min-w-0 no-underline hover:opacity-85">
        <span class="font-serif font-black text-sm text-primary tracking-tight">Moonflower</span>
        <div class="text-[9px] font-sans font-bold mt-1 min-w-0">
          <span v-if="points < 100" class="text-secondary truncate">
            {{ 100 - points }} Points to Gacha
          </span>
          <span v-else class="text-primary uppercase tracking-wider font-extrabold truncate">
            ★ Ready!
          </span>
        </div>
      </router-link>

      <!-- Middle: Segmented/Continuous Goal Tracker (DaisyUI Progress) -->
      <div class="flex-grow flex justify-center max-w-[140px] min-w-[50px]" role="img" aria-label="Gacha Drop progress">
        <progress 
          class="progress progress-primary w-full h-3 border border-base-300 rounded" 
          :value="points" 
          max="100"
        ></progress>
      </div>

      <!-- Right: Action Button & Login/Profile Group -->
      <div class="flex items-center gap-2 flex-shrink-0">
        <!-- Gacha Action Button -->
        <div class="w-[85px]">
          <!-- Active progressive primary button styled like Log In but excited -->
          <button 
            v-if="points >= 100"
            @click="emit('activate')"
            class="btn btn-primary btn-xs w-full text-[9px] font-black uppercase text-white gacha-gradient-animation select-none shadow hover:scale-105 active:scale-95 transition-transform"
          >
            ⚡ Activate
          </button>
          
          <!-- Disabled locked state button -->
          <button 
            v-else
            @click="triggerLockShake"
            class="btn btn-neutral btn-outline btn-xs w-full text-[9px] flex items-center justify-center gap-1 select-none opacity-60 cursor-not-allowed"
          >
            <span 
              class="inline-block transition-transform duration-200"
              :class="{ 'animate-lock-shake text-error': isLockShaking }"
            >
              🔒
            </span>
            <span>Locked</span>
          </button>
        </div>

        <!-- Divider -->
        <div class="divider divider-horizontal m-0 h-6"></div>

        <!-- Login / User Profile Avatar (to the right of locked button) -->
        <div class="flex items-center flex-shrink-0">
          <button 
            v-if="!authStore.isLoggedIn"
            @click="showAuthModal = true"
            class="btn btn-primary btn-outline btn-xs w-[70px]"
          >
            Log In
          </button>
          
          <div v-else class="dropdown dropdown-end z-50">
            <label tabindex="0" class="btn btn-ghost btn-xs gap-1 font-bold text-primary truncate max-w-[110px] px-1">
              👤 {{ authStore.user?.username }}
            </label>
            <ul tabindex="0" class="dropdown-content menu p-2 shadow-lg bg-base-100 rounded-box border border-base-300 w-52 mt-2 gap-1 text-sm">
              <li class="menu-title text-xs font-semibold px-4 py-2 border-b border-base-200 text-secondary mb-1">
                Binder Dashboard
              </li>
              <li>
                <router-link :to="authStore.user ? '/@' + authStore.user.username : '/'" class="font-medium text-base-content py-2 px-4 hover:bg-base-200 rounded">
                  📖 View Collection
                </router-link>
              </li>
              <li>
                <button @click="emit('logout')" class="text-error hover:bg-error/10 font-bold py-2 px-4 rounded">
                  🚪 Log Out
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Simplified header during active Gacha Drop Frenzy or Summary -->
    <div 
      v-else
      class="navbar bg-base-100 border-b border-base-300 px-4 py-2 shadow-sm select-none justify-between flex-nowrap"
    >
      <router-link to="/" class="flex items-center gap-2 no-underline hover:opacity-85">
        <div class="w-6 h-6 rounded border border-primary flex items-center justify-center bg-primary text-white font-serif text-xs font-black">
          W
        </div>
        <span class="text-sm font-black font-serif text-primary leading-none">Moonflower</span>
      </router-link>
      <span class="badge badge-error badge-outline font-sans uppercase font-extrabold text-[9px] tracking-wider animate-pulse">
        Gacha drop mode
      </span>
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
          Guests use localStorage. Authenticating with your email merges your local binder items and points across devices, allowing you to access Gacha drops securely.
        </p>

        <!-- Error Notice Block -->
        <div 
          v-if="authError" 
          class="alert alert-error text-xs p-3 rounded mb-4 font-sans font-semibold flex items-start gap-1"
        >
          <span>⚠️ {{ authError }}</span>
        </div>

        <!-- Step 1: Request OTP Email -->
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
            {{ isVerifying ? 'Sending Passcode...' : 'Send One-Time Passcode' }}
          </button>
        </form>

        <!-- Step 2: Verify OTP Passcode -->
        <form v-else @submit.prevent="handleVerifyOtp" class="flex flex-col gap-4 mt-2">
          <div class="bg-base-200 border border-base-300 p-3 rounded text-xs text-base-content font-medium">
            📬 We've sent a 6-digit one-time passcode to <strong class="text-primary">{{ authEmail }}</strong>. Enter the passcode below to verify.
          </div>
          
          <div class="form-control w-full">
            <label class="label py-1">
              <span class="label-text font-bold text-xs uppercase text-neutral-content/80">One-Time Passcode (OTP)</span>
            </label>
            <input 
              v-model="otpCode"
              type="text" 
              placeholder="123456"
              maxlength="6"
              required
              class="input input-bordered w-full input-sm font-mono font-bold tracking-widest text-center text-sm"
            >
          </div>

          <div class="flex justify-between text-[10px] font-sans -mt-2 px-1">
            <button 
              type="button" 
              @click="otpSent = false; otpCode = '';" 
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
            type="submit"
            :disabled="isVerifying"
            class="btn btn-primary btn-sm w-full font-bold uppercase text-white"
          >
            <span v-if="isVerifying" class="loading loading-spinner loading-xs"></span>
            Verify & Access Binder
          </button>
        </form>
      </div>

      <form method="dialog" class="modal-backdrop" @click="closeModal">
        <button>close</button>
      </form>
    </dialog>
  </header>
</template>
