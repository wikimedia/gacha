<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore';
import { useGameStore } from '../stores/useGameStore';
import type { Card } from '../stores/useGameStore';
import CardComp from '../components/Card.vue';
import CardDetailModal from '../components/CardDetailModal.vue';
import PageLayout from '../components/PageLayout.vue';
import Loader from '../components/Loader.vue';
import { 
  PhPencilSimple,
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
const dropdownDirection = ref<'down' | 'up'>('down');
const editBtnRef = ref<HTMLElement | null>(null);

const toggleEditDropdown = () => {
  if (!showEditDropdown.value && editBtnRef.value) {
    const rect = editBtnRef.value.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    dropdownDirection.value = spaceBelow < 220 ? 'up' : 'down';
  }
  showEditDropdown.value = !showEditDropdown.value;
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && showEditDropdown.value) {
    showEditDropdown.value = false;
  }
};
const isShowcaseMode = ref(false);
const editingField = ref<'username' | 'bio' | 'binderColor' | null>(null);
const editInputValue = ref('');
const editError = ref('');

// Usernames must be longer than 3 characters.
const MIN_USERNAME_LENGTH = 4;
const showShareToast = ref(false);

// Card detail modal state
const isDetailModalOpen = ref(false);
const detailModalCards = ref<Card[]>([]);
const detailModalInitialIndex = ref(0);

const openCardDetail = (card: Card, cardsList: Card[]) => {
  if (isShowcaseMode.value) return;
  detailModalCards.value = cardsList;
  detailModalInitialIndex.value = cardsList.findIndex(c => c.id === card.id);
  isDetailModalOpen.value = true;
};



// Binder filtering & organization
const searchFilter = ref('');

// Dedup guard to prevent redundant profile loads on reactive triggers
let lastLoadKey = '';

// Fetch/sync profile details based on route
const loadProfile = async (force = false) => {
  const loadKey = `${profileId.value}|${authStore.isLoggedIn}|${authStore.user?.id ?? ''}`;
  if (!force && loadKey === lastLoadKey) {
    console.log(`loadProfile skipped (dedup): key="${loadKey}"`);
    return;
  }
  lastLoadKey = loadKey;

  console.log(`loadProfile triggered: profileId="${profileId.value}"`);
  isLoadingProfile.value = true;
  isLoadingCards.value = true;
  
  try {
    // For our own profile, look the row up by the authenticated user id rather
    // than the URL username. A freshly-signed-up user's persisted username can
    // briefly diverge from authStore.user.username (used to build the URL); a
    // username lookup would then miss and we'd drop the collection entirely.
    const lookupKey = isPrivateMode.value && authStore.user?.id
      ? authStore.user.id
      : profileId.value;
    const dbProfile = await gameStore.loadProfileFromDB(lookupKey);

    if (isPrivateMode.value && authStore.user) {
      // Own profile: trust in-memory state. Always render and always merge the
      // local collection with whatever the DB returned — freshly claimed or
      // migrated guest cards may not be reflected in the DB snapshot yet, and
      // the profile row itself may not have resolved. Falling back to [] here
      // (the old behavior when the lookup missed) is what made a new user's
      // collection vanish until they renamed and forced a reload.
      profileUser.value = dbProfile?.userProfile ?? {
        id: authStore.user.id,
        username: authStore.user.username,
        profilePic: authStore.user.profilePic,
        bio: authStore.user.bio,
        backgroundColor: authStore.user.backgroundColor || '#eaecf0',
        gdPoints: 0
      };
      editDisplayName.value = profileUser.value.username;
      editBio.value = profileUser.value.bio;
      binderColor.value = authStore.user.backgroundColor
        || dbProfile?.userProfile?.backgroundColor
        || '#4a6783';

      const dbCards = dbProfile?.cards ?? [];
      const dbCardIds = new Set(dbCards.map((c: any) => c.id));
      const localOnly = gameStore.collectedCards.filter(c => !dbCardIds.has(c.id));
      const mergedCards = [...dbCards, ...localOnly];

      profileCards.value = mergedCards;
      gameStore.collectedCards = mergedCards;
    } else if (dbProfile) {
      profileUser.value = dbProfile.userProfile;
      binderColor.value = dbProfile.userProfile.backgroundColor || '#4a6783';
      profileCards.value = dbProfile.cards;
    } else {
      // Mock profile fallback so page doesn't crash if they visit a random path
      profileUser.value = {
        id: `usr_${profileId.value.toLowerCase()}`,
        username: profileId.value,
        profilePic: `https://api.dicebear.com/7.x/identicon/svg?seed=${profileId.value}`,
        bio: 'Avid scholar and collector.',
        backgroundColor: '#eaecf0',
        gdPoints: 0
      };
      profileCards.value = [];

      binderColor.value = '#4a6783';
    }
  } catch (err) {
    console.error('Error fetching profile from database:', err);
  } finally {
    isLoadingProfile.value = false;
    isLoadingCards.value = false;
  }
};

