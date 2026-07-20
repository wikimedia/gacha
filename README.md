# World of Wikipedia (gacha)

A Wikipedia trading-card game, built by the Wikimedia Foundation's Future
Audiences team. Players are shown cards generated from Wikipedia articles and
swipe to guess whether each one is **real or fake**, earning points and
collecting cards into a shareable "binder" profile.

## Stack

- [Vue 3](https://vuejs.org/) + TypeScript + [Vite](https://vitejs.dev/), with
  [Pinia](https://pinia.vuejs.org/) for state and vue-router
- Tailwind CSS 4 + daisyUI, themed with [Wikimedia Codex](https://doc.wikimedia.org/codex/latest/)
  design tokens; icons from [Phosphor](https://phosphoricons.com/)
- [Supabase](https://supabase.com/) for the database (Postgres) and auth
  (email OTP) — there is no custom backend server
- Google Analytics 4 for event tracking
- Deployed via Firebase App Hosting (see `apphosting.yaml`)

## Development

```sh
npm install
npm run dev
```

The Supabase URL and publishable anon key are read from `VITE_SUPABASE_URL`
and `VITE_SUPABASE_ANON_KEY`; defaults are baked into `src/supabase.ts`, so
the dev server works out of the box. Note that the defaults point at the
**live** Supabase project — local dev reads and writes the real database.

Other scripts:

- `npm run build` — type-check (`vue-tsc`) and build for production
- `npm run preview` — preview the production build locally
- `npm start` — serve the built `dist/` directory (used in production)

There is currently no test suite or linter configured.

## Repository layout

- `src/` — the Vue SPA (views, components, Pinia stores)
- `data_pipeline/` — Jupyter notebooks that generate the card data (real
  articles, AI-generated fakes, images, content filtering). Not part of the
  app build; see [`data_pipeline/README.md`](data_pipeline/README.md)
- `public/` — static assets (card art, textures, animation frames)

See [`CLAUDE.md`](CLAUDE.md) for a more detailed architecture overview.
