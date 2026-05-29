<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore';
import { useGameStore, MOCK_CARDS } from '../stores/useGameStore';
import type { Card } from '../stores/useGameStore';
import CardComp from '../components/Card.vue';
import { CdxDialog } from '@wikimedia/codex';

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
const editAvatar = ref('');
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
const categoryFilter = ref('All');
const rarityFilter = ref('All');
const sectionFilter = ref('All');

// Adding custom sections
const showAddSectionModal = ref(false);
const newSectionName = ref('');

// Export & Share Simulation Overlay
const showExportOverlay = ref(false);
const exportImageStatus = ref('');

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
    editAvatar.value = authStore.user.profilePic;
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

onMounted(() => {
  authStore.initAuth();
  gameStore.loadGuestState();
  loadProfile();
});

// Watch route changes to load different users correctly
watch(() => route.params.id, () => {
  loadProfile();
});

// Form updates
const handleSaveProfile = () => {
  authStore.updateProfile({
    username: editDisplayName.value.trim(),
    bio: editBio.value.trim(),
    profilePic: editAvatar.value.trim(),
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

// Section adding logic
const handleAddSection = () => {
  const name = newSectionName.value.trim();
  if (name) {
    gameStore.addCustomSection(name);
    newSectionName.value = '';
    showAddSectionModal.value = false;
  }
};

// Showcase filter and checks
const showcaseCards = computed(() => {
  // Map collected cards IDs to MOCK_CARDS data
  const showcaseCollects = profileCards.value.filter(c => c.isShowcase);
  return showcaseCollects.map(sc => {
    const cardData = MOCK_CARDS.find(mc => mc.id === sc.id);
    return cardData ? { ...cardData, ...sc } : null;
  }).filter(c => c !== null) as Array<Card & { isShowcase: boolean, customSection: string | null }>;
});

const sortedBinderCards = computed(() => {
  return profileCards.value.map(c => {
    const cardData = MOCK_CARDS.find(mc => mc.id === c.id);
    return cardData ? { ...cardData, ...c } : null;
  })
  .filter(c => c !== null)
  .filter(c => {
    const card = c!;
    // Filter by search title
    if (searchFilter.value && !card.title.toLowerCase().includes(searchFilter.value.toLowerCase())) {
      return false;
    }
    // Filter by category
    if (categoryFilter.value !== 'All' && card.category !== categoryFilter.value) {
      return false;
    }
    // Filter by rarity
    if (rarityFilter.value !== 'All' && card.rarity !== rarityFilter.value) {
      return false;
    }
    // Filter by custom section
    if (sectionFilter.value !== 'All') {
      if (sectionFilter.value === 'Unsorted' && card.customSection !== null) return false;
      if (sectionFilter.value !== 'Unsorted' && card.customSection !== sectionFilter.value) return false;
    }
    return true;
  }) as Array<Card & { isShowcase: boolean, customSection: string | null }>;
});

// Card management actions
const toggleCardShowcase = (cardId: string) => {
  const alreadyShowcase = showcaseCards.value.some(c => c.id === cardId);
  if (!alreadyShowcase && showcaseCards.value.length >= 4) {
    alert('Maximum of 4 showcase cards allowed.');
    return;
  }
  gameStore.toggleShowcase(cardId);
  loadProfile();
};

const assignCardSection = (cardId: string, event: Event) => {
  const target = event.target as HTMLSelectElement;
  const sectionName = target.value === 'none' ? null : target.value;
  gameStore.updateCardSection(cardId, sectionName);
  loadProfile();
};

// Simulating Image/Video/GIF export share
const triggerExport = (format: 'PNG' | 'GIF' | 'Video') => {
  showExportOverlay.value = true;
  exportImageStatus.value = `Compiling Binder Assets into ${format}...`;
  
  setTimeout(() => {
    exportImageStatus.value = 'Rendering 3D card matrices...';
    setTimeout(() => {
      exportImageStatus.value = `Export ready! ${format} saved to downloads.`;
    }, 1200);
  }, 1000);
};
</script>

<template>
  <div 
    class="min-h-screen flex flex-col font-sans transition-colors duration-300"
    :style="{ backgroundColor: profileUser?.backgroundColor || '#eaecf0' }"
  >
    
    <!-- HEADER BAR -->
    <header class="bg-white border-b border-[#a2a9b1] py-3 px-4 flex items-center justify-between sticky top-0 z-40 shadow-sm">
      <div class="flex items-center gap-2">
        <router-link to="/" class="w-8 h-8 rounded-full border border-[#a2a9b1] flex items-center justify-center bg-[#eaecf0] font-serif text-lg font-bold hover:bg-[#d8dade] transition-colors text-black no-underline select-none">
          W
        </router-link>
        <div>
          <h1 class="text-base font-bold tracking-tight text-black m-0 leading-none font-serif">Moonflower</h1>
          <span class="text-[9px] text-wiki-muted uppercase font-sans tracking-wide">Binder Collections</span>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <router-link 
          to="/"
          class="px-2.5 py-1 text-xs font-semibold text-wiki-blue hover:text-white hover:bg-wiki-blue border border-wiki-blue rounded-sm transition-colors duration-200"
        >
          ← Main Game
        </router-link>
      </div>
    </header>

    <!-- CORE PROFILE WRAPPER -->
    <main class="flex-grow p-4 max-w-lg mx-auto w-full flex flex-col gap-6">

      <!-- PROFILE INFO BOX -->
      <section v-if="profileUser" class="bg-white wiki-border p-5 rounded-sm shadow-sm relative text-left">
        <!-- Private Edit Button -->
        <button 
          v-if="isPrivateMode"
          @click="showEditProfileModal = true"
          class="absolute top-4 right-4 bg-[#f8f9fa] hover:bg-[#eaecf0] text-xs font-semibold text-[#202122] border border-[#a2a9b1] px-2.5 py-1 rounded-sm transition-colors"
        >
          ✏️ Edit Profile
        </button>

        <div class="flex items-start gap-4">
          <!-- Profile Pic -->
          <div class="w-16 h-16 rounded-full border border-[#a2a9b1] overflow-hidden bg-gray-50 flex-shrink-0">
            <img :src="profileUser.profilePic" alt="Avatar" class="w-full h-full object-cover">
          </div>
          
          <div class="flex-grow">
            <h2 class="wiki-serif text-2xl text-black font-normal m-0 leading-tight">
              {{ profileUser.username }}
            </h2>
            <span class="text-[10px] text-wiki-muted uppercase tracking-wider block font-semibold mt-1">
              {{ isPrivateMode ? 'Private Binder Access' : 'Public Binder View' }}
            </span>
            
            <p class="text-xs text-wiki-text leading-relaxed mt-2.5 font-light">
              {{ profileUser.bio }}
            </p>
          </div>
        </div>

        <!-- Share & Export Buttons Panel -->
        <div class="border-t border-[#eaecf0] mt-4 pt-3.5 flex gap-2 flex-wrap">
          <button 
            @click="triggerExport('PNG')"
            class="flex-1 min-w-[90px] bg-[#f8f9fa] hover:bg-[#eaecf0] text-[#202122] border border-[#a2a9b1] text-xs py-1.5 px-2.5 rounded-sm text-center font-semibold"
          >
            Export PNG
          </button>
          
          <button 
            @click="triggerExport('GIF')"
            class="flex-1 min-w-[90px] bg-[#f8f9fa] hover:bg-[#eaecf0] text-[#202122] border border-[#a2a9b1] text-xs py-1.5 px-2.5 rounded-sm text-center font-semibold"
          >
            Export GIF
          </button>

          <button 
            @click="triggerExport('Video')"
            class="flex-1 min-w-[90px] bg-[#f8f9fa] hover:bg-[#eaecf0] text-[#202122] border border-[#a2a9b1] text-xs py-1.5 px-2.5 rounded-sm text-center font-semibold"
          >
            Export Video
          </button>
        </div>
      </section>

      <!-- SHOWCASE CARDS CALLOUT -->
      <section v-if="showcaseCards.length > 0" class="text-left">
        <h3 class="wiki-serif text-lg text-black font-normal border-b border-[#a2a9b1] pb-1 mb-4 flex items-center justify-between">
          <span>Showcase Cabinet</span>
          <span class="text-xs text-[#ac6600] font-sans font-bold">★ Highlighted Entries</span>
        </h3>
        
        <div class="grid grid-cols-2 gap-4 justify-items-center">
          <div v-for="card in showcaseCards" :key="card.id" class="w-full max-w-[200px] relative">
            <CardComp :card="card" :show-link="false" />
            <button 
              v-if="isPrivateMode"
              @click="toggleCardShowcase(card.id)"
              class="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-wiki-red text-white flex items-center justify-center border border-white hover:bg-[#ff4242] shadow-sm z-30"
              title="Remove Showcase"
            >
              ✕
            </button>
          </div>
        </div>
      </section>

      <!-- BINDER CARD DIRECTORY & COLLECTIONS -->
      <section class="text-left bg-white wiki-border p-4 rounded-sm shadow-sm">
        
        <div class="flex items-center justify-between border-b border-[#a2a9b1] pb-1 mb-4">
          <h3 class="wiki-serif text-lg text-black font-normal m-0">
            Collected Encyclopedia Binder
          </h3>
          <span class="text-xs text-wiki-muted font-sans font-semibold">
            Count: {{ profileCards.length }} items
          </span>
        </div>

        <!-- Private Binder Organization Tools (Add Section) -->
        <div v-if="isPrivateMode" class="mb-4">
          <button 
            @click="showAddSectionModal = true"
            class="bg-[#f8f9fa] hover:bg-[#eaecf0] text-xs font-semibold text-[#202122] border border-[#a2a9b1] px-3 py-1.5 rounded-sm transition-colors w-full text-center"
          >
            ✚ Create Custom Binder Section
          </button>
        </div>

        <!-- Filter Panel -->
        <div class="grid grid-cols-2 gap-2 mb-4 font-sans text-xs">
          <!-- Text Search -->
          <div class="col-span-2">
            <input 
              v-model="searchFilter"
              type="text" 
              placeholder="Search cards by name..."
              class="w-full px-2.5 py-1.5 bg-white wiki-border rounded-sm focus:outline-none focus:border-wiki-blue"
            >
          </div>
          
          <!-- Category -->
          <div>
            <label class="block text-[10px] text-wiki-muted font-semibold uppercase mb-1">Category</label>
            <select v-model="categoryFilter" class="w-full bg-white wiki-border px-2 py-1 rounded-sm focus:outline-none">
              <option value="All">All Categories</option>
              <option value="Science">Science</option>
              <option value="History">History</option>
              <option value="Pop Culture">Pop Culture</option>
              <option value="Geography">Geography</option>
            </select>
          </div>

          <!-- Rarity -->
          <div>
            <label class="block text-[10px] text-wiki-muted font-semibold uppercase mb-1">Rarity</label>
            <select v-model="rarityFilter" class="w-full bg-white wiki-border px-2 py-1 rounded-sm focus:outline-none">
              <option value="All">All Rarities</option>
              <option value="Common">Stub (Common)</option>
              <option value="Rare">Good (Rare)</option>
              <option value="Epic">A-Class (Epic)</option>
              <option value="Legendary">Featured (Legendary)</option>
            </select>
          </div>

          <!-- Custom Section Filter -->
          <div class="col-span-2">
            <label class="block text-[10px] text-wiki-muted font-semibold uppercase mb-1">Custom Section</label>
            <select v-model="sectionFilter" class="w-full bg-white wiki-border px-2 py-1 rounded-sm focus:outline-none">
              <option value="All">All Sections</option>
              <option value="Unsorted">Unsorted Entries</option>
              <option v-for="sec in gameStore.customSections" :key="sec" :value="sec">
                {{ sec }}
              </option>
            </select>
          </div>
        </div>

        <!-- Grid of Cards -->
        <div v-if="sortedBinderCards.length === 0" class="text-xs text-wiki-muted italic text-center py-8 bg-[#f8f9fa] wiki-border rounded-sm">
          No matching cards discovered in this binder.
        </div>
        
        <div v-else class="grid grid-cols-2 gap-4 justify-items-center">
          <div 
            v-for="card in sortedBinderCards" 
            :key="card.id" 
            class="w-full max-w-[200px] flex flex-col gap-2 relative bg-white wiki-border p-2 rounded-sm"
          >
            <!-- Card itself -->
            <CardComp :card="card" :show-link="true" class="scale-[0.9] origin-top" />
            
            <!-- Actions bar (only for Private owner) -->
            <div v-if="isPrivateMode" class="flex flex-col gap-1 border-t border-[#eaecf0] pt-2 mt-auto">
              <!-- Showcase Toggle Button -->
              <button 
                @click="toggleCardShowcase(card.id)"
                class="w-full text-[10px] py-1 border rounded-sm font-semibold transition-colors"
                :class="[
                  card.isShowcase 
                    ? 'bg-[#fef6e7] text-[#ac6600] border-[#f3d999]' 
                    : 'bg-white hover:bg-gray-50 border-[#a2a9b1] text-wiki-text'
                ]"
              >
                {{ card.isShowcase ? '★ Showcase Active' : '☆ Pin to Showcase' }}
              </button>

              <!-- Section dropdown allocation -->
              <div class="flex flex-col text-[10px]">
                <label class="text-[8px] text-wiki-muted uppercase font-bold mb-0.5">Move to Section</label>
                <select 
                  :value="card.customSection || 'none'"
                  @change="assignCardSection(card.id, $event)"
                  class="bg-white border border-[#a2a9b1] rounded-sm py-0.5 px-1 focus:outline-none"
                >
                  <option value="none">No Section</option>
                  <option v-for="sec in gameStore.customSections" :key="sec" :value="sec">
                    {{ sec }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

    </main>

    <!-- PRIVATE EDIT PROFILE DIALOG -->
    <cdx-dialog
      v-model:open="showEditProfileModal"
      title="Edit Binder Identity"
      @close="showEditProfileModal = false"
    >
      <form @submit.prevent="handleSaveProfile" class="flex flex-col gap-4">
        <!-- Username -->
        <div>
          <label class="block text-xs font-semibold text-wiki-text font-sans uppercase mb-1">Display Name</label>
          <input 
            v-model="editDisplayName"
            type="text" 
            required
            class="w-full px-3 py-2 bg-white wiki-border text-sm rounded-sm focus:outline-none focus:border-wiki-blue"
          >
        </div>

        <!-- Bio -->
        <div>
          <label class="block text-xs font-semibold text-wiki-text font-sans uppercase mb-1">Encyclopedia Bio</label>
          <textarea 
            v-model="editBio"
            rows="3"
            class="w-full px-3 py-2 bg-white wiki-border text-sm rounded-sm focus:outline-none focus:border-wiki-blue resize-none font-sans font-light"
          ></textarea>
        </div>

        <!-- Profile Pic Avatar URL -->
        <div>
          <label class="block text-xs font-semibold text-wiki-text font-sans uppercase mb-1">Avatar Image URL</label>
          <input 
            v-model="editAvatar"
            type="text" 
            class="w-full px-3 py-2 bg-white wiki-border text-sm rounded-sm focus:outline-none"
          >
        </div>

        <!-- Color selection -->
        <div>
          <label class="block text-xs font-semibold text-wiki-text font-sans uppercase mb-1">Binder Background Theme</label>
          <div class="flex gap-2.5 mt-1.5">
            <button 
              v-for="bg in bgOptions"
              :key="bg.hex"
              type="button"
              @click="editBgColor = bg.hex"
              class="w-7 h-7 rounded-sm border transition-all duration-150"
              :style="{ backgroundColor: bg.hex }"
              :class="[editBgColor === bg.hex ? 'border-wiki-blue ring-2 ring-blue-200' : 'border-[#a2a9b1]']"
              :title="bg.name"
            ></button>
          </div>
        </div>

        <button 
          type="submit"
          class="w-full bg-wiki-blue hover:bg-wiki-blueHover text-white font-bold text-xs py-2.5 rounded-sm border border-wiki-blue transition-colors font-sans"
        >
          Save Changes
        </button>
      </form>
    </cdx-dialog>

    <!-- ADD CUSTOM BINDER SECTION MODAL -->
    <cdx-dialog
      v-model:open="showAddSectionModal"
      title="New Binder Section"
      @close="showAddSectionModal = false"
    >
      <form @submit.prevent="handleAddSection" class="flex flex-col gap-3">
        <input 
          v-model="newSectionName"
          type="text" 
          placeholder="e.g. Featured Space Science"
          required
          class="w-full px-3 py-2 bg-white wiki-border text-xs rounded-sm focus:outline-none"
        >
        <button 
          type="submit"
          class="w-full bg-wiki-green hover:bg-[#00c79c] text-white font-bold text-xs py-2 rounded-sm border border-wiki-green transition-colors"
        >
          Add Section
        </button>
      </form>
    </cdx-dialog>

    <!-- SHARE/EXPORT MOCK OVERLAY -->
    <div 
      v-if="showExportOverlay" 
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4"
    >
      <div class="bg-white wiki-border rounded-sm max-w-sm w-full p-6 text-center shadow-lg animate-fade-in">
        <span class="text-4xl block mb-2">📸</span>
        <h3 class="wiki-serif text-lg font-normal text-black mb-2">Moonflower Export Manager</h3>
        
        <p class="text-xs text-wiki-muted mb-4 font-light leading-relaxed">
          {{ exportImageStatus }}
        </p>
 
        <button 
          v-if="exportImageStatus.includes('saved')"
          @click="showExportOverlay = false"
          class="w-full bg-wiki-blue hover:bg-wiki-blueHover text-white font-bold text-xs py-2.5 rounded-sm border border-wiki-blue transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* Scaling fixes for card nested cards in grids */
.scale-\[0\.9\] {
  transform: scale(0.9);
}

.animate-fade-in {
  animation: fadeIn 0.2s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
