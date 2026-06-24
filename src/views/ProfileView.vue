<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore';
import { useGameStore } from '../stores/useGameStore';
import type { Card } from '../stores/useGameStore';
import CardComp from '../components/Card.vue';
import PageLayout from '../components/PageLayout.vue';
import Loader from '../components/Loader.vue';
import { 
  PhPencilSimple,
  PhExport, 
  PhSquare, 
  PhColumns, 
  PhGridNine, 
  PhPushPin 
} from '@phosphor-icons/vue';

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
const editDisplayName = ref('');
const editBio = ref('');

// Custom Redesign States
const binderColor = ref('#4a6783');
const gridColumns = ref(2); // default to 2 columns
const showEditDropdown = ref(false);
const isShowcaseMode = ref(false);
const editingField = ref<'username' | 'bio' | null>(null);
const editInputValue = ref('');
const showShareToast = ref(false);



// Binder filtering & organization
const searchFilter = ref('');

// Fetch/sync profile details based on route
const loadProfile = async () => {
  console.log(`loadProfile triggered: profileId="${profileId.value}"`);
  isLoadingProfile.value = true;
  isLoadingCards.value = true;
  
  try {
    const dbProfile = await gameStore.loadProfileFromDB(profileId.value);
    if (dbProfile) {
      profileUser.value = dbProfile.userProfile;
      binderColor.value = dbProfile.userProfile.backgroundColor || '#4a6783';
      if (isPrivateMode.value) {
        editDisplayName.value = dbProfile.userProfile.username;
        editBio.value = dbProfile.userProfile.bio;
        if (authStore.user?.backgroundColor) {
          binderColor.value = authStore.user.backgroundColor;
        }
        
        // Merge DB cards with any in-memory cards that might not be in the DB yet
        const dbCardIds = new Set(dbProfile.cards.map((c: any) => c.id));
        const localOnly = gameStore.collectedCards.filter(c => !dbCardIds.has(c.id));
        const mergedCards = [...dbProfile.cards, ...localOnly];
        
        profileCards.value = mergedCards;
        gameStore.collectedCards = mergedCards;
      } else {
        profileCards.value = dbProfile.cards;
      }
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
      
      const localColor = localStorage.getItem(`moonflower_binder_color_${profileId.value}`);
      if (localColor) {
        binderColor.value = localColor;
      } else {
        binderColor.value = '#4a6783';
      }
    }
  } catch (err) {
    console.error('Error fetching profile from database:', err);
  } finally {
    isLoadingProfile.value = false;
    isLoadingCards.value = false;
  }
};

onMounted(async () => {
  authStore.initAuth();
  gameStore.loadGuestState();
  isLoadingProfile.value = true;
  try {
    await gameStore.loadCardsFromDatabase();
    await loadProfile();
  } finally {
    isLoadingProfile.value = false;
  }
});

// Watch auth status and route changes reactively
watch(() => authStore.isLoggedIn, () => {
  loadProfile();
});

watch([() => authStore.user, () => route.params.id], () => {
  loadProfile();
}, { deep: true });

// Custom Redesign Handlers
const handleShareProfile = () => {
  navigator.clipboard.writeText(window.location.href)
    .then(() => {
      showShareToast.value = true;
      setTimeout(() => {
        showShareToast.value = false;
      }, 3000);
    })
    .catch(err => console.error('Failed to copy profile link:', err));
};

const updateBinderColor = async (color: string) => {
  binderColor.value = color;
  if (isPrivateMode.value) {
    await authStore.updateProfile({ backgroundColor: color });
  }
  localStorage.setItem(`moonflower_binder_color_${profileId.value}`, color);
};

const startEditing = (field: 'username' | 'bio') => {
  editingField.value = field;
  editInputValue.value = field === 'username' ? editDisplayName.value : editBio.value;
  showEditDropdown.value = false;
};

const handleEditProfileField = (field: 'username' | 'bio' | 'showcase') => {
  if (field === 'username' || field === 'bio') {
    startEditing(field);
  } else if (field === 'showcase') {
    isShowcaseMode.value = true;
  }
};

const cancelEditing = () => {
  editingField.value = null;
  editInputValue.value = '';
};

