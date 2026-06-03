<script setup lang="ts">
import { ref } from 'vue';
import AppHeader from './AppHeader.vue';

defineProps<{
  displayedPoints?: number;
  gachaActive?: boolean;
  backgroundColor?: string;
  isWide?: boolean;
  isAnimating?: boolean;
  hideHeader?: boolean;
}>();

const emit = defineEmits<{
  (e: 'activate'): void;
  (e: 'edit-profile'): void;
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
    :style="{ backgroundColor: backgroundColor || undefined }"
  >
    <AppHeader 
      v-if="!hideHeader"
      ref="headerRef"
      :displayed-points="displayedPoints" 
      :gacha-active="gachaActive" 
      :is-animating="isAnimating"
      @activate="emit('activate')"
      @edit-profile="emit('edit-profile')"
    />
    <main class="app-page-main" :class="{ 'app-page-main-wide': isWide }">
      <slot />
    </main>
  </div>
</template>
