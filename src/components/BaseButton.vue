<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'true' | 'false';
    disabled?: boolean;
    loading?: boolean;
  }>(),
  {
    variant: 'primary',
    disabled: false,
    loading: false,
  }
);
</script>

<template>
  <button
    :class="[
      'app-btn',
      `app-btn-${variant}`,
      { 'is-disabled': disabled || loading },
      { 'is-loading': loading }
    ]"
    :disabled="disabled || loading"
  >
    <span v-if="loading" class="app-btn-spinner"></span>
    <span v-else-if="$slots.icon" class="app-btn-icon">
      <slot name="icon" />
    </span>
    <slot />
  </button>
</template>

<style scoped>
.app-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--border-radius-button);
  color: var(--color-inverted-fixed);
  font-family: var(--font-family-system-sans);
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease, transform 0.1s ease;
  user-select: none;
  box-sizing: border-box;
}

.app-btn:active:not(:disabled) {
  transform: scale(0.97);
}

.app-btn:disabled {
  cursor: not-allowed;
}

/* Play button variant (primary) */
.app-btn-primary {
  width: 100%;
  max-width: var(--button-row-max-width);
  height: 44px;
  padding: 0 16px;
  background-color: var(--color-progressive);
  font-size: 14px;
  gap: 6px;
}

.app-btn-primary:hover:not(:disabled) {
  background-color: var(--color-progressive--hover);
}

.app-btn-primary.is-disabled {
  color: rgba(255, 255, 255, 0.5);
}

/* Fact / "true" button variant (dark, filled) */
.app-btn-true {
  flex: 1;
  height: 44px;
  padding: 0 16px;
  font-size: 14px;
  gap: 6px;
  background-color: var(--color-figma-ink);
  color: var(--color-figma-paper);
}

.app-btn-true:hover:not(:disabled) {
  background-color: var(--color-figma-ink-dark);
}

/* Fake / "false" button variant (light, outlined) */
.app-btn-false {
  flex: 1;
  height: 44px;
  padding: 0 16px;
  font-size: 14px;
  gap: 6px;
  background-color: var(--color-figma-paper);
  color: var(--color-figma-ink);
  border: 1px solid var(--color-figma-ink);
}

.app-btn-false:hover:not(:disabled) {
  background-color: var(--color-figma-paper-dark);
}

.app-btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.app-btn-spinner {
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spinner-spin 0.75s linear infinite;
  display: inline-block;
  flex-shrink: 0;
}

@keyframes spinner-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
