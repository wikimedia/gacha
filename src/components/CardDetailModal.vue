<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { Card } from '../stores/useGameStore';
import CardComp from './Card.vue';
import { PhCaretLeft, PhCaretRight, PhX } from '@phosphor-icons/vue';

const props = withDefaults(defineProps<{
  show: boolean;
  cards: Card[];
  initialIndex?: number;
  isCorrectArray?: boolean[]; // For results screen check/cross badges
}>(), {
  initialIndex: 0,
});

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const activeIndex = ref(props.initialIndex);
const showCopyToast = ref(false);

// Keep track of active index when initialIndex changes or modal opens
watch(() => props.initialIndex, (newVal) => {
  activeIndex.value = newVal;
});

watch(() => props.show, (newVal) => {
  if (newVal) {
    activeIndex.value = props.initialIndex;
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});

const activeCard = computed(() => props.cards[activeIndex.value] || null);

const handlePrev = () => {
  if (activeIndex.value > 0) {
    activeIndex.value--;
  }
};

const handleNext = () => {
  if (activeIndex.value < props.cards.length - 1) {
    activeIndex.value++;
  }
};

// Keyboard navigation
const handleKeyDown = (e: KeyboardEvent) => {
  if (!props.show) return;
  if (e.key === 'ArrowLeft') {
    handlePrev();
  } else if (e.key === 'ArrowRight') {
    handleNext();
  } else if (e.key === 'Escape') {
    emit('close');
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  document.body.style.overflow = '';
});

// Touch swipe navigation
const touchStartX = ref(0);
const touchStartY = ref(0);

const handleTouchStart = (e: TouchEvent) => {
  touchStartX.value = e.touches[0].clientX;
  touchStartY.value = e.touches[0].clientY;
};

const handleTouchEnd = (e: TouchEvent) => {
  const diffX = e.changedTouches[0].clientX - touchStartX.value;
  const diffY = e.changedTouches[0].clientY - touchStartY.value;
  
  if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
    if (diffX > 0) {
      handlePrev();
    } else {
      handleNext();
    }
  }
};

// Action button handlers
const handleLearnMore = () => {
  if (activeCard.value?.wikipediaLink) {
    window.open(activeCard.value.wikipediaLink, '_blank', 'noopener,noreferrer');
  }
};

