<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore';
import { useGameStore, MOCK_CARDS } from '../stores/useGameStore';
import type { Card } from '../stores/useGameStore';
import CardComp from '../components/Card.vue';
import PageLayout from '../components/PageLayout.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const gameStore = useGameStore();

// Routing parameters
const profileId = computed(() => (route.params.id as string) || '');

// Profile Details (whether private or public)
const profileUser = ref<any>(null);
const profileCards = ref<any[]>([]);
const isPrivateMode = computed(() => {
  if (!authStore.isLoggedIn) return false;
  return authStore.user?.username.toLowerCase() === profileId.value.toLowerCase() ||
         authStore.user?.id.toLowerCase() === profileId.value.toLowerCase();
});

// Edit Profile Form States
const showEditProfileModal = ref(false);
const editDisplayName = ref('');
const editBio = ref('');
const editBgColor = ref('#eaecf0');

const bgOptions = [
  { name: 'Standard Grey', hex: '#eaecf0' },
  { name: 'Soft Blue', hex: '#e8f0fa' },
  { name: 'Pale Gold', hex: '#fef6e7' },
  { name: 'Mint Green', hex: '#eef8f2' },
  { name: 'Pure White', hex: '#ffffff' }
];

// Binder filtering & organization
const searchFilter = ref('');

// Fetch/sync profile details based on route
const loadProfile = () => {
  // Clear lists
  profileUser.value = null;
  profileCards.value = [];
  
  if (isPrivateMode.value && authStore.user) {
    // If it's private mode, load straight from auth store & game store
    profileUser.value = {
      id: authStore.user.id,
      username: authStore.user.username,
      profilePic: authStore.user.profilePic,
      bio: authStore.user.bio,
      backgroundColor: authStore.user.backgroundColor,
      gdPoints: authStore.user.gdPoints
    };
    
    // Cards loaded are from current inventory
    profileCards.value = gameStore.collectedCards;
    
    // Set edit form values
    editDisplayName.value = authStore.user.username;
    editBio.value = authStore.user.bio;
    editBgColor.value = authStore.user.backgroundColor;
  } else {
    // If it's public mode, look up in the simulated users database
    const loaded = gameStore.loadRegisteredProfile(profileId.value);
    
    if (loaded) {
      profileUser.value = loaded.userProfile;
      profileCards.value = loaded.cards;
    } else {
      // Mock profile fallback so page doesn't crash if they visit a random path
      profileUser.value = {
        id: `usr_${profileId.value.toLowerCase()}`,
        username: profileId.value,
        profilePic: `https://api.dicebear.com/7.x/identicon/svg?seed=${profileId.value}`,
        bio: 'This scholar is yet to publish their official Moonflower profile bio.',
        backgroundColor: '#eaecf0',
        gdPoints: 0
      };
      profileCards.value = [];
    }
  }
};

onMounted(async () => {
  authStore.initAuth();
  gameStore.loadGuestState();
  await gameStore.loadCardsFromDatabase();
  loadProfile();
});

// Watch auth status and route changes reactively
watch(() => authStore.isLoggedIn, (isLoggedIn) => {
  if (!isLoggedIn) {
    router.push('/');
  } else {
    loadProfile();
  }
});

watch([() => authStore.user, () => route.params.id], () => {
  loadProfile();
}, { deep: true });

// Form updates
const handleSaveProfile = () => {
  authStore.updateProfile({
    username: editDisplayName.value.trim(),
    bio: editBio.value.trim(),
    backgroundColor: editBgColor.value
  });
  
  showEditProfileModal.value = false;
  
  // If the username changed, redirect to the new route!
  if (editDisplayName.value.trim().toLowerCase() !== profileId.value.toLowerCase()) {
    router.replace(`/@${editDisplayName.value.trim()}`);
  } else {
    loadProfile();
  }
};

// Showcase cabinet filter and checks
const showcaseCards = computed(() => {
  // Map collected cards IDs to dynamic or mock card data
  const showcaseCollects = profileCards.value.filter(c => c.isShowcase);
  return showcaseCollects.map(sc => {
    const cardData = gameStore.gameCards.find(mc => mc.id === sc.id) || MOCK_CARDS.find(mc => mc.id === sc.id);
    return cardData ? { ...cardData, ...sc } : null;
  }).filter(c => c !== null) as Array<Card & { isShowcase: boolean, customSection: string | null }>;
});

