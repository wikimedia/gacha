<script setup lang="ts">
/**
 * PerfHud — a tiny on-device overlay for the foil frame clock's metrics, so the
 * lag signal can be watched on a real phone (Safari has no visible console).
 *
 * Dev-only diagnostic: it renders nothing unless the URL carries `?debug=perf`,
 * so it never shows for real users. Reads the reactive `stats` snapshot that
 * frameClock refreshes each ~2s window while foils animate.
 */
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { stats } from './frameClock';

const route = useRoute();
const visible = computed(() => route.query.debug === 'perf');
</script>

<template>
  <div v-if="visible" class="perf-hud" :class="{ 'perf-hud--stressed': stats.stressed }">
    <span>foil</span>
    <span>fps {{ stats.fps.toFixed(1) }}</span>
    <span>drop {{ Math.round(stats.drop * 100) }}%</span>
    <span>active {{ stats.active }}</span>
    <span v-if="stats.stressed" class="perf-hud__flag">STRESSED</span>
  </div>
</template>

<style scoped>
.perf-hud {
  position: fixed;
  bottom: 8px;
  left: 8px;
  z-index: 99999;
  display: flex;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  line-height: 1.4;
  color: #7CFC00;
  background: rgba(0, 0, 0, 0.72);
  pointer-events: none;
  user-select: none;
  white-space: nowrap;
}

.perf-hud--stressed {
  color: #ff5252;
}

.perf-hud__flag {
  font-weight: 700;
}
</style>
