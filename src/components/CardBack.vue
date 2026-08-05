<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { Card } from '../stores/useGameStore';
import { CATEGORY_SLUG } from '../stores/useGameStore';
import Stars from './Stars.vue';
import AppIcon from './AppIcon.vue';
import type { Icon } from '@wikimedia/codex-icons';
import { cdxIconEdit, cdxIconChart, cdxIconUserAvatar } from '@wikimedia/codex-icons';
import wikiGlobe from '../assets/wikipedia-globe.svg';
import wikiWordmark from '../assets/wikipedia-wordmark.svg';
import wikiTagline from '../assets/wikipedia-tagline.svg';

// Back ("flipped") side of a detail card: trust & relevance signals fetched
// from the MediaWiki attribution API. All API fields are treated as optional —
// rows only render when their data is present.
const props = defineProps<{
  card: Card;
}>();

// ── Attribution API response (all fields optional / nullable) ──────────────
interface BrandMark { name?: string; url?: string; type?: string }
interface Trending { read?: boolean; edited?: boolean; read_and_edited?: boolean }
interface Signals {
  essential?: {
    title?: string;
    source_wiki?: { site_name?: string };
    default_brand_marks?: BrandMark[];
    license?: { short?: string };
  };
  trust_and_relevance?: {
    last_updated?: string | null;
    contributor_counts?: number | { total?: number } | null;
    page_views?: number | null;
    reference_count?: number | null;
    trending?: { top?: Trending; relative?: Trending } | null;
  } | null;
}

// XTools articleinfo — used as a fallback source for the editor count.
interface ArticleInfo {
  editors?: number | null;
  revisions?: number | null;
}

const signals = ref<Signals | null>(null);
const articleInfo = ref<ArticleInfo | null>(null);
const isLoading = ref(false);
const hasError = ref(false);

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 800;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let controller: AbortController | null = null;

// Fetch JSON with a linear backoff on transient failures (network / 5xx / 429).
// Permanent client errors (e.g. 404) and aborts resolve to null.
async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T | null> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, { headers: { accept: 'application/json' }, signal });
      if (res.ok) return (await res.json()) as T;
      if (res.status < 500 && res.status !== 429) return null; // permanent
    } catch {
      if (signal.aborted) return null; // component unmounted mid-flight
    }
    if (attempt < MAX_RETRIES) await wait(RETRY_BASE_MS * (attempt + 1));
  }
  return null;
}

async function loadBack() {
  const title = props.card.title?.trim();
  if (!title) return;

  const path = encodeURIComponent(title.replace(/ /g, '_'));
  const signalsUrl =
    `https://en.wikipedia.org/w/rest.php/attribution/v0-beta/pages/${path}` +
    `/signals?redirect=true&expand=trust_and_relevance`;
  const articleInfoUrl = `https://xtools.wmcloud.org/api/page/articleinfo/en.wikipedia.org/${path}`;

  const ctrl = new AbortController();
  controller = ctrl;
  isLoading.value = true;
  hasError.value = false;

  // Both sources are fetched in parallel; either may fail independently.
  const [sig, info] = await Promise.all([
    fetchJson<Signals>(signalsUrl, ctrl.signal),
    fetchJson<ArticleInfo>(articleInfoUrl, ctrl.signal),
  ]);

  if (ctrl.signal.aborted) return;
  signals.value = sig;
  articleInfo.value = info;
  hasError.value = sig == null && info == null;
  isLoading.value = false;
}

onMounted(loadBack);
onUnmounted(() => controller?.abort());

// ── Derived, null-safe view data ───────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString('en-US');

const tr = computed(() => signals.value?.trust_and_relevance ?? null);

const displayTitle = computed(() => signals.value?.essential?.title || props.card.title);

const pageViews = computed<number | null>(() =>
  typeof tr.value?.page_views === 'number' ? tr.value.page_views : null
);

const referenceCount = computed<number | null>(() =>
  typeof tr.value?.reference_count === 'number' ? tr.value.reference_count : null
);

const contributorCount = computed<number | null>(() => {
  const c = tr.value?.contributor_counts;
  if (typeof c === 'number') return c;
  if (c && typeof c === 'object' && typeof c.total === 'number') return c.total;
  // Fall back to the XTools editor count.
  if (typeof articleInfo.value?.editors === 'number') return articleInfo.value.editors;
  return null;
});