const pinnedCard = computed(() => {
  return showcaseCards.value[0] || null;
});

const profilePictureStyle = computed(() => {
  const img = pinnedCard.value?.image;
  if (img) {
    if (img.startsWith('linear-gradient') || img.startsWith('url(')) {
      return img;
    }
    return `url("${img}")`;
  }
  
  // Fallback to default user profilePic if exists
  const fallback = profileUser.value?.profilePic;
  if (fallback) {
    if (fallback.startsWith('linear-gradient') || fallback.startsWith('url(')) {
      return fallback;
    }
    return `url("${fallback}")`;
  }
  return '';
});

const sortedBinderCards = computed(() => {
  return profileCards.value.map(c => {
    const cardData = gameStore.gameCards.find(mc => mc.id === c.id) || MOCK_CARDS.find(mc => mc.id === c.id);
    return cardData ? { ...cardData, ...c } : null;
  })
  .filter(c => c !== null)
  .sort((a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime())
  .filter(c => {
    const card = c!;
    // Filter by search title
    if (searchFilter.value && !card.title.toLowerCase().includes(searchFilter.value.toLowerCase())) {
      return false;
    }
    return true;
  }) as Array<Card & { isShowcase: boolean, customSection: string | null }>;
});

// Card management actions
const toggleCardShowcase = (cardId: string) => {
  gameStore.toggleShowcase(cardId);
  loadProfile();
};
</script>

<template>
  <PageLayout :background-color="profileUser?.backgroundColor || undefined">
    <div class="flex flex-col gap-6 w-full">

      <!-- PROFILE INFO BOX -->
      <section v-if="profileUser" class="card card-bordered bg-base-100 p-5 shadow shadow-sm relative text-left">
        <!-- Private Edit & Log Out Buttons -->
        <div v-if="isPrivateMode" class="absolute top-4 right-4 flex gap-2">
          <button 
            @click="showEditProfileModal = true"
            class="btn btn-neutral btn-outline btn-xs uppercase font-bold"
          >
            ✏️ Edit Profile
          </button>
          <button 
            @click="authStore.logout()"
            class="btn btn-error btn-outline btn-xs uppercase font-bold"
          >
            🚪 Log Out
          </button>
        </div>

        <div class="flex gap-4 items-center mb-4">
          <!-- Pinned Card Image as User Profile Image -->
          <div class="avatar">
            <div class="w-16 h-16 rounded-full border border-base-300 overflow-hidden bg-base-300 flex items-center justify-center shadow-inner relative">
              <div 
                v-if="profilePictureStyle"
                class="w-full h-full animate-fade-in"
                :key="profilePictureStyle"
                :style="{ 
                  backgroundImage: profilePictureStyle,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }"
              ></div>
              <span v-else class="text-secondary text-2xl">👤</span>
            </div>
          </div>

          <div class="flex flex-col text-left">
            <h2 class="font-serif text-2xl text-base-content font-black m-0 leading-tight">
              {{ profileUser.username }}
            </h2>
            <span class="badge badge-primary badge-xs font-bold uppercase tracking-wider mt-1 px-2 py-1.5">
              {{ isPrivateMode ? 'Private Binder Access' : 'Public Binder View' }}
            </span>
          </div>
        </div>

        <p class="text-xs text-base-content/85 leading-relaxed font-light mt-2">
          {{ profileUser.bio }}
        </p>

        <!-- Stats Display using DaisyUI Stats widget -->
        <div class="stats stats-horizontal shadow-sm border border-base-200 w-full mt-4 bg-base-200/40">
          <div class="stat p-3">
            <div class="stat-title text-[10px] font-bold uppercase tracking-widest text-secondary">GD Points</div>
            <div class="stat-value text-primary font-mono text-xl">{{ profileUser.gdPoints }}</div>
          </div>
          <div class="stat p-3 border-l border-base-200">
            <div class="stat-title text-[10px] font-bold uppercase tracking-widest text-secondary">Collected Entries</div>
            <div class="stat-value text-secondary font-mono text-xl">{{ profileCards.length }}</div>
          </div>
        </div>

      </section>

      <!-- BINDER CARD DIRECTORY & COLLECTIONS -->
      <section class="card card-bordered bg-base-100 p-5 shadow shadow-sm text-left">
        
        <div class="flex items-center justify-between border-b border-base-300 pb-2 mb-4">
          <h3 class="font-serif text-lg text-base-content font-black m-0">
            Collected Encyclopedia Binder
          </h3>
          <span class="badge badge-neutral font-sans font-bold">
            Count: {{ profileCards.length }} items
          </span>
        </div>

        <!-- Search Panel -->
        <div class="mb-4 font-sans text-xs">
          <input 
            v-model="searchFilter"
            type="text" 
            placeholder="Search cards by name..."
            class="input input-bordered w-full input-sm"
          >
        </div>

        <!-- Grid of Cards -->
        <div v-if="sortedBinderCards.length === 0" class="text-xs text-secondary italic text-center py-12 bg-base-200/20 border border-base-300 rounded">
          No matching cards discovered in this binder.
        </div>
        
        <div v-else class="grid grid-cols-2 gap-4 justify-items-center">
          <div 
            v-for="card in sortedBinderCards" 
            :key="card.id" 
            class="w-full max-w-[200px] flex flex-col items-center relative animate-fade-in"
          >
            <!-- Card itself -->
            <CardComp :card="card" :show-link="true" class="scale-[0.9] origin-top" />
            
            <!-- Actions bar (only for Private owner) -->
            <div v-if="isPrivateMode" class="w-full max-w-[180px] flex flex-col gap-1 -mt-4 mb-2 z-10">
              <!-- Pinned Card Toggle Button -->
              <button 
                @click="toggleCardShowcase(card.id)"
                class="btn btn-xs w-full font-bold shadow-sm"
                :class="[
                  card.isShowcase 
                    ? 'btn-warning text-warning-content' 
                    : 'btn-neutral btn-outline'
                ]"
              >
                {{ card.isShowcase ? '📌 Pinned to Profile' : '☆ Pin to Profile' }}
              </button>
            </div>
          </div>
        </div>
      </section>

    </div>

    <!-- PRIVATE EDIT PROFILE DIALOG (DaisyUI Dialog Modal) -->
    <dialog class="modal modal-bottom sm:modal-middle" :class="{ 'modal-open': showEditProfileModal }">
      <div class="modal-box bg-base-100 border border-base-300 p-6 shadow-2xl relative text-left">
        <button 
          @click="showEditProfileModal = false" 
          class="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
        >
          ✕
        </button>

        <h3 class="font-serif text-lg font-bold border-b border-base-300 pb-2 text-primary">
          Edit Binder Identity
        </h3>
        
        <form @submit.prevent="handleSaveProfile" class="flex flex-col gap-4 mt-4">
          <!-- Username -->
          <div class="form-control w-full">
            <label class="label py-1">
              <span class="label-text font-bold text-xs uppercase text-neutral-content/85">Display Name</span>
            </label>
            <input 
              v-model="editDisplayName"
              type="text" 
              required
              class="input input-bordered w-full input-sm"
            >
          </div>

          <!-- Bio -->
          <div class="form-control w-full">
            <label class="label py-1">
              <span class="label-text font-bold text-xs uppercase text-neutral-content/85">Encyclopedia Bio</span>
            </label>
            <textarea 
              v-model="editBio"
              rows="3"
              class="textarea textarea-bordered w-full resize-none font-sans font-light text-sm"
            ></textarea>
          </div>

          <!-- Color selection -->
          <div>
            <label class="block text-xs font-bold uppercase text-neutral-content/85 mb-1">Binder Background Theme</label>
            <div class="flex gap-2.5 mt-2">
              <button 
                v-for="bg in bgOptions"
                :key="bg.hex"
                type="button"
                @click="editBgColor = bg.hex"
                class="w-7 h-7 rounded border border-base-300 transition-all duration-150"
                :style="{ backgroundColor: bg.hex }"
                :class="[editBgColor === bg.hex ? 'ring-2 ring-primary border-primary' : '']"
                :title="bg.name"
              ></button>
            </div>
          </div>

          <button 
            type="submit"
            class="btn btn-primary btn-sm w-full font-bold uppercase mt-2 text-white"
          >
            Save Changes
          </button>
        </form>
      </div>

      <form method="dialog" class="modal-backdrop" @click="showEditProfileModal = false">
        <button>close</button>
      </form>
    </dialog>

  </PageLayout>
</template>

<style scoped>
/* Scaling fixes for card nested cards in grids */
.scale-\[0\.9\] {
  transform: scale(0.9);
}
</style>
