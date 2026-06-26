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
  color: #fdf4eb;
  font-family: var(--font-family-serif), Georgia, serif;
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
  width: 109px;
  height: 44px;
  background-color: #4a6783;
  border-radius: 2px;
  font-size: 16px;
  gap: 6px;
}

.app-btn-primary:hover:not(:disabled) {
  background-color: #3b546d;
}

.app-btn-primary.is-disabled {
  color: rgba(253, 244, 235, 0.5);
}

/* True button variant */
.app-btn-true {
  flex: 1;
  height: 61px;
  border-radius: 3px;
  font-size: 22px;
  gap: 12px;
  background-color: #3f3f35;
  color: #fdf4eb;
}

.app-btn-true:hover:not(:disabled) {
  background-color: #4d4d41;
}

/* False button variant */
.app-btn-false {
  flex: 1;
  height: 61px;
  border-radius: 3px;
  font-size: 22px;
  gap: 12px;
  background-color: #fdf4eb;
  color: #3f3f35;
}

.app-btn-false:hover:not(:disabled) {
  background-color: #f0e5d5;
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
