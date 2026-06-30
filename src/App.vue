<script setup lang="ts">
import { onMounted } from 'vue';
import { prefetchAllFrames } from './components/shinyFrames';

// Warm every rarity's foil frames once the app is idle, so a card's intro is
// ready to play the instant it comes into view (no first-frame fetch hitch).
onMounted(() => {
  const warm = () => prefetchAllFrames();
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(warm);
  } else {
    setTimeout(warm, 0);
  }
});
</script>

<template>
  <router-view />
</template>

<style>
/* Base typography resets and standard inputs spacing overrides */
body {
  margin: 0;
  padding: 0;
}
</style>
