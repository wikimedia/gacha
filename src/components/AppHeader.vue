<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore';
import { useGameStore } from '../stores/useGameStore';
import { supabase } from '../supabase';

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
  (e: 'edit-profile'): void;
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
const authEmail = ref('');
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
      class="navbar bg-base-100 border-b border-base-300 px-4 py-2 shadow-sm select-none gap-2 justify-between flex-nowrap gacha-navbar"
      :class="{ 'border-primary bg-primary/5': points >= 100 }"
    >
      <!-- Left: Brand Title -->
      <router-link to="/" class="flex flex-col text-left leading-none flex-shrink-0 no-underline hover:opacity-85 gacha-brand">
        <span class="font-serif font-black text-sm text-primary tracking-tight">Moonflower</span>
        <span class="text-[9px] font-sans font-bold mt-1 text-secondary">Wikipedia Gacha</span>
      </router-link>

      <!-- Middle: Segmented/Continuous Goal Tracker (Custom Points Gauge) -->
      <div 
        class="flex-grow flex flex-col justify-center max-w-[240px] min-w-[130px] select-none gacha-progress-container"
        role="img" 
        aria-label="Gacha Drop progress"
      >
        <div class="flex justify-between items-center w-full text-[8px] font-sans font-extrabold uppercase tracking-wider mb-0.5">
          <span class="text-secondary">Gacha Progress</span>
          <span :class="points >= 100 ? 'text-primary font-black animate-pulse' : 'text-base-content/70'">{{ points }}/100</span>
        </div>
        <div 
          class="relative w-full h-3.5 bg-base-200 border border-base-300 rounded-full shadow-inner flex items-center transition-all duration-300"
          :class="{ 'points-ready-glow border-primary bg-primary/5': points >= 100 }"
        >
          <!-- Faint tick marks for visual interest / game gauge look -->
          <div class="absolute left-1/4 top-0 bottom-0 w-[1px] bg-base-content/10 z-10"></div>
          <div class="absolute left-1/2 top-0 bottom-0 w-[1px] bg-base-content/10 z-10"></div>
          <div class="absolute left-3/4 top-0 bottom-0 w-[1px] bg-base-content/10 z-10"></div>
          
          <!-- Progress Fill -->
          <div 
            class="h-full rounded-full transition-all duration-300 ease-out z-0"
            :class="[
              points >= 100 
                ? 'gacha-gradient-animation' 
                : 'progress-shimmer-fill'
            ]"
            :style="{ width: `${Math.min(points, 100)}%` }"
          ></div>
          
          <!-- Interactive Sliding Handle Emoji -->
          <span 
            class="absolute text-[12px] transition-all duration-300 ease-out -translate-x-1/2 select-none pointer-events-none z-20"
            :class="{ 'animate-bounce': points >= 100 }"
            :style="{ left: `${Math.min(points, 100)}%` }"
          >
            {{ points >= 100 ? '⭐' : '🔮' }}
          </span>
        </div>
      </div>


      <!-- Right: Action Button & Login/Profile Group -->
      <div class="flex items-center gap-2 flex-shrink-0 gacha-actions">
        <!-- Gacha Action Button -->
        <div class="w-[85px]" @click="points < 100 ? triggerLockShake() : null">
          <!-- Active progressive primary button styled like Log In but excited -->
          <button 
            v-if="points >= 100"
            @click.stop="handleActivateClick"
            class="btn btn-primary btn-xs w-full text-[9px] font-black uppercase text-white gacha-gradient-animation select-none shadow hover:scale-105 active:scale-95 transition-transform"
          >
            ⚡ Activate
          </button>
          
          <!-- Disabled locked state button -->
          <button 
            v-else
            disabled
            class="btn btn-xs w-full text-[9px] flex items-center justify-center gap-1 select-none"
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
              👤 {{ displayUsername }}
            </label>
             <ul tabindex="0" class="dropdown-content menu p-2 shadow-lg bg-base-100 rounded-box border border-base-300 w-52 mt-2 gap-1 text-sm">
               <li>
                 <router-link :to="authStore.user ? '/@' + (dbUsername || authStore.user.username) : '/'" class="font-medium text-base-content py-2 px-4 hover:bg-base-200 rounded">
                   📖 View Collection
                 </router-link>
               </li>
               <li v-if="isOwnProfile">
                 <button @click="emit('edit-profile')" class="font-medium text-base-content py-2 px-4 hover:bg-base-200 rounded">
                   ✏️ Edit Profile
                 </button>
               </li>
               <li>
                 <button @click="handleLogout" class="text-error hover:bg-error/10 font-bold py-2 px-4 rounded border-t border-base-200 pt-2 mt-1">
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
  </header>
</template>

<style scoped>
@media (max-width: 639px) {
  .gacha-navbar {
    flex-wrap: wrap !important;
  }
  .gacha-progress-container {
    order: 3 !important;
    width: 100% !important;
    max-width: 100% !important;
    margin-top: 0.5rem !important;
  }
  .gacha-brand {
    order: 1 !important;
  }
  .gacha-actions {
    order: 2 !important;
  }
}
</style>
