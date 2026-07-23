<script setup lang="ts">
import { computed } from 'vue';
import type { Icon } from '@wikimedia/codex-icons';

// Renders a Wikimedia Codex icon (from @wikimedia/codex-icons) as an inline
// SVG at an explicit pixel size, inheriting `currentColor` — a drop-in
// replacement for the Phosphor icon components we used previously.
//
// Codex icon data is either a raw SVG-inner-markup string, or an object with
// direction-specific / path variants ({ ltr, rtl, path, shouldFlip, ... }).
// The app is LTR-only, so we resolve to the `ltr` (or `path`/`default`)
// variant, recursing since those can themselves be objects.
const props = withDefaults(defineProps<{
  icon: Icon;
  size?: number;
}>(), {
  size: 20,
});

const resolve = (i: unknown): string => {
  if (typeof i === 'string') return i;
  if (i && typeof i === 'object') {
    const o = i as Record<string, unknown>;
    return resolve(o.path ?? o.ltr ?? o.default ?? '');
  }
  return '';
};

const inner = computed<string>(() => resolve(props.icon));
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    class="app-icon"
    v-html="inner"
  />
</template>

<style scoped>
.app-icon {
  display: inline-block;
  flex-shrink: 0;
  vertical-align: middle;
}
</style>
