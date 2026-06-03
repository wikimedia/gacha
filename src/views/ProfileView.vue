<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore';
import { useGameStore, MOCK_CARDS } from '../stores/useGameStore';
import type { Card } from '../stores/useGameStore';
import CardComp from '../components/Card.vue';
import PageLayout from '../components/PageLayout.vue';
import Loader from '../components/Loader.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const gameStore = useGameStore();

const isLoadingProfile = ref(true);
const isLoadingCards = ref(false);

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

// Binder filtering & organization
const searchFilter = ref('');

// Fetch/sync profile details based on route
const loadProfile = async (forceDbFetch = false) => {
  console.log(`loadProfile triggered: profileId="${profileId.value}", isLoggedIn=${authStore.isLoggedIn}, isPrivateMode=${isPrivateMode.value}, forceDbFetch=${forceDbFetch}`);
  
  try {
    if (isPrivateMode.value && authStore.user) {
      // Set edit form values and profile state from local store immediately
      editDisplayName.value = authStore.user.username;
      editBio.value = authStore.user.bio;
      
      profileUser.value = {
        id: authStore.user.id,
        username: authStore.user.username,
        profilePic: authStore.user.profilePic,
        bio: authStore.user.bio,
        backgroundColor: authStore.user.backgroundColor,
        gdPoints: authStore.user.gdPoints
      };
      profileCards.value = [...gameStore.collectedCards];
      isLoadingProfile.value = false;

      if (forceDbFetch) {
        isLoadingCards.value = true;
        try {
          const dbProfile = await gameStore.loadProfileFromDB(authStore.user.id);
          if (dbProfile) {
            // Merge database cards into local collected cards if not present
            const localCardMap = new Map(gameStore.collectedCards.map((c: any) => [c.id, c]));
            const mergedCards = [...gameStore.collectedCards];
            let updatedAny = false;
            
            for (const dbCard of dbProfile.cards) {
              if (!localCardMap.has(dbCard.id)) {
                gameStore.collectedCards.push(dbCard);
                mergedCards.push(dbCard);
                updatedAny = true;
              }
            }
            if (updatedAny) {
              authStore.syncStoreToUser(gameStore.gdPoints, gameStore.collectedCards);
            }
            profileCards.value = mergedCards;
          }
        } catch (err) {
          console.error('Error fetching/syncing profile from database:', err);
        } finally {
          isLoadingCards.value = false;
        }
      }
    } else {
      isLoadingProfile.value = true;
      isLoadingCards.value = true;
      profileUser.value = null;
      profileCards.value = [];
      
      // Public mode: try Supabase profile table first
      const dbProfile = await gameStore.loadProfileFromDB(profileId.value);
      
      if (dbProfile) {
        profileUser.value = dbProfile.userProfile;
        profileCards.value = dbProfile.cards;
      } else {
        // Fall back to registered profiles
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
    }
  } finally {
    if (!isPrivateMode.value) {
      isLoadingProfile.value = false;
      isLoadingCards.value = false;
    }
  }
  console.log('loadProfile completed. profileUser:', profileUser.value, 'profileCards count:', profileCards.value.length);
};

onMounted(async () => {
  authStore.initAuth();
  gameStore.loadGuestState();
  isLoadingProfile.value = true;
  try {
    await gameStore.loadCardsFromDatabase();
    await loadProfile(true);
  } finally {
    isLoadingProfile.value = false;
  }
});

// Watch auth status and route changes reactively
watch(() => authStore.isLoggedIn, (isLoggedIn) => {
  if (!isLoggedIn) {
    router.push('/');
  } else {
    loadProfile(true);
  }
});

watch([() => authStore.user, () => route.params.id], () => {
  loadProfile();
}, { deep: true });

// Form updates
const handleSaveProfile = () => {
  authStore.updateProfile({
    username: editDisplayName.value.trim(),
    bio: editBio.value.trim()
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
    const cardData = gameStore.gameCards.find((mc: any) => mc.id === sc.id) || MOCK_CARDS.find((mc: any) => mc.id === sc.id);
    if (!cardData) return null;
    return {
      ...cardData,
      collectedAt: sc.collectedAt,
      isShowcase: sc.isShowcase,
      customSection: sc.customSection
    };
  }).filter(c => c !== null) as Array<Card & { isShowcase: boolean, customSection: string | null }>;
});

const pinnedCard = computed(() => {
  return showcaseCards.value[0] || null;
});

const hasPinnedCardWithImage = computed(() => {
  return !!(pinnedCard.value && pinnedCard.value.image);
});

const profilePictureStyle = computed(() => {
  const img = pinnedCard.value?.image;
  if (img) {
    if (img.startsWith('linear-gradient') || img.startsWith('url(')) {
      return img;
    }
    return `url("${img}")`;
  }
  return '';
});

const avatarSrc = computed(() => {
  return pinnedCard.value?.image || '';
});

const isAvatarCSSImage = computed(() => {
  const val = avatarSrc.value;
  return val.startsWith('linear-gradient') || val.startsWith('url(');
});