onMounted(async () => {
  window.addEventListener('keydown', handleKeyDown);
  authStore.initAuth();
  gameStore.loadGuestState();
  isLoadingProfile.value = true;
  try {
    await loadProfile();
  } finally {
    isLoadingProfile.value = false;
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});

// Single consolidated watcher — only reacts to identity/route changes,
// NOT deep user object mutations (points, cards, etc.)
watch(
  [() => authStore.isLoggedIn, () => authStore.user?.id, () => route.params.id],
  () => {
    loadProfile();
  }
);

// profileCards is a snapshot taken inside loadProfile, so it doesn't react to
// the async guest-card migration / claim finishing after the initial load.
// When our own in-memory collection grows, re-run loadProfile to fold the new
// cards into the binder (loadProfile itself keeps the merge idempotent, so this
// settles after one pass).
watch(
  () => gameStore.collectedCards.length,
  (newLen, oldLen) => {
    if (isPrivateMode.value && newLen > (oldLen ?? 0)) {
      loadProfile(true);
    }
  }
);

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

const getContrastTextColor = (hexColor?: string) => {
  if (!hexColor) return '#fdf4eb';
  const color = hexColor.startsWith('#') ? hexColor.slice(1) : hexColor;
  if (color.length !== 6) return '#fdf4eb';
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  return y > 150 ? '#3f3f35' : '#fdf4eb';
};

const currentContrastColor = computed(() => {
  const activeColor = (editingField.value === 'binderColor' && editInputValue.value) 
    ? editInputValue.value 
    : binderColor.value;
  return getContrastTextColor(activeColor);
});

const updateBinderColor = async (color: string) => {
  binderColor.value = color;
  if (isPrivateMode.value) {
    await authStore.updateProfile({ backgroundColor: color });
  }
};

const startEditing = (field: 'username' | 'bio' | 'binderColor') => {
  editError.value = '';
  editingField.value = field;
  if (field === 'username') {
    editInputValue.value = editDisplayName.value;
  } else if (field === 'bio') {
    editInputValue.value = editBio.value;
  } else if (field === 'binderColor') {
    editInputValue.value = binderColor.value;
  }
  showEditDropdown.value = false;
};

const handleEditProfileField = (field: 'username' | 'bio' | 'showcase' | 'binderColor') => {
  showEditDropdown.value = false;
  if (field === 'username' || field === 'bio' || field === 'binderColor') {
    startEditing(field);
  } else if (field === 'showcase') {
    isShowcaseMode.value = true;
  }
};

const cancelEditing = () => {
  editingField.value = null;
  editInputValue.value = '';
  editError.value = '';
};

const saveEditing = async () => {
  editError.value = '';
  if (editingField.value === 'username') {
    const trimmed = editInputValue.value.trim();
    if (trimmed.length < MIN_USERNAME_LENGTH) {
      editError.value = `Username must be more than 3 characters.`;
      return;
    }
    editDisplayName.value = trimmed;
  } else if (editingField.value === 'bio') {
    editBio.value = editInputValue.value.trim();
  } else if (editingField.value === 'binderColor') {
    binderColor.value = editInputValue.value.trim();
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
    await loadProfile(true);
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
    @share-profile="handleShareProfile"
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
          Tap a card pin to highlight it as your profile picture.
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
              class="folder-tab-active flex items-center justify-center font-serif font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded-t-[6px]"
              :style="{ backgroundColor: binderColor, color: getContrastTextColor(binderColor) }"
            >
              Facts
            </div>
          </div>

          <!-- Right: Edit Profile options dropdown button -->
          <div v-if="isPrivateMode" class="relative mb-1.5 mr-2 sm:mr-0">
            <button 
              ref="editBtnRef"
              @click="toggleEditDropdown" 
              class="header-icon-btn"
              :class="{ 'header-icon-btn--active': showEditDropdown }"
              title="Edit Profile Options"
            >
              <PhPencilSimple :size="18" weight="bold" class="pb-[2px]" />
            </button>

            <!-- EDIT DROPDOWN MENU -->
            <transition name="dropdown-fade">
              <div 
                v-if="showEditDropdown" 
                class="edit-dropdown-menu" 
                :class="['edit-dropdown-menu--' + dropdownDirection]"
                :style="{ 
                  '--binder-dropdown-bg': binderColor,
                  '--binder-dropdown-text': getContrastTextColor(binderColor)
                }"
              >
                <div class="edit-dropdown-item" @click="handleEditProfileField('username')">
                  Edit Name
                </div>
                <div class="edit-dropdown-item" @click="handleEditProfileField('bio')">
                  Edit Description
                </div>
                <div class="edit-dropdown-item" @click="handleEditProfileField('showcase')">
                  Change Profile Picture
                </div>
                <div class="edit-dropdown-item" @click="handleEditProfileField('binderColor')">
                  Change Binder Color
                </div>
              </div>
            </transition>
          </div>
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
                      <div 
                        class="card-scaled-content"
                        :class="{ 'cursor-pointer': !isShowcaseMode }"
                        @click="openCardDetail(card, sectionCards)"
                      >
                        <!-- Render Card itself -->
                        <CardComp :card="card" :show-link="false" />

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
      <div 
        class="edit-overlay-card w-full max-w-md mx-4 mt-[15vh] p-6 shadow-2xl rounded-[4px] relative border" 
        :style="{ 
          backgroundColor: (editingField === 'binderColor' && editInputValue) ? editInputValue : binderColor,
          borderColor: `${currentContrastColor}20`,
          color: currentContrastColor
        }"
      >
        <button 
          @click="cancelEditing" 
          class="absolute right-4 top-4 font-bold text-sm cursor-pointer opacity-80 hover:opacity-100"
          :style="{ color: currentContrastColor }"
        >
          ✕
        </button>

        <h3 
          class="font-serif text-lg font-black border-b pb-2 mb-4"
          :style="{ color: currentContrastColor, borderColor: `${currentContrastColor}20` }"
        >
          {{ editingField === 'username' ? 'Edit Username' : (editingField === 'bio' ? 'Edit Bio Description' : 'Edit Binder Color') }}
        </h3>
        
        <div class="form-control w-full mb-6">
          <label class="label py-1">
            <span 
              class="label-text font-serif font-black text-xs uppercase opacity-80"
              :style="{ color: currentContrastColor }"
            >
              {{ editingField === 'username' ? 'Display Name' : (editingField === 'bio' ? 'Encyclopedia Bio' : 'Binder Cover Color') }}
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
          <p
            v-if="editingField === 'username' && editError"
            class="text-error text-xs font-sans font-semibold mt-2"
          >
            {{ editError }}
          </p>
          <textarea 
            v-else-if="editingField === 'bio'"
            v-model="editInputValue"
            rows="4"
            class="textarea w-full font-sans bg-[#fdf4eb] text-[#3f3f35] border-none rounded-[2px] mt-1 resize-none leading-relaxed text-sm"
            placeholder="Write binder biography..."
          ></textarea>
          <div v-else-if="editingField === 'binderColor'" class="flex items-center gap-3 w-full bg-[#fdf4eb] p-3 rounded-[2px] mt-1">
            <label class="relative w-10 h-10 rounded-full border border-[#3f3f35]/20 overflow-hidden cursor-pointer flex-shrink-0">
              <input 
                type="color" 
                v-model="editInputValue" 
                class="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              />
              <div class="w-full h-full" :style="{ backgroundColor: editInputValue }"></div>
            </label>
            <div class="flex-grow flex flex-col text-left">
              <span class="text-[9px] font-sans font-bold text-[#888888] uppercase tracking-wide">Hex Code</span>
              <input 
                type="text" 
                v-model="editInputValue" 
                class="bg-transparent font-mono text-sm border-none w-full p-0 text-[#3f3f35] focus:ring-0 focus:outline-none"
                placeholder="#4a6783"
                @keyup.enter="saveEditing"
              />
            </div>
          </div>
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
            class="btn btn-outline btn-sm flex-1 font-bold uppercase tracking-wider cursor-pointer"
            :style="{ borderColor: currentContrastColor, color: currentContrastColor }"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
    <!-- Card Detail Modal -->
    <CardDetailModal
      :show="isDetailModalOpen"
      :cards="detailModalCards"
      :initial-index="detailModalInitialIndex"
      @close="isDetailModalOpen = false"
    />
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
}

.edit-dropdown-menu--down {
  top: 36px;
  bottom: auto;
}

.edit-dropdown-menu--up {
  bottom: 36px;
  top: auto;
}

.edit-dropdown-item {
  padding: 11px 16px;
  color: var(--binder-dropdown-text, #fdf4eb);
  font-family: var(--font-family-serif);
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

.edit-dropdown-menu[style*="--binder-dropdown-text:#3f3f35"] .edit-dropdown-item:hover:not(.color-selection-item),
.edit-dropdown-menu[style*="--binder-dropdown-text: #3f3f35"] .edit-dropdown-item:hover:not(.color-selection-item) {
  background-color: rgba(0, 0, 0, 0.08);
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

/* Transitions definitions */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: all 0.2s ease;
}

.edit-dropdown-menu--down.dropdown-fade-enter-from,
.edit-dropdown-menu--down.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.edit-dropdown-menu--up.dropdown-fade-enter-from,
.edit-dropdown-menu--up.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
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
