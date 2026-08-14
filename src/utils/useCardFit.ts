import { computed, onScopeDispose, ref, watch, type Ref } from 'vue';

/**
 * Read a numeric CSS variable from the :root element (CSS values cannot be
 * imported directly). Returns null (rather than throwing) when the stylesheet
 * has not been applied yet, so callers can retry.
 */
function readToken(name: string): number | null {
  const value = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(name)
  );
  return Number.isFinite(value) ? value : null;
}

/**
 * Scale the trading card to fit a measured container.
 *
 * @param container Template ref of the element the card must fit; observed
 *   from mount to unmount.
 * @returns Computed inline style holding the three card tokens, or null until
 *   the :root tokens are readable (a brief cold-load window before the
 *   stylesheet applies). Bind it to the container or any ancestor of the card:
 *   the custom properties override the :root tokens for every descendant that
 *   consumes them. While null the card falls back to the :root tokens, so it
 *   may flash at its unscaled size for a frame on a cold load.
 */
export function useCardFit(container: Ref<HTMLElement | null>) {
  // Tokens are read lazily: on a cold load the stylesheet may not be applied
  // yet, so getComputedStyle reports nothing. Re-read (up to a few frames)
  // until :root resolves; the returned style stays null until then.
  const baseWidth = ref<number | null>(null);
  const baseHeight = ref<number | null>(null);
  const maxScale = ref<number | null>(null);
  const scale = ref<number | null>(null);

  let attemptsLeft = 10;
  const syncTokens = () => {
    const w = readToken('--card-base-width');
    const h = readToken('--card-base-height');
    const s = readToken('--card-scale-full');
    if (w !== null && h !== null && s !== null) {
      baseWidth.value = w;
      baseHeight.value = h;
      maxScale.value = s;
      if (scale.value === null) scale.value = s;
    } else if (attemptsLeft-- > 0) {
      requestAnimationFrame(syncTokens);
    }
  };
  syncTokens();

  const observer = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    if (width > 0 && height > 0 && maxScale.value !== null) {
      scale.value = Math.min(
        maxScale.value,
        width / baseWidth.value!,
        height / baseHeight.value!
      );
    }
  });

  // One observer follows the ref as the container mounts and unmounts.
  watch(container, (el, prev) => {
    if (prev) observer.unobserve(prev);
    if (el) observer.observe(el);
  });
  onScopeDispose(() => observer.disconnect());

  return computed(() => {
    if (baseWidth.value === null || baseHeight.value === null || scale.value === null) {
      return null;
    }
    return {
      '--card-scale-full': String(scale.value),
      '--card-width': `${baseWidth.value * scale.value}px`,
      '--card-height': `${baseHeight.value * scale.value}px`,
    };
  });
}
