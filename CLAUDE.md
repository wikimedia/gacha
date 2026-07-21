# CLAUDE.md

Guidance for Claude Code (and human newcomers) working in this repository.

## What this is

"World of Wikipedia" — a Wikipedia trading-card game (Wikimedia Future
Audiences project). Players swipe to guess whether article cards are real or
fake, earn points, and collect cards into a public "binder" profile.

## Commands

- `npm run dev` — Vite dev server (works out of the box; Supabase defaults
  are baked into `src/supabase.ts`)
- `npm run build` — `vue-tsc -b && vite build`; run this to type-check
- There is **no test suite and no linter** configured

## Architecture

Vue 3 + TypeScript SPA (Vite, Pinia, vue-router, Tailwind 4 + daisyUI themed
with Wikimedia Codex design tokens, Phosphor icons). The only backend is
Supabase: Postgres tables plus email-OTP auth. Deployed on Firebase App
Hosting (`apphosting.yaml`). Note: the baked-in Supabase defaults in
`src/supabase.ts` point at the live project, so local dev touches the real
database.

### Routes (`src/router/index.ts`)

- `/` and `/play/:category` → `HomeView` (the game loop)
- `/card` → `CardView`
- `/@:id` → `ProfileView` (public binder; `:id` is a username or profile UUID)

### State (`src/stores/`)

- `useGameStore.ts` — the heart of the app (~950 lines): fetches card pools
  from Supabase, maps DB rows to `Card` objects, tracks points / collection /
  per-category cooldowns, and persists to localStorage (`moonflower_guest_*`
  keys for guests, `moonflower_user_<id>_*` for logged-in users).
- `useAuthStore.ts` — Supabase email-OTP auth, profile/username management,
  syncing game state to the logged-in user.

### Data model (Supabase)

- `articles_v2` — real cards, one row per article (qid, sentences, image +
  attribution, `sub_category`, pageview `percentile`, `flag_score`, `rand`,
  `profile_id`, `pinned`)
- `fake_articles_v3` — AI-generated fake cards, same general shape
- `profiles` — user profiles (username, bio, binder color)

Key mechanics to understand before touching gameplay/data code:

- **Card ownership**: real cards are *claimed* by setting
  `articles_v2.profile_id`, and pools only serve unclaimed rows
  (`profile_id IS NULL`) — each real card is owned by at most one player.
  Claiming happens for logged-in users at game end / card unlock
  (`claimArticlesForProfile`); a guest's collected cards are only claimed
  retroactively when they log in (`handleAuthSession` migrates them). Fakes
  are never claimed.
- **Random sampling**: rows carry a persistent random `rand` value. Pools are
  fetched by picking a random pivot and range-scanning `sampleSize` rows by
  `rand` (wrapping around if needed) — cheap random samples with no
  `ORDER BY random()` or OFFSET scans. The filters applied must match the
  partial index predicates for this to stay fast.
- **Rarity** is derived client-side from the article's pageview `percentile`
  (see `mapArticleRowToCard`).
- **Seen-fakes tracking**: a Bloom filter of fake qids in localStorage
  (`src/utils/seenFakesFilter.ts`). Category pools overfetch fakes 4× and
  skip already-seen ones; if too few remain, the filter resets.
- **Content filtering** is two-layered: a `flag_score` column from an ML
  classifier (filtered in queries) plus a client-side keyword blocklist
  (`isAppropriateArticle` in the game store).

### Analytics

GA4 via `src/analytics.ts` (typed wrappers over `gtag`). SPA page views are
sent manually in the router's `afterEach`; the automatic page_view is
disabled in `index.html`.

### Data pipeline (`data_pipeline/`)

Jupyter notebooks that regenerate card data: fetch real articles by
pageviews → filter with a fine-tuned ModernBERT classifier → generate fakes
with Gemini → find images with ollama → dump into DB-friendly format. Not
part of the app build. See its README for setup.

## Gotchas

- **Dead code**: `src/services/db.ts` and `src/utils/cardHelpers.ts` are not
  imported by the app (only by each other). They are an unfinished extraction
  of logic that still lives — and is actually used — in `useGameStore.ts`.
  Make sampling/filtering/mapping changes in the store, not in `db.ts`.
- **Persistence is duplicated**: the game store persists via explicit
  `persistState()` calls *and* five `watch`ers writing the same localStorage
  keys. Be careful when changing persistence; prefer consolidating over
  adding a third path.
- Guest progress lives only in localStorage. For logged-in users,
  `useAuthStore.syncStoreToUser` persists **only `gdPoints`** to Supabase
  auth metadata (deduplicated against the last-synced value — redundant
  `updateUser` calls were tripping Supabase's rate limit); the collection's
  remote source of truth is the claimed `articles_v2` rows, reloaded via the
  `profiles → articles_v2` join at login. Per-user localStorage keys cache
  both.
- `@wikimedia/codex` and `@wikimedia/codex-icons` are installed but unused —
  only `@wikimedia/codex-design-tokens` (theme CSS) is imported.
- The store contains many leftover `console.log` debug statements.

## Conventions

- Hosted on Wikimedia GitLab (`repos/future-audiences/gacha`); branches are
  named `username/topic` and merged into `main`.