const lastUpdated = computed<string | null>(() => {
  const iso = tr.value?.last_updated;
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
});

const trendingBadges = computed<string[]>(() => {
  const t = tr.value?.trending;
  if (!t) return [];
  const badges: string[] = [];
  if (t.top?.read || t.relative?.read) badges.push('Most read');
  if (t.top?.edited || t.relative?.edited) badges.push('Most edited');
  return badges;
});

const revisionCount = computed<number | null>(() =>
  typeof articleInfo.value?.revisions === 'number' ? articleInfo.value.revisions : null
);

// "This article is supported by..." rows — only those with data.
const supportRows = computed(() => {
  const rows: { key: string; icon: Icon; label: string; value: string }[] = [];
  if (contributorCount.value != null)
    rows.push({ key: 'contributors', icon: cdxIconUserAvatar, label: 'contributors', value: fmt(contributorCount.value) });
  if (revisionCount.value != null)
    rows.push({ key: 'revisions', icon: cdxIconEdit, label: 'revisions', value: fmt(revisionCount.value) });
  if (referenceCount.value != null)
    rows.push({ key: 'article-sources', icon: cdxIconChart, label: 'article sources', value: fmt(referenceCount.value) });
  return rows;
});

// Card background + tint per category — mirrors the palettes in Card.vue
// (local to the card visuals, not shared design tokens).
const CATEGORY_STYLE: Record<string, { bg: string; tint: string }> = {
  sports: { bg: '#e9f1ef', tint: '#6f91a4' },
  society: { bg: '#f5f0e8', tint: '#948877' },
  entertainment: { bg: '#f3ecf1', tint: '#917d8a' },
  earth: { bg: '#f4f0e6', tint: '#7e8c75' },
  history: { bg: '#f5f0e8', tint: '#9f7262' },
  'physical-science': { bg: '#eef1f6', tint: '#787f9b' },
};
const catStyle = computed(
  () => CATEGORY_STYLE[CATEGORY_SLUG[props.card.category]] ?? { bg: '#f5f0e8', tint: '#9f7262' }
);
</script>