const handleShare = () => {
  if (activeCard.value?.wikipediaLink) {
    navigator.clipboard.writeText(activeCard.value.wikipediaLink)
      .then(() => {
        showCopyToast.value = true;
        setTimeout(() => {
          showCopyToast.value = false;
        }, 3000);
      })
      .catch(err => console.error('Failed to copy card link:', err));
  }
};
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div 
        v-if="show" 
        class="fixed inset-0 z-50 flex flex-col justify-between items-center py-8 select-none bg-[#3f3f35]/90 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
      >
        <!-- Close Button (✕) -->
        <button 
          @click="emit('close')" 
          class="absolute top-6 right-6 text-white/80 hover:text-white transition-colors duration-200 cursor-pointer p-2 z-50 outline-none bg-transparent border-none"
          aria-label="Close modal"
        >
          <PhX :size="28" weight="bold" />
        </button>

        <!-- Spacer to push content down -->
        <div class="h-6"></div>

        <!-- Carousel Container -->
        <div class="relative w-full overflow-hidden flex items-center py-4 flex-grow">
          <div 
            class="carousel-track"
            :style="{ transform: 'translateX(calc(50vw - 157.5px - ' + (activeIndex * 335) + 'px))' }"
            @touchstart="handleTouchStart"
            @touchend="handleTouchEnd"
          >
            <div 
              v-for="(card, index) in cards" 
              :key="card.id"
              class="relative w-[315px] h-[440px] flex-shrink-0 transition-all duration-300"
              :class="{ 
                'opacity-40 scale-95 cursor-pointer': index !== activeIndex,
                'scale-100 active-card-shadow': index === activeIndex
              }"
              @click="index !== activeIndex ? activeIndex = index : null"
            >
              <!-- Card component itself -->
              <CardComp :card="card" :show-link="false" />

              <!-- Correct/Incorrect badge overlays (Results Page) -->
              <div 
                v-if="isCorrectArray && isCorrectArray[index] === true"
                class="modal-badge modal-badge--correct shadow-md"
                title="Correct"
              >
                ✓
              </div>
              <div 
                v-else-if="isCorrectArray && isCorrectArray[index] === false"
                class="modal-badge modal-badge--incorrect shadow-md"
                title="Incorrect"
              >
                ✗
              </div>

              <!-- Fake Card Overlay (stamp) -->
              <div 
                v-if="!card.isReal"
                class="modal-card-fake-overlay"
              ></div>
              <div
                v-if="!card.isReal"
                class="modal-card-fake-stamp"
              >
                <div class="fake-stamp-text">
                  FAKE
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom Controls & Actions -->
        <div class="flex flex-col items-center w-full max-w-[326px] gap-6 px-4">
          <!-- Dots/Arrow Navigation Row -->
          <div class="flex items-center justify-between w-full px-2">
            <!-- Left Chevron -->
            <button 
              @click="handlePrev" 
              :disabled="activeIndex === 0"
              class="w-10 h-10 flex items-center justify-center text-white disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed hover:text-white/80 transition-colors outline-none bg-transparent border-none"
              aria-label="Previous card"
            >
              <PhCaretLeft :size="28" weight="bold" />
            </button>

            <!-- Dots pagination OR numerical indicator -->
            <div v-if="cards.length <= 10" class="flex items-center justify-center gap-2">
              <button 
                v-for="(_, index) in cards" 
                :key="'dot-' + index"
                @click="activeIndex = index"
                class="w-2 h-2 rounded-full transition-all duration-300 outline-none bg-transparent border-none"
                :class="index === activeIndex ? 'bg-white scale-125' : 'bg-white/30 hover:bg-white/50'"
                :aria-label="'Go to card ' + (index + 1)"
              ></button>
            </div>
            <div v-else class="text-white/80 font-serif text-sm font-bold tracking-widest select-none">
              {{ activeIndex + 1 }} / {{ cards.length }}
            </div>

            <!-- Right Chevron -->
            <button 
              @click="handleNext" 
              :disabled="activeIndex === cards.length - 1"
              class="w-10 h-10 flex items-center justify-center text-white disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed hover:text-white/80 transition-colors outline-none bg-transparent border-none"
              aria-label="Next card"
            >
              <PhCaretRight :size="28" weight="bold" />
            </button>
          </div>

          <!-- Action buttons -->
          <div class="flex gap-3 w-full pb-4">
            <button 
              @click="handleLearnMore"
              class="flex-1 bg-[#fdf4eb] text-[#4a6783] border-none py-3.5 px-4 rounded-[2px] font-serif font-black text-sm uppercase tracking-wider shadow-[0px_0px_6px_rgba(0,0,0,0.25)] hover:bg-white active:scale-[0.98] transition-all cursor-pointer text-center outline-none select-none"
            >
              Learn More
            </button>
            <button 
              @click="handleShare"
              class="flex-1 bg-[#4a6783] text-[#fdf4eb] border-none py-3.5 px-4 rounded-[2px] font-serif font-black text-sm uppercase tracking-wider shadow-[0px_0px_6px_rgba(0,0,0,0.25)] hover:bg-[#5b7e9f] active:scale-[0.98] transition-all cursor-pointer text-center outline-none select-none"
            >
              Share
            </button>
          </div>
        </div>

        <!-- Copy Toast Notification Overlay -->
        <Transition name="toast-fade">
          <div v-if="showCopyToast" class="modal-toast-notification">
            📋 Card link copied to clipboard!
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.carousel-track {
  display: flex;
  gap: 20px;
  align-items: center;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
}

.active-card-shadow {
  box-shadow: 
    0 15px 35px rgba(0, 0, 0, 0.4),
    0 5px 15px rgba(0, 0, 0, 0.2);
}

/* Modal Check/Cross Badges */
.modal-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  border: 3px solid #ffffff;
  z-index: 30;
  font-family: sans-serif;
  font-weight: 900;
  font-size: 20px;
  color: #ffffff;
}

.modal-badge--correct {
  background-color: #2a9d8f;
}

.modal-badge--incorrect {
  background-color: #e63946;
}

/* FAKE Overlay and Stamp */
.modal-card-fake-overlay {
  position: absolute;
  inset: 14px;
  background-color: rgba(148, 136, 119, 0.35);
  mix-blend-mode: hard-light;
  pointer-events: none;
  z-index: 10;
}

.modal-card-fake-stamp {
  position: absolute;
  inset: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  user-select: none;
  z-index: 20;
  mix-blend-mode: overlay;
}

.fake-stamp-text {
  transform: rotate(-45deg);
  font-family: 'Georgia', serif;
  font-weight: 900;
  color: #ffffff;
  font-size: 48px;
  letter-spacing: 0.05em;
  line-height: 1;
  text-align: center;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

/* Toast Alert Style inside Modal */
.modal-toast-notification {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  background-color: #fdf4eb;
  color: #3f3f35;
  border: 1.5px solid #c4b69d;
  padding: 10px 20px;
  border-radius: 4px;
  font-family: var(--font-family-serif, Georgia, serif);
  font-size: 13px;
  font-weight: bold;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
}

/* Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.toast-fade-enter-active {
  animation: toastPop 0.3s ease-out;
}
.toast-fade-leave-active {
  transition: opacity 0.2s ease-in;
}
.toast-fade-leave-to {
  opacity: 0;
}

@keyframes toastPop {
  0% {
    transform: translateX(-50%) translateY(20px) scale(0.9);
    opacity: 0;
  }
  100% {
    transform: translateX(-50%) translateY(0) scale(1);
    opacity: 1;
  }
}
</style>
