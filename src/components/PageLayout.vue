<script setup lang="ts">
import { ref } from 'vue';
import AppHeader from './AppHeader.vue';

defineProps<{
  displayedPoints?: number;
  gachaActive?: boolean;
  backgroundColor?: string;
}>();

const emit = defineEmits<{
  (e: 'activate'): void;
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
    />
    <main class="app-page-main">
      <slot />
    </main>
  </div>
</template>
