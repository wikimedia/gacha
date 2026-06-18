<script setup lang="ts">
import { ref } from 'vue';
import AppHeader from './AppHeader.vue';
import type { Category } from '../stores/useGameStore';

defineProps<{
  displayedPoints?: number;
  gachaActive?: boolean;
  isWide?: boolean;
  isAnimating?: boolean;
  hideHeader?: boolean;
  activeMainCategory?: Category;
  gameActive?: boolean;
}>();

const emit = defineEmits<{
  (e: 'activate'): void;
  (e: 'edit-profile'): void;
  (e: 'quit-game'): void;
}>();

const headerRef = ref<any>(null);

defineExpose({
  openAuthModal() {
    headerRef.value?.openAuthModal();
  }
});
</script>

<template>
  <div 
    class="app-page-wrapper"
  >
    <AppHeader 
      v-if="!hideHeader"
      ref="headerRef"
      :displayed-points="displayedPoints" 
      :gacha-active="gachaActive" 
      :is-animating="isAnimating"
      :active-main-category="activeMainCategory"
      :game-active="gameActive"
      @activate="emit('activate')"
      @edit-profile="emit('edit-profile')"
      @quit-game="emit('quit-game')"
    />
    <main class="app-page-main" :class="{ 'app-page-main-wide': isWide }">
      <slot />
    </main>
  </div>
</template>
