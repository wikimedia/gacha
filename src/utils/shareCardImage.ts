// Helpers for sharing a card as an image: rasterize a DOM node into a PNG
// and hand it to the Web Share API, with a download fallback for browsers
// that can't share files.

import { getFontEmbedCSS, toCanvas } from 'html-to-image';

/**
 * Canonical public domain, used in share text and on the share graphic
 * regardless of where the app is currently served from.
 */
export const SHARE_DOMAIN = 'worldof.wiki';

/**
 * The share graphic's fixed layout size in CSS px (9:16). The export is a
 * fixed-format asset: ShareCardGraphic always lays itself out at this size
 * and ShareCardSheet derives its preview from the same numbers, so viewport
 * size and responsive overrides never reach the PNG.
 */
const SHARE_GRAPHIC_WIDTH = 432;
const SHARE_GRAPHIC_HEIGHT = 768;

/** The layout size as custom properties, for the components' style bindings. */
export const SHARE_GRAPHIC_SIZE_VARS = {
  '--share-graphic-width': `${SHARE_GRAPHIC_WIDTH}px`,
  '--share-graphic-height': `${SHARE_GRAPHIC_HEIGHT}px`,
};

/** Exported PNG width, per the design spec; height follows the 9:16 ratio. */
const SHARE_EXPORT_WIDTH = 1080;
const EXPORT_PIXEL_RATIO = SHARE_EXPORT_WIDTH / SHARE_GRAPHIC_WIDTH;

/**
 * `navigator.share` existing does not imply file support (some desktop
 * browsers), so probe with a throwaway file.
 */
export function canShareImageFiles(): boolean {
  if (!navigator.share || !navigator.canShare) return false;
  try {
    const probe = new File([''], 'probe.png', { type: 'image/png' });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

// WebKit only renders data-URI images embedded in an SVG-as-image when they
// are already in its image cache, so on desktop Safari and every iOS browser
// the first rasterizations leave blanks where the card art should be.
// Drawing the same SVG a few extra times warms the cache and only the last
// pass is kept; the extra passes are CPU-only. See
// https://bugs.webkit.org/show_bug.cgi?id=99677 (root cause) and
// https://github.com/bubkoo/html-to-image/issues/361 (workaround). The same
// bug previously hit the Share Highlights experiment, which fixed it by
// overdrawing the photo onto the canvas: https://phabricator.wikimedia.org/T426344
const WEBKIT_WARMUP_PASSES =
  /AppleWebKit/.test(navigator.userAgent) && !/Chrome\//.test(navigator.userAgent) ? 2 : 0;

/**
 * Rasterize an element into a PNG blob at EXPORT_PIXEL_RATIO. Any CSS
 * transform on the element itself (e.g. the scaled-down sheet preview) is
 * neutralized so the output is always the element's natural layout size.
 */
export async function captureElementToPng(element: HTMLElement): Promise<Blob> {
  // Embed fonts separately with default fetch options (plain cache hits);
  // the forced revalidation below is only needed for the card artwork.
  const fontEmbedCSS = await getFontEmbedCSS(element);
  const options = {
    pixelRatio: EXPORT_PIXEL_RATIO,
    width: element.clientWidth,
    height: element.clientHeight,
    style: { transform: 'none', transformOrigin: '0 0' },
    filter: (node: HTMLElement) => node.tagName !== 'SCRIPT',
    fontEmbedCSS,
    // Revalidate instead of reusing cached image responses: card art already
    // loaded through a plain <img> is cached without CORS headers, and some
    // browsers would serve that entry to the capture's CORS fetch and fail.
    fetchRequestInit: { cache: 'no-cache' as RequestCache },
  };
  for (let i = 0; i < WEBKIT_WARMUP_PASSES; i++) {
    await toCanvas(element, options);
  }
  const canvas = await toCanvas(element, options);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('canvas.toBlob() returned null'));
      }
    }, 'image/png');
  });
}

/**
 * Share an image file plus text via the Web Share API. Resolves to 'shared'
 * on success and 'cancelled' when the user dismissed the native share sheet;
 * rethrows real failures.
 */
export async function shareImageFile(
  blob: Blob,
  filename: string,
  text: string
): Promise<'shared' | 'cancelled'> {
  const file = new File([blob], filename, { type: 'image/png' });
  // Attaching `text`/`title` alongside the file makes macOS put the image on
  // the pasteboard in two representations, so choosing "Copy" from the share
  // sheet and pasting into Finder yields two identical PNGs. Touch devices
  // don't expose that Copy→Finder path and their share targets (Messages,
  // WhatsApp, …) actually use the caption, so send it there and share the file
  // alone on desktop. The caption stays reachable via the sheet's separate
  // copy-message button. (When the link does ride along it goes inside `text`
  // rather than a `url` field: several share targets drop one when both are
  // present.)
  const isTouchDevice = (navigator.maxTouchPoints ?? 0) > 0;
  const data: ShareData = isTouchDevice
    ? { files: [file], title: 'World of Wikipedia', text }
    : { files: [file] };
  try {
    await navigator.share(data);
    return 'shared';
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return 'cancelled';
    }
    throw err;
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** e.g. "world-of-wikipedia-douglas-adams.png" */
export function shareFilename(title: string): string {
  const slug = title
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return slug ? `world-of-wikipedia-${slug}.png` : 'world-of-wikipedia-card.png';
}