const sortedBinderCards = computed(() => {
  console.log(`sortedBinderCards re-evaluating: profileCards count = ${profileCards.value.length}, gameCards count = ${gameStore.gameCards.length}`);
  const result = profileCards.value.map(c => {
    const cardData = gameStore.gameCards.find((mc: any) => mc.id === c.id) || MOCK_CARDS.find((mc: any) => mc.id === c.id);
    if (!cardData) {
      console.warn(`Card data not found for collected card ID: "${c.id}"`);
      return null;
    }
    console.log(`Mapping card ${c.id}: title="${cardData.title}", image="${cardData.image}"`);
    return {
      ...cardData,
      collectedAt: c.collectedAt,
      isShowcase: c.isShowcase,
      customSection: c.customSection
    };
  })
  .filter(c => c !== null);
  console.log(`sortedBinderCards computed result: mapped ${result.length} cards successfully.`);
  return result
  .sort((a, b) => {
    const aShow = a.isShowcase ? 1 : 0;
    const bShow = b.isShowcase ? 1 : 0;
    if (aShow !== bShow) {
      return bShow - aShow;
    }
    return new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime();
  })
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
  profileCards.value = [...gameStore.collectedCards];
};
</script>

<template>
  <PageLayout is-wide @edit-profile="showEditProfileModal = true">
    <Loader v-if="isLoadingProfile" />

    <div v-else-if="profileUser" class="flex flex-col gap-6 w-full animate-fade-in">

      <!-- PROFILE INFO BOX -->
      <header class="relative text-left pb-6 border-b border-base-300">
        <div class="flex flex-col md:flex-row gap-6 items-start md:items-center">
          <!-- Pinned Card Image as User Profile Image -->
          <div v-if="hasPinnedCardWithImage" class="avatar">
            <div class="w-20 h-20 rounded-full border-2 border-base-300 overflow-hidden bg-base-300 flex items-center justify-center shadow-inner relative">
              <template v-if="avatarSrc">
                <div 
                  v-if="isAvatarCSSImage"
                  class="w-full h-full animate-fade-in"
                  :key="profilePictureStyle"
                  :style="{ 
                    backgroundImage: profilePictureStyle,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }"
                ></div>
                <img 
                  v-else
                  :src="avatarSrc"
                  referrerpolicy="no-referrer"
                  class="w-full h-full object-cover animate-fade-in"
                  alt="Profile Avatar"
                />
              </template>
              <span v-else class="text-secondary text-3xl">👤</span>
            </div>
          </div>

          <div class="flex flex-col text-left max-w-xl flex-1">
            <div class="flex flex-wrap items-center gap-3">
              <h2 class="font-serif text-3xl text-base-content font-black m-0 leading-none">
                {{ profileUser.username }}
              </h2>
            </div>
            <p class="text-xs text-base-content/85 leading-relaxed font-light mt-3">
              {{ profileUser.bio }}
            </p>
          </div>

          <!-- Stats Display integrated without a card style -->
          <div class="flex gap-6 md:ml-auto md:border-l md:border-base-300 md:pl-8 mt-2 md:mt-0">
            <div>
              <div class="text-[10px] font-bold uppercase tracking-widest text-secondary mb-1">Points</div>
              <div class="text-3xl font-serif font-black text-primary leading-none">{{ profileUser.gdPoints }}</div>
            </div>
            <div class="border-l border-base-300 pl-6">
              <div class="text-[10px] font-bold uppercase tracking-widest text-secondary mb-1">Cards</div>
              <div class="text-3xl font-serif font-black text-secondary leading-none">{{ profileCards.length }}</div>
            </div>
          </div>
        </div>
      </header>

      <!-- BINDER CARD DIRECTORY & COLLECTIONS -->
      <div class="flex flex-col gap-6 text-left py-4">
        
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-base-300 pb-3">
          <div>
            <h3 class="font-serif text-xl text-base-content font-black m-0">
              Collected Encyclopedia Binder
            </h3>
            <p class="text-xs text-secondary mt-1 font-light">
              Browse and manage your unlocked encyclopedia entries.
            </p>
          </div>
        </div>

        <!-- Search Panel -->
        <div class="w-full font-sans text-xs">
          <input 
            v-model="searchFilter"
            type="text" 
            placeholder="Search cards by name..."
            class="input input-bordered w-full max-w-md input-sm bg-white"
          >
        </div>

        <!-- Grid of Cards or Loader -->
        <Loader v-if="isLoadingCards" />
        
        <template v-else>
          <div v-if="sortedBinderCards.length === 0" class="text-xs text-secondary italic text-center py-16 bg-white/10 border border-base-300/40 rounded-lg">
            No matching cards discovered in this binder.
          </div>
          
          <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 justify-items-center">
          <div 
            v-for="card in sortedBinderCards" 
            :key="card.id" 
            class="w-full max-w-[280px] relative animate-fade-in"
          >
            <!-- Card itself (no downscaling) -->
            <CardComp :card="card" :show-link="true" />
            
            <!-- Pin Toggle Button overlay at top-right of the card (only for Private owner) -->
            <button 
              v-if="isPrivateMode"
              @click="toggleCardShowcase(card.id)"
              class="absolute top-2.5 right-2.5 z-20 btn btn-circle btn-xs shadow-md border"
              :class="[
                card.isShowcase 
                  ? 'btn-warning text-warning-content border-warning' 
                  : 'bg-white/90 hover:bg-white text-base-content/75 border-base-300'
              ]"
              :title="card.isShowcase ? 'Unpin from Profile' : 'Pin to Profile'"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                :fill="card.isShowcase ? 'currentColor' : 'none'" 
                stroke="currentColor" 
                stroke-width="2" 
                stroke-linecap="round" 
                stroke-linejoin="round" 
                class="w-3.5 h-3.5"
              >
                <line x1="12" y1="17" x2="12" y2="22"></line>
                <path d="M5 17h14v-1.76a2 2 0 0 0-.44-1.24l-2.78-3.71A2 2 0 0 1 15 9.05V4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v5.05a2 2 0 0 1-.78 1.56l-2.78 3.74a2 2 0 0 0-.44 1.25Z"></path>
              </svg>
            </button>
          </div>
        </div>
        </template>
      </div>

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
/* Scoped styles for the profile view */
</style>
