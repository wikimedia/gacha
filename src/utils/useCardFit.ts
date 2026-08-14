import { computed, onScopeDispose, ref, watch, type Ref } from 'vue';

/**
 * Fallbacks mirroring the :root card tokens in style.css. WebKit can run
 * module scripts before the stylesheet's CSSOM is applied, so a token read
 * during component setup may come back empty on iOS Safari; throwing there
 * aborted the mount of the calling component and its later siblings.
 */
const TOKEN_FALLBACKS: Record<string, number> = {
  '--card-base-width': 315,
  '--card-base-height': 440,
  '--card-scale-full': 1.1302,
};

/**
 * Read a numeric CSS variable from the :root element (CSS values cannot be
 * imported directly), falling back to the mirrored constant when the
 * stylesheet has not been applied yet.
 */
function readToken(name: string): number {
  const value = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(name)
  );
  if (!Number.isFinite(value)) {
    console.warn(`useCardFit: cannot read ${name} from :root, using fallback`);
    return TOKEN_FALLBACKS[name];
  }
  return value;
}

/**
 * Scale the trading card to fit a measured container.
 *
 * @param container Template ref of the element the card must fit; observed
 *   from mount to unmount.
 * @returns Computed inline style holding the three card tokens. Bind it to
 *   the container or any ancestor of the card: the custom properties
 *   override the :root tokens for every descendant that consumes them.
 */
export function useCardFit(container: Ref<HTMLElement | null>) {
  const baseWidth = readToken('--card-base-width');
  const baseHeight = readToken('--card-base-height');
  const maxScale = readToken('--card-scale-full');

  const scale = ref(maxScale);
  const observer = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    if (width > 0 && height > 0) {
      scale.value = Math.min(maxScale, width / baseWidth, height / baseHeight);
    }
  });

  // One observer follows the ref as the container mounts and unmounts.
  watch(container, (el, prev) => {
    if (prev) observer.unobserve(prev);
    if (el) observer.observe(el);
  });
  onScopeDispose(() => observer.disconnect());

  return computed(() => ({
    '--card-scale-full': String(scale.value),
    '--card-width': `${baseWidth * scale.value}px`,
    '--card-height': `${baseHeight * scale.value}px`,
  }));
}