const saveEditing = async () => {
  if (editingField.value === 'username') {
    editDisplayName.value = editInputValue.value.trim();
  } else if (editingField.value === 'bio') {
    editBio.value = editInputValue.value.trim();
  }
  
  if (isPrivateMode.value) {
    await authStore.updateProfile({
      username: editDisplayName.value.trim(),
      bio: editBio.value.trim(),
      backgroundColor: binderColor.value
    });
  }
  
  editingField.value = null;
  
  if (editDisplayName.value.trim().toLowerCase() !== profileId.value.toLowerCase()) {
    router.replace(`/@${editDisplayName.value.trim()}`);
  } else {
    await loadProfile();
  }
};



// Showcase cabinet filter and checks
const showcaseCards = computed(() => {
  // Map collected cards IDs to dynamic or mock card data
  const showcaseCollects = profileCards.value.filter(c => c.isShowcase);
  return showcaseCollects.map(sc => {
    const cardData = sc.cardDetails || gameStore.gameCards.find((mc: any) => mc.id === sc.id) || [];
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
    const cardData = c.cardDetails || gameStore.gameCards.find((mc: any) => mc.id === c.id) || [];
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

// Group binder cards by Category
const binderSections = computed(() => {
  const sections: Record<string, Array<Card & { isShowcase: boolean, customSection: string | null }>> = {};
  sortedBinderCards.value.forEach(card => {
    const cat = card.category;
    if (!sections[cat]) {
      sections[cat] = [];
    }
    sections[cat].push(card);
  });
  return sections;
});

// Card management actions
const toggleCardShowcase = async (cardId: string) => {
  await gameStore.toggleShowcase(cardId);
  profileCards.value = [...gameStore.collectedCards];
};
</script>

<template>
  <PageLayout 
    is-wide 
    :binder-color="binderColor"
    @edit-profile-field="handleEditProfileField"
    @update-binder-color="updateBinderColor"
  >
    <Loader v-if="isLoadingProfile" message="Loading scholar profile..." />

    <div v-else-if="profileUser" class="flex flex-col w-full animate-fade-in text-left">
      <!-- TOAST NOTIFICATION FOR COPY LINK -->
      <div v-if="showShareToast" class="toast-notification">
        <span>✨ Profile link copied to clipboard!</span>
      </div>

      <!-- SHOWCASE MODE HEADER BANNER -->
      <div v-if="isPrivateMode && isShowcaseMode" class="showcase-edit-banner flex justify-between items-center bg-[#d9754b] text-[#fdf4eb] px-4 py-2.5 text-xs font-serif font-black shadow-md rounded-[2px] mb-4 mx-4 sm:mx-0">
        <span class="flex items-center gap-1.5">
          <PhPencilSimple :size="12" weight="bold" class="animate-pulse" />
          SHOWCASE MODE: TAP A CARD PIN TO HIGHLIGHT IT AS YOUR MAIN AVATAR
        </span>
        <button @click="isShowcaseMode = false" class="btn btn-xs bg-[#fdf4eb] hover:bg-white text-[#d9754b] border-none font-bold tracking-wider">Done</button>
      </div>

      <!-- SCHOLAR INFO BLOCK -->
      <section class="max-w-4xl w-full mx-auto px-4 py-6 border-b border-[#c4b69d]/40">
        <div class="flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left">
          <!-- Avatar Frame -->
          <div class="avatar-frame flex-shrink-0" :style="{ borderColor: binderColor }">
            <div class="avatar-frame__inner">
              <template v-if="hasPinnedCardWithImage && avatarSrc">
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
              <div v-else class="w-full h-full flex items-center justify-center bg-[#eaecf0]/50 select-none">
                <span class="text-3xl">👤</span>
              </div>
            </div>
          </div>

          <!-- Info Details -->
          <div class="flex-grow flex flex-col justify-center min-w-0 max-w-xl">
            <div class="flex items-center gap-3">
              <h2 class="font-serif text-3xl text-[#4a6783] font-black m-0 leading-none truncate">
                {{ profileUser.username }}
              </h2>
            </div>
            <p class="text-xs text-[#3f3f35]/90 leading-relaxed font-light mt-3">
              {{ profileUser.bio }}
            </p>
            <div class="text-[11px] font-bold text-[#888888] uppercase tracking-wide mt-4">
              Total cards: <span class="text-[#d9754b] font-serif font-black text-sm">{{ profileCards.length }}</span>
              <span class="mx-2 text-[#c4b69d]/50">|</span>
              Gacha Points: <span class="text-[#4a6783] font-serif font-black text-sm">{{ profileUser.gdPoints }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- BINDER CONTAINER & FOLDER SHEET -->
      <section class="max-w-4xl w-full mx-auto px-0 sm:px-4 py-8 relative">
        
        <!-- FOLDER TAB ROW -->
        <div class="flex justify-between items-end w-full relative z-10 -mb-[1px]">
          <!-- Left: Folder tab shape -->
          <div class="folder-tabs-group flex items-end">
            <div 
              class="folder-tab-active flex items-center justify-center font-serif font-bold text-xs uppercase tracking-wider text-black px-6 py-2.5 rounded-t-[6px]"
              :style="{ backgroundColor: binderColor }"
            >
              Facts
            </div>
          </div>

          <!-- Right: Clipboard Share button -->
          <button 
            @click="handleShareProfile" 
            class="share-round-btn flex items-center justify-center w-8 h-8 rounded-full border border-[#c4b69d] hover:bg-[#c4b69d]/10 text-[#4a6783] transition-colors mb-1.5 mr-2 sm:mr-0"
            title="Share Profile Link"
          >
            <PhExport :size="14" weight="bold" />
          </button>
        </div>

        <!-- THE BINDER BOX COVER -->
        <div class="binder-cover-box" :style="{ backgroundColor: binderColor }">
          
          <!-- BINDER SPINE & LOOP SPIRALS -->
          <div class="binder-spine">
            <div v-for="i in 10" :key="i" class="binder-ring">
              <div class="ring-hole ring-hole-top"></div>
              <div class="ring-wire"></div>
              <div class="ring-hole ring-hole-bottom"></div>
            </div>
          </div>

          <!-- BINDER PAPER PAGE SHEET -->
          <div class="binder-page-sheet bg-[#fdf4eb] text-[#3f3f35] p-3 md:p-5 min-h-[500px]">
            
            <!-- Page Header Settings -->
            <div class="flex justify-between items-center gap-4 mb-8 border-b border-[#c4b69d]/30 pb-4">
              <div class="font-sans text-xs">
                <input 
                  v-model="searchFilter"
                  type="text" 
                  placeholder="Search cards in binder..."
                  class="input input-sm border-[#c4b69d]/60 bg-white/70 w-44 sm:w-64"
                />
              </div>

              <!-- Column Switcher icons -->
              <div class="column-switcher flex gap-1.5 items-center">
                <button 
                  @click="gridColumns = 1" 
                  :class="{ 'column-switcher-btn--active': gridColumns === 1 }" 
                  class="column-switcher-btn"
                  title="1 Column View"
                >
                  <PhSquare :size="14" weight="bold" />
                </button>
                <button 
                  @click="gridColumns = 2" 
                  :class="{ 'column-switcher-btn--active': gridColumns === 2 }" 
                  class="column-switcher-btn"
                  title="2 Columns View"
                >
                  <PhColumns :size="14" weight="bold" />
                </button>
                <button 
                  @click="gridColumns = 3" 
                  :class="{ 'column-switcher-btn--active': gridColumns === 3 }" 
                  class="column-switcher-btn"
                  title="3 Columns View"
                >
                  <PhGridNine :size="14" weight="bold" />
                </button>
              </div>
            </div>

            <!-- Loader or Content -->
            <Loader v-if="isLoadingCards" message="Flipping collection pages..." />

            <template v-else>
              <div v-if="sortedBinderCards.length === 0" class="text-xs text-[#888888] italic text-center py-20 bg-black/5 border border-[#c4b69d]/40 rounded-[2px]">
                No matching encyclopedia pages found.
              </div>

              <div v-else class="flex flex-col gap-10">
                <!-- Loop over grouped Category sections -->
                <div 
                  v-for="[sectionName, sectionCards] in Object.entries(binderSections)" 
                  :key="sectionName" 
                  class="binder-section-group w-full"
                >
                  <!-- Section Heading -->
                  <h4 class="binder-section-title font-serif text-lg font-black text-[#4a6783] mb-4 pb-1 border-b border-[#c4b69d]/30">
                    {{ sectionName }}
                  </h4>

                  <!-- Card Grid (dependent on gridColumns selector) -->
                  <div class="binder-grid" :class="'binder-grid--' + gridColumns + 'col'">
                    <div 
                      v-for="card in sectionCards" 
                      :key="card.id" 
                      class="card-scale-wrapper"
                    >
                      <div class="card-scaled-content">
                        <!-- Render Card itself -->
                        <CardComp :card="card" :show-link="!isShowcaseMode" />

                        <!-- Showcase pin overlays (only in showcase edit mode) -->
                        <button 
                          v-if="isPrivateMode && isShowcaseMode"
                          @click="toggleCardShowcase(card.id)"
                          class="absolute top-4 right-4 z-30 w-8 h-8 flex items-center justify-center p-0 rounded-[2px] shadow-lg border transition-colors duration-200 cursor-pointer"
                          :class="[
                            card.isShowcase 
                              ? 'bg-[#d9754b] text-[#fdf4eb] border-[#d9754b] hover:bg-[#c05c33]' 
                              : 'bg-[#fdf4eb] hover:bg-white text-[#4a6783] border-[#c4b69d]'
                          ]"
                          :title="card.isShowcase ? 'Remove from Showcase' : 'Set as Showcase Pinned Card'"
                        >
                          <PhPushPin :size="14" :weight="card.isShowcase ? 'fill' : 'bold'" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>

          </div>
        </div>
      </section>
    </div>

    <!-- FULLSCREEN FOCUSED PROFILE EDIT OVERLAY -->
    <div v-if="editingField !== null" class="edit-overlay-fullscreen flex items-start justify-center z-50">
      <div class="edit-overlay-backdrop" @click="cancelEditing"></div>
      <div class="edit-overlay-card w-full max-w-md mx-4 mt-[15vh] p-6 shadow-2xl rounded-[4px] relative border border-[#fdf4eb]/20" :style="{ backgroundColor: binderColor }">
        <button 
          @click="cancelEditing" 
          class="absolute right-4 top-4 text-[#fdf4eb]/80 hover:text-[#fdf4eb] font-bold text-sm cursor-pointer"
        >
          ✕
        </button>

        <h3 class="font-serif text-lg font-black border-b border-[#fdf4eb]/20 pb-2 text-[#fdf4eb] mb-4">
          {{ editingField === 'username' ? 'Edit Username' : 'Edit Bio Description' }}
        </h3>
        
        <div class="form-control w-full mb-6">
          <label class="label py-1">
            <span class="label-text font-serif font-black text-xs uppercase text-[#fdf4eb]/80">
              {{ editingField === 'username' ? 'Display Name' : 'Encyclopedia Bio' }}
            </span>
          </label>
          
          <input 
            v-if="editingField === 'username'"
            v-model="editInputValue"
            type="text" 
            required
            class="input w-full input-bordered font-sans bg-[#fdf4eb] text-[#3f3f35] border-none rounded-[2px] mt-1"
            placeholder="Type username..."
            @keyup.enter="saveEditing"
          />
          <textarea 
            v-else
            v-model="editInputValue"
            rows="4"
            class="textarea w-full font-sans bg-[#fdf4eb] text-[#3f3f35] border-none rounded-[2px] mt-1 resize-none leading-relaxed text-sm"
            placeholder="Write binder biography..."
          ></textarea>
        </div>

        <div class="flex gap-3">
          <button 
            @click="saveEditing"
            class="btn bg-[#fdf4eb] hover:bg-white text-[#3f3f35] border-none btn-sm flex-1 font-bold uppercase tracking-wider cursor-pointer"
          >
            Save Changes
          </button>
          <button 
            @click="cancelEditing"
            class="btn btn-outline border-[#fdf4eb] text-[#fdf4eb] hover:bg-white/10 btn-sm flex-1 font-bold uppercase tracking-wider cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </PageLayout>
</template>

<style scoped>
/* ============================================================
   Profile Redesign - Spiral Folder Binder System
   ============================================================ */

/* Sticky profile header classes removed */

/* Avatar frame: rounded square double border */
.avatar-frame {
  width: 90px;
  height: 90px;
  border-radius: 4px;
  border: 3px double #c4b69d;
  padding: 3px;
  background-color: #fdf4eb;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
}

.avatar-frame__inner {
  width: 100%;
  height: 100%;
  border: 1px solid rgba(0, 0, 0, 0.05);
  overflow: hidden;
  background-color: #eaecf0;
}

/* Share Clipboard button */
.share-round-btn:hover {
  background-color: rgba(196, 182, 157, 0.2) !important;
}

/* Clipboard Toast notification */
.toast-notification {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  background-color: #3f3f35;
  color: #fdf4eb;
  padding: 8px 16px;
  border-radius: 4px;
  font-family: var(--font-family-serif);
  font-size: 12px;
  font-weight: bold;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  animation: toastPop 0.3s ease-out;
}

@keyframes toastPop {
  from { transform: translate(-50%, 20px); opacity: 0; }
  to { transform: translate(-50%, 0); opacity: 1; }
}

/* Folder tab active style */
.folder-tab-active {
  box-shadow: 0 -2px 5px rgba(0,0,0,0.06);
  border: 1px solid rgba(0,0,0,0.05);
  border-bottom: none;
  min-width: 100px;
  text-align: center;
  transition: background-color 0.3s ease;
}

/* Outer Binder Cover Box */
.binder-cover-box {
  position: relative;
  border-radius: 0; /* edge-to-edge on mobile */
  border-top-left-radius: 0; /* folder tab joins flat */
  padding: 8px 8px 8px 36px; /* Spacer left for the rings spine - reduced padding */
  box-shadow: 
    0 8px 24px rgba(0, 0, 0, 0.16),
    0 2px 4px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.1);
  transition: background-color 0.3s ease;
}

@media (min-width: 640px) {
  .binder-cover-box {
    border-radius: 8px;
    border-top-left-radius: 0;
  }
}

/* Binder Spine & Loop Rings CSS */
.binder-spine {
  position: absolute;
  left: 12px;
  top: 30px;
  bottom: 30px;
  width: 22px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  z-index: 15;
  pointer-events: none;
}

.binder-ring {
  position: relative;
  width: 26px;
  height: 18px;
}

.ring-hole {
  position: absolute;
  width: 5px;
  height: 5px;
  background-color: #24221f;
  border-radius: 50%;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.6);
  z-index: 10;
}

.ring-hole-top {
  left: 0;
  top: 0;
}

.ring-hole-bottom {
  left: 0;
  bottom: 0;
}

.ring-wire {
  position: absolute;
  left: 2px;
  top: 2px;
  width: 24px;
  height: 14px;
  border: 2px solid #e0e0e0;
  border-left: none;
  border-radius: 0 7px 7px 0;
  box-shadow: 
    1px 2px 3px rgba(0,0,0,0.25),
    inset -1px 0px 1px rgba(255,255,255,0.7);
  background: transparent;
  z-index: 12;
}

/* Binder Page Sheet (Cream Paper Texture) */
.binder-page-sheet {
  border-radius: 4px;
  border: 1px solid #c4b69d;
  box-shadow: 
    inset 0 0 40px rgba(196, 182, 157, 0.15),
    1px 1px 3px rgba(0, 0, 0, 0.05);
  background-image: linear-gradient(rgba(196, 182, 157, 0.08) 1px, transparent 1px);
  background-size: 100% 28px;
  position: relative;
  z-index: 5;
}

/* Column grid layout selector button styles */
.column-switcher-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background-color: white;
  border: 1px solid #c4b69d;
  border-radius: 3px;
  color: #888888;
  cursor: pointer;
  transition: all 0.2s ease;
}

.column-switcher-btn:hover {
  color: #4a6783;
  border-color: #4a6783;
}

.column-switcher-btn--active {
  background-color: #4a6783 !important;
  color: #fdf4eb !important;
  border-color: #4a6783 !important;
}

/* Binder Section / Group Styles */
.binder-section-title {
  font-family: Georgia, serif;
  letter-spacing: -0.01em;
}

/* Dynamic Wrapping Grids with Hardcoded Dimensions */
.binder-grid {
  display: grid;
  justify-content: center;
  width: 100%;
}

/* 1 Column View */
.binder-grid--1col {
  grid-template-columns: repeat(auto-fit, 267.75px);
  gap: 24px;
}
.binder-grid--1col .card-scale-wrapper {
  width: 267.75px;
  height: 374px;
  position: relative;
}
.binder-grid--1col .card-scaled-content {
  width: 315px;
  height: 440px;
  position: absolute;
  top: 0;
  left: 0;
  transform: scale(0.85);
  transform-origin: top left;
}

/* 2 Columns View */
.binder-grid--2col {
  grid-template-columns: repeat(2, 132.3px);
  gap: 16px;
}
.binder-grid--2col .card-scale-wrapper {
  width: 132.3px;
  height: 184.8px;
  position: relative;
}
.binder-grid--2col .card-scaled-content {
  width: 315px;
  height: 440px;
  position: absolute;
  top: 0;
  left: 0;
  transform: scale(0.42);
  transform-origin: top left;
}

/* 3 Columns View */
.binder-grid--3col {
  grid-template-columns: repeat(3, 88.2px);
  gap: 10px;
}
.binder-grid--3col .card-scale-wrapper {
  width: 88.2px;
  height: 123.2px;
  position: relative;
}
.binder-grid--3col .card-scaled-content {
  width: 315px;
  height: 440px;
  position: absolute;
  top: 0;
  left: 0;
  transform: scale(0.28);
  transform-origin: top left;
}

/* Desktop sizing overrides */
@media (min-width: 640px) {
  /* 1 Column View - Native Size */
  .binder-grid--1col {
    grid-template-columns: repeat(auto-fit, 315px);
  }
  .binder-grid--1col .card-scale-wrapper {
    width: 315px;
    height: 440px;
  }
  .binder-grid--1col .card-scaled-content {
    transform: scale(1);
  }

  /* 2 Columns View - Larger Scales */
  .binder-grid--2col {
    grid-template-columns: repeat(2, 267.75px);
  }
  .binder-grid--2col .card-scale-wrapper {
    width: 267.75px;
    height: 374px;
  }
  .binder-grid--2col .card-scaled-content {
    transform: scale(0.85);
  }

  /* 3 Columns View - Larger Scales */
  .binder-grid--3col {
    grid-template-columns: repeat(3, 189px);
  }
  .binder-grid--3col .card-scale-wrapper {
    width: 189px;
    height: 264px;
  }
  .binder-grid--3col .card-scaled-content {
    transform: scale(0.6);
  }
}

/* Edit Menu Dropdown Options Panel */
.edit-dropdown-menu {
  position: absolute;
  top: 36px;
  left: 0;
  background-color: var(--binder-dropdown-bg, #4a6783);
  border: 1.5px solid #fdf4eb;
  border-radius: 4px;
  width: 210px;
  z-index: 50;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.edit-dropdown-item {
  padding: 11px 16px;
  color: #fdf4eb;
  font-family: var(--font-family-serif);
  font-size: 13px;
  font-weight: bold;
  text-align: left;
  cursor: pointer;
  border-bottom: 1px solid rgba(253, 244, 235, 0.2);
  transition: all 0.2s ease;
}

.edit-dropdown-item:hover:not(.color-selection-item) {
  background-color: rgba(253, 244, 235, 0.15);
}

.color-selection-item {
  cursor: default;
  border-bottom: none;
  background-color: rgba(0, 0, 0, 0.1);
  padding: 12px 16px;
}

/* Fullscreen overlays for editing profiles */
.edit-overlay-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 100;
  backdrop-filter: blur(8px);
}

.edit-overlay-backdrop {
  position: absolute;
  inset: 0;
  background-color: rgba(63, 63, 53, 0.7);
}

.edit-overlay-card {
  position: relative;
  z-index: 10;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(253, 244, 235, 0.15);
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Transistions definitions */
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

<style>
/* Global layout overrides for the profile binder page on mobile viewports */
@media (max-width: 639px) {
  .app-page-wrapper:has(.binder-cover-box) .app-page-main {
    padding-left: 0 !important;
    padding-right: 0 !important;
  }
}
</style>
