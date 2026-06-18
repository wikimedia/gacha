<script setup lang="ts">
defineProps<{
  message?: string;
}>();
</script>

<template>
  <div class="flex-grow flex flex-col justify-center items-center py-20 w-full min-h-[300px]" data-testid="custom-loader">
    <!-- DaisyUI loading spinner in brand color -->
    <span class="loading loading-spinner loading-lg text-figma-blue"></span>
    
    <!-- Loading Message -->
    <span class="mt-5 font-serif text-xs uppercase tracking-widest text-figma-charcoal opacity-80 animate-pulse select-none">
      {{ message || 'Loading' }}
    </span>
  </div>
</template>

<style scoped>
</style>

