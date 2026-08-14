/**
 * Wikimedia thumbnail URL helpers.
 *
 * Card rows store original upload.wikimedia.org file URLs, and Commons
 * originals are often multi-megapixel photos (tens of MB decoded) shown at
 * card size. Requesting a thumbnail sized to the actual display instead keeps
 * the page's decoded-image memory small enough for mobile Safari.
 *
 * Requested widths snap to the thumbnail steps that Wikimedia production
 * renders and caches ($wgThumbnailSteps in operations/mediawiki-config,
 * wmf-config/CommonSettings.php) — the same step list MultimediaViewer's
 * width buckets draw from. Arbitrary widths would render on demand and
 * fragment the shared thumbnail cache.
 */

/** Thumbnail widths production pre-renders and caches ($wgThumbnailSteps). */
export const THUMBNAIL_STEPS = [20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840];

/**
 * Smallest production thumbnail step that covers `cssWidth` at the given
 * device-pixel ratio, falling back to the largest step for huge displays.
 */
export function idealThumbWidth(
  cssWidth: number,
  dpr: number = (typeof window !== 'undefined' && window.devicePixelRatio) || 1
): number {
  const physical = Math.ceil(cssWidth * dpr);
  for (const step of THUMBNAIL_STEPS) {
    if (step >= physical) return step;
  }
  return THUMBNAIL_STEPS[THUMBNAIL_STEPS.length - 1];
}

// Original-file URL shape: …/wikipedia/<project>/<a>/<ab>/<Filename>
const ORIGINAL_URL_RE =
  /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/[^/]+)\/([0-9a-f])\/([0-9a-f]{2})\/([^/?#]+)$/;

// Types the scaler thumbnails with the plain `<W>px-<name>` pattern. SVGs get
// a `.png` suffix; multi-page and video types (TIFF, PDF, WebM…) need other
// patterns and keep their original URL.
const PLAIN_EXT_RE = /\.(jpe?g|png|gif|webp)$/i;
const SVG_EXT_RE = /\.svg$/i;

/**
 * Thumbnail URL for a Wikimedia original-file URL, sized for a display width
 * of `cssWidth` CSS px. Returns the input unchanged when it isn't a
 * rewritable original (other hosts, existing thumb URLs, CSS gradient values,
 * unsupported file types).
 */
export function thumbUrl(url: string, cssWidth: number, dpr?: number): string {
  const m = ORIGINAL_URL_RE.exec(url);
  if (!m) return url;
  const [, base, d1, d2, name] = m;
  let suffix = '';
  if (SVG_EXT_RE.test(name)) {
    suffix = '.png';
  } else if (!PLAIN_EXT_RE.test(name)) {
    return url;
  }
  const width = idealThumbWidth(cssWidth, dpr);
  return `${base}/thumb/${d1}/${d2}/${name}/${width}px-${name}${suffix}`;
}
