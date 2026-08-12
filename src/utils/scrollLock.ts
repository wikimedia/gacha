// Reference-counted body scroll lock. Overlays can stack (e.g. the share
// sheet opens over the card detail modal), so the body style changes only
// at the 0↔1 transitions — closing an inner overlay never unlocks an
// outer one.
//
// On iOS Safari, `overflow: hidden` alone does not stop touch scrolling of
// the document. The lock also sets the body to `position: fixed`, offset
// to the current scroll position. The unlock restores that position.
let lockCount = 0;
let savedScrollY = 0;

export function lockBodyScroll(): void {
  lockCount++;
  if (lockCount === 1) {
    savedScrollY = window.scrollY;
    const { style } = document.body;
    style.overflow = 'hidden';
    style.position = 'fixed';
    style.top = `-${savedScrollY}px`;
    style.left = '0';
    style.right = '0';
  }
}

export function unlockBodyScroll(): void {
  if (lockCount === 0) return;
  lockCount--;
  if (lockCount === 0) {
    const { style } = document.body;
    style.overflow = '';
    style.position = '';
    style.top = '';
    style.left = '';
    style.right = '';
    window.scrollTo(0, savedScrollY);
  }
}