<template>
  <div class="card-back" :style="{ backgroundColor: catStyle.bg, '--cb-tint': catStyle.tint }">
    <!-- Category tint + grain/noise texture, matching the front card -->
    <div class="cb-tint" aria-hidden="true"></div>
    <div class="cb-grain" aria-hidden="true"></div>
    <div class="cb-noise" aria-hidden="true"></div>

    <!-- Inset frame holding all back content (mirrors the card's inner border) -->
    <div class="card-back__frame">
      <div class="card-back__content">
      <!-- Title -->
      <div class="cb-title-plate">
        <p class="cb-title">{{ displayTitle }}</p>
      </div>

      <!-- Stars + page views -->
      <div class="cb-headline">
        <Stars :rarity="card.rarity" :size="15" />
        <span v-if="pageViews != null" class="cb-views">{{ fmt(pageViews) }} views last month</span>
      </div>

      <!-- Trending badges -->
      <div v-if="trendingBadges.length" class="cb-trends">
        <span v-for="b in trendingBadges" :key="b" class="cb-trend">{{ b }}</span>
      </div>

      <!-- Trust signals -->
      <p class="cb-supported">This article is supported by...</p>
      <div v-if="supportRows.length" class="cb-rows">
        <div
          v-for="(row, i) in supportRows"
          :key="row.key"
          class="cb-row"
          :class="{ 'cb-row--divider': i < supportRows.length - 1 }"
        >
          <span class="cb-row__label">
            <AppIcon :icon="row.icon" :size="15" />
            {{ row.label }}
          </span>
          <span class="cb-row__value">{{ row.value }}</span>
        </div>
      </div>
      <p v-else-if="hasError" class="cb-rows-empty">Details couldn't be loaded.</p>
      <p v-else-if="isLoading" class="cb-rows-empty">Loading details…</p>

      <!-- Last updated -->
      <p v-if="lastUpdated" class="cb-updated">Last updated on {{ lastUpdated }}</p>
    </div>

    <!-- Wikipedia footer -->
    <div class="card-back__footer">
      <p class="cb-blurb">Wikipedia exists thanks to the nearly 250,000 volunteers around the world</p>
      <div class="cb-brand">
        <img :src="wikiGlobe" class="cb-brand__globe" alt="" />
        <div class="cb-brand__lockup">
          <img :src="wikiWordmark" class="cb-brand__wordmark" alt="Wikipedia" />
          <img :src="wikiTagline" class="cb-brand__tagline" alt="The Free Encyclopedia" />
        </div>
      </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-back {
  --cb-text: #2d2212;
  --cb-blue: #3366cc;

  width: 100%;
  height: 100%;
  border-radius: 11.5px; /* matches .trading-card in Card.vue */
  border: 1px solid #ebebeb;
  overflow: hidden;
  position: relative;
  isolation: isolate;
  display: flex;
  padding: 9px; /* inset for the inner frame */
  /* All back text except the title is Linux Libertine. */
  font-family: var(--font-libertine);
  color: var(--cb-text);
}

/* Category tint + grain/noise texture — same treatment as the front card. */
.cb-tint,
.cb-grain,
.cb-noise {
  position: absolute;
  inset: 0;
  /* Overlay the content (which sits at z-index 1), matching the front card
     where the texture layers paint on top of everything. */
  z-index: 2;
  pointer-events: none;
}
.cb-tint {
  background-color: var(--cb-tint);
  mix-blend-mode: hard-light;
}
.cb-grain {
  background-image: url("/border-grain.png");
  background-repeat: repeat;
  background-size: 480px 612px;
  opacity: 0.32;
  mix-blend-mode: multiply;
}
.cb-noise {
  background-image: url("/noise.png");
  background-repeat: repeat;
  opacity: 0.15;
  mix-blend-mode: multiply;
}

/* Inset bordered box that holds the content — mirrors the front card's inner
   frame — and carries the fade into Wikipedia blue toward the bottom. */
.card-back__frame {
  position: relative;
  z-index: 1;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  overflow: hidden;
  background: linear-gradient(180deg, rgba(51, 102, 204, 0) 58%, var(--cb-blue) 100%);
}

.card-back__content {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 11px 11px 6px;
  flex: 1 1 auto;
  min-height: 0;
}

/* Title */
.cb-title-plate {
  background: rgba(255, 255, 255, 0.85);
  padding: 3px 6px;
  text-align: center;
}
.cb-title {
  font-family: Georgia, var(--font-serif);
  font-weight: 700;
  font-size: 18px;
  line-height: 1.15;
  color: #000;
}

/* Stars + views */
.cb-headline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 7px;
  border-bottom: 1.5px solid var(--color-border);
}
.cb-views {
  font-weight: 600;
  font-size: 13px;
  text-align: right;
}

/* Trending */
.cb-trends {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: flex-end;
}
.cb-trend {
  background: rgba(255, 255, 255, 0.9);
  color: var(--cb-blue);
  font-weight: 700;
  font-size: 12.5px;
  padding: 3px 8px;
}

/* Trust signals */
.cb-supported {
  font-weight: 700;
  font-size: 14px;
  text-align: center;
  color: #000;
  margin-top: 2px;
}
.cb-rows {
  background: rgba(255, 255, 255, 0.9);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.cb-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 7px;
}

.cb-row--divider {
  border-bottom: 1px solid var(--color-border);
}
.cb-row__label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  font-size: 13px;
}
.cb-row__value {
  font-weight: 600;
  font-size: 13px;
}
.cb-rows-empty {
  font-size: 12.5px;
  color: var(--color-text-muted);
  text-align: center;
  padding: 4px 0;
}

/* Last updated */
.cb-updated {
  font-size: 12.5px;
  text-align: right;
  color: #000;
}

/* Wikipedia footer */
.card-back__footer {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 10px 14px 14px;
  text-align: center;
}
.cb-blurb {
  font-size: 12.5px;
  line-height: 1.3;
  color: #000;
  max-width: 260px;
  font-weight: 400;
}

/* Wikipedia brand lockup: globe on the left, wordmark over tagline on the right */
.cb-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
}
.cb-brand__globe {
  flex: 0 0 auto;
  width: 58px;
  height: auto;
  /* Blend into the blue background so the globe glows blue (matches Figma). */
  opacity: 0.85;
  mix-blend-mode: hard-light;
}
.cb-brand__lockup {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.cb-brand__wordmark {
  height: 27px;
  width: auto;
}
.cb-brand__tagline {
  height: 13px;
  width: auto;
}
</style>
