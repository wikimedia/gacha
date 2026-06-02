<script setup lang="ts">
import { ref } from 'vue';
import AppHeader from './AppHeader.vue';

defineProps<{
  displayedPoints?: number;
  gachaActive?: boolean;
  backgroundColor?: string;
  isWide?: boolean;
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
      ref="headerRef"
      :displayed-points="displayedPoints" 
      :gacha-active="gachaActive" 
      @activate="emit('activate')"
      @edit-profile="emit('edit-profile')"
    />
    <main class="app-page-main" :class="{ 'app-page-main-wide': isWide }">
      <slot />
    </main>
  </div>
</template>
