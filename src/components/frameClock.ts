/**
 * frameClock — the single requestAnimationFrame loop for the whole app's foil
 * effects, plus a lag sensor built on the same tick.
 *
 * Every ShinyOverlay used to own its own rAF loop, so N visible foil cards ran
 * N loops (worst case: a full profile binder or results grid). Here one loop
 * drives every active overlay: subscribers register a `(dt) => void` ticker and
 * are all advanced from a single timestamp per frame. The loop runs only while
 * there is at least one subscriber and stops itself when the last one leaves, so
 * an idle app burns nothing.
 *
 * Because this is the ONE place that sees the true frame interval AND how many
 * cards are animating, it doubles as the lag sensor: it tracks the dropped-frame
 * ratio over a rolling window and exposes a reactive `stressed` flag. No shedding
 * is wired up yet — for now it only tracks and logs.
 *
 * Note on mid-loop joins: a ticker that subscribes while the loop is already
 * running receives a normal ~one-frame `dt` on its first tick (the loop ticks
 * every frame, so there's no accumulated gap to fast-forward). The only dt of 0
 * is the very first frame after the loop (re)starts, which advances nothing.
 */
import { ref } from 'vue';

export type Ticker = (dt: number) => void;

const tickers = new Set<Ticker>();
let rafId = 0;
let lastTs = 0;

// ── Lag tracking ────────────────────────────────────────────────
const TARGET_FPS = 30; // foils are authored/paced around ~30fps
const FRAME_BUDGET = 1000 / TARGET_FPS; // ~33ms
const DROP_THRESHOLD = FRAME_BUDGET * 2; // a frame >2× budget counts as "dropped"
const STRESS_RATIO = 0.2; // >20% of frames dropped over the window → stressed
const WINDOW_MS = 2000; // evaluate every ~2s of actual animation
const MAX_SANE_DT = 1000; // ignore tab-switch / stall gaps in the stats
const MAX_FRAME_DT = 100; // cap dt handed to tickers so a resume doesn't skip ahead

/**
 * Reactive "device is struggling" flag, derived from dropped frames while foils
 * animate. Read-only to consumers for now; nothing acts on it yet.
 */
export const stressed = ref(false);

/**
 * Reactive snapshot of the latest window's metrics, refreshed each evaluation.
 * Powers the on-device perf HUD (PerfHud.vue, `?debug=perf`); no logic reads it.
 */
export const stats = ref<{ fps: number; drop: number; active: number; stressed: boolean }>({
  fps: 0,
  drop: 0,
  active: 0,
  stressed: false,
});

let winMs = 0;
let winFrames = 0;
let winLong = 0;
let winSum = 0;

function resetWindow() {
  winMs = 0;
  winFrames = 0;
  winLong = 0;
  winSum = 0;
}

function recordFrame(dt: number) {
  if (dt <= 0 || dt > MAX_SANE_DT) return; // skip startup frame + stalls
  winMs += dt;
  winFrames++;
  winSum += dt;
  if (dt > DROP_THRESHOLD) winLong++;
  if (winMs < WINDOW_MS) return;

  const dropRatio = winLong / winFrames;
  const fps = 1000 / (winSum / winFrames);
  const nowStressed = dropRatio > STRESS_RATIO;

  stats.value = { fps, drop: dropRatio, active: tickers.size, stressed: nowStressed };

  console.debug(
    `[frameClock] fps~${fps.toFixed(1)} drop=${(dropRatio * 100).toFixed(0)}% ` +
      `active=${tickers.size} stressed=${nowStressed}`
  );
  if (nowStressed !== stressed.value) {
    stressed.value = nowStressed;
    const line =
      `[frameClock] stress ${nowStressed ? 'ON' : 'OFF'} ` +
      `(fps~${fps.toFixed(1)}, drop=${(dropRatio * 100).toFixed(0)}%, active=${tickers.size})`;
    if (nowStressed) console.warn(line);
    else console.info(line);
  }
  resetWindow();
}

function loop(ts: number) {
  const dt = lastTs ? ts - lastTs : 0;
  lastTs = ts;
  recordFrame(dt);

  // Cap the dt handed to animations so a hidden-tab resume (huge gap) doesn't
  // fast-forward every foil through dozens of frames at once.
  const frameDt = dt > MAX_FRAME_DT ? MAX_FRAME_DT : dt;
  // Snapshot: a ticker may unsubscribe (card unmount / reset) during its own
  // tick; iterating a copy keeps that safe and is one small alloc per frame
  // regardless of how many cards animate.
  for (const t of [...tickers]) t(frameDt);

  if (tickers.size) {
    rafId = requestAnimationFrame(loop);
  } else {
    rafId = 0;
    lastTs = 0;
  }
}

/**
 * Register a per-frame ticker with the shared clock. Starts the loop if it was
 * idle; returns an unsubscribe function that removes the ticker (the loop stops
 * on its own next frame once empty).
 */
export function subscribe(ticker: Ticker): () => void {
  if (typeof requestAnimationFrame === 'undefined') return () => {}; // SSR guard
  tickers.add(ticker);
  if (!rafId) rafId = requestAnimationFrame(loop);
  return () => {
    tickers.delete(ticker);
    if (tickers.size === 0) {
      resetWindow(); // measure the next burst cleanly
      stats.value = { ...stats.value, active: 0 }; // reflect idle in the HUD
    }
  };
}
