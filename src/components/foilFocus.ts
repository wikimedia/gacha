/**
 * foilFocus — a shared signal that pauses the foil animation of *background*
 * cards while a card is focused into a modal.
 *
 * When a CardDetailModal opens over a grid (the profile binder, the results
 * screen), the cards behind it are still "in view" per their Intersection
 * Observer and would keep animating — burning CPU/GPU for content the user
 * can't even see. The modal raises this flag while open; every `shinyTrigger:
 * 'auto'` card (see Card.vue) treats the flag as "not in view" and idles. The
 * focused card itself is exempt because the modal renders it with an explicit
 * `shinyTrigger: 'on'`.
 *
 * A counter (not a boolean) tolerates overlapping/re-entrant focus surfaces
 * without one closing prematurely resuming the others.
 */
import { ref, computed } from 'vue';

const focusCount = ref(0);

/** True while any focused-card surface is open — background foils should idle. */
export const backgroundFoilPaused = computed(() => focusCount.value > 0);

/** Claim a focus token (background foils pause). Pair with popFoilFocus(). */
export function pushFoilFocus(): void {
  focusCount.value++;
}

/** Release a focus token; background foils resume when the count hits zero. */
export function popFoilFocus(): void {
  if (focusCount.value > 0) focusCount.value--;
}
