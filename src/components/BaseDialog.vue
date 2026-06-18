<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue';

const props = withDefaults(defineProps<{
  show: boolean;
  title?: string;
  closeOnBackdrop?: boolean;
}>(), {
  closeOnBackdrop: true,
});

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const handleBackdropClick = () => {
  if (props.closeOnBackdrop) {
    emit('close');
  }
};

const handleEscape = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.show) {
    emit('close');
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleEscape);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape);
});

// Prevent background scrolling when dialog is open
watch(() => props.show, (newShow) => {
  if (newShow) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}, { immediate: true });
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div 
        v-if="show" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-x-hidden overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        <!-- Backdrop with warm dark overlay and blur -->
        <div 
          class="fixed inset-0 bg-[#3f3f35]/90 backdrop-blur-sm transition-opacity" 
          @click="handleBackdropClick"
        ></div>

        <!-- Dialog container/panel -->
        <Transition name="dialog-scale">
          <div 
            v-if="show"
            class="relative w-full max-w-sm bg-[#fdf4eb] border-2 border-[#c4b69d] shadow-[0_12px_36px_rgba(0,0,0,0.35)] rounded-sm overflow-hidden z-10 text-left transition-all flex flex-col"
          >
            <!-- Header section -->
            <header class="flex items-center justify-between px-5 py-4 border-b border-[#c4b69d]/40">
              <slot name="header">
                <h3 class="font-serif font-black text-xl text-[#4a6783] leading-none m-0">
                  {{ title || '' }}
                </h3>
              </slot>
              
              <!-- Close button -->
              <button 
                @click="emit('close')"
                class="btn-close flex items-center justify-center w-8 h-8 rounded-full border border-transparent hover:bg-black/5 hover:border-[#c4b69d]/40 text-[#54595d] transition-all"
                aria-label="Close dialog"
              >
                <!-- Custom close 'X' icon from Figma design -->
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </header>

            <!-- Main Body slot -->
            <div class="px-5 py-4 flex-grow overflow-y-auto">
              <slot />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Fade transition for backdrop */
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.25s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

/* Scale & Slide transition for dialog panel */
.dialog-scale-enter-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.dialog-scale-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.dialog-scale-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(12px);
}
.dialog-scale-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(8px);
}

.btn-close {
  cursor: pointer;
  outline: none;
}
</style>
