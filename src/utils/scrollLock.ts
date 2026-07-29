// Reference-counted body scroll lock. Overlays can stack (e.g. the share
// sheet opens over the card detail modal), so the body style changes only
// at the 0↔1 transitions — closing an inner overlay never unlocks an
// outer one.
let lockCount = 0;

export function lockBodyScroll(): void {
  lockCount++;
  if (lockCount === 1) {
    document.body.style.overflow = 'hidden';
  }
}

export function unlockBodyScroll(): void {
  if (lockCount === 0) return;
  lockCount--;
  if (lockCount === 0) {
    document.body.style.overflow = '';
  }
}
