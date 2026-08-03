# CLAUDE.md — TAMID Group at NYU · Admin Panel

## What it is

- Internal admin dashboard for the TAMID at NYU public site (`admin.nyu-tamid.org` placeholder). Manages site content (board headshots, event flyers, etc.) via Supabase.
- Stack: React 19 + Vite 7 + TypeScript + Tailwind v4 (`@tailwindcss/vite`) + shadcn/ui + Radix + `@supabase/supabase-js`. Node 24.
- Adapted from the open-source SJBA admin template (MIT), fully rebranded to TAMID. No SJBA data carried over.

## Commands

- `npm install` — deps (Husky `prepare` runs; lint-staged on commit).
- `npm run dev` — Vite dev server (`VITE_BACKEND_URL` proxied to `http://localhost:3000`).
- `npm run build` — `tsc -b && vite build`.
- `npm test` — Vitest (`vitest run`; jsdom). `npm run lint` / `npm run format`.

## Structure

- `src/pages/*` — `LoginPage.tsx`, `LoggedInPage.tsx`.
- `src/components/ui/*` — shadcn primitives (button, dialog, table, sheet, tabs, etc.).
- `src/lib/*` — `supabase.ts`, `api.ts`, `adminApi.ts`, `adminMedia.ts`, `adminTypes.ts`, `useIdleSignOut.ts`, `utils.ts`. All config is `VITE_*`-env driven; no hardcoded domains.
- `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`. `components.json` = shadcn config.

## Brand / theme

- shadcn tokens live in `src/index.css`: `--primary = navy #18274B`, `--accent` / `--ring` / `--sidebar-*` = sky `#41B5E8`. Secondary blues → chart tokens; grays → secondary/muted/border.
- Fonts: Roboto (headings/UI) + Open Sans (body) via Google Fonts link in `index.html` (Geist was removed).
- Logo: `public/tamid-logo-clear.png`. `design-qa.md` records the palette/accent decision; `STYLE.md` (repo root) is the full brand kit.

## Backend coupling

- Reads API base + Supabase from `VITE_BACKEND_URL` / `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` (plus `VITE_BOARD_IMAGES_BUCKET`, `VITE_EVENT_FLYERS_BUCKET`). `supabase.ts` throws if URL/key missing.
- `adminApi.ts` has a production-safety host check: `PRODUCTION_BACKEND_HOSTS = {'api.nyu-tamid.org'}` and a production-Supabase-ref guard — warns/blocks when a local admin is pointed at a production backend.

## Deploy

- GitHub org `github.com/tamid-nyu` (public). Push via SSH remote `git@github.com:tamid-nyu/TAMID_site_internal.git` (HTTPS token lacks workflow scope).
- Vercel (`vercel.json` sets `noindex` / security headers); `robots.txt` + `<meta noindex>` keep it out of search. `admin.nyu-tamid.org` is a placeholder.

## CRITICAL — secrets

- `.env` is never committed (gitignored). `.env.example` holds PLACEHOLDERS only.
- The SJBA template had leaked a real Supabase project ref (`ivhsrdfhjxtrxvrwswuk`) + publishable key; these were scrubbed. NEVER re-introduce a real project ref or key into the repo.

## Human-TODOs (see `HUMAN-TODOS.md`)

- Real TAMID artwork (logo + favicon/icon set — current favicons are placeholders), real domains, email, socials, GitHub, and a new Supabase project link + auth wiring.
