# TAMID Admin Panel — Human-Owned TODOs

This document enumerates the deliberately-deferred tasks that must be completed by a human before the TAMID Admin Panel can go live in production. The automated rebrand workflow completed all mechanical rebranding; these items require human judgment, brand decisions, and infrastructure provisioning outside the scope of code-only automation.

---

## 1. ARTWORK

**Status:** Not completed (placeholder SJBA art carried forward)

The following image files currently contain SJBA (Stern Jewish Business Association) artwork and must be replaced with real TAMID Group at NYU artwork:

- `public/tamid-logo-clear.png` — Logo used in landing pages / public references (renamed from `sjba-logo-clear.png`; current bytes are SJBA art)
- `public/favicon.ico` — Browser tab icon (16x16 and up; currently SJBA/placeholder)
- `public/favicon-16x16.png` — Favicon at 16x16 resolution
- `public/favicon-32x32.png` — Favicon at 32x32 resolution
- `public/apple-touch-icon.png` — Apple device home-screen icon

**Action required:** Commission or design TAMID branding (logo, icon set) and replace these raster files. The app will serve these to browsers immediately; a placeholder SJBA mark in production is not acceptable.

---

## 2. ACCENT COLOR

**Status:** Inherited green tokens; decision pending

The app currently uses green semantic tokens (`#118246`, `#16a34a`) in `App.css` to drive the `--primary` color used throughout the UI (buttons, links, active states, accents).

**Design decision required:**

- Audit TAMID's brand guidelines / existing visual identity.
- Decide on the primary brand accent color (current green may or may not align with TAMID).
- If different from green, repaint the corresponding CSS custom properties in `App.css` and verify the UI still meets accessibility contrast ratios (WCAG AA minimum).

**Reference:** See `App.css` for lines containing `--primary` and related token definitions.

---

## 3. DOMAINS

**Status:** Placeholder URLs in use; real domains required

The following placeholders must be replaced with real, registered TAMID domains before DNS wiring and deployment:

- **Primary admin domain:** `admin.nyu-tamid.org` (appears in README, docs, and CI badge URLs)
- **Backend API domain:** `api.nyu-tamid.org` (appears in `.env.example` prod block and `docs/local-admin-safety.md`)
- **Status page domain:** `status.nyu-tamid.org` (appears in README)

**Files to update:**

- `README.md` — badge URLs, live app links, contact sections
- `.env.example` — production environment block (VITE_BACKEND_URL commented example)
- `docs/local-admin-safety.md` — production-safety guard documentation
- `src/lib/adminApi.ts` — production-detection logic (if any hardcoded domain is present; verify via grep)

**Action required:**

1. Register the real domain(s) or confirm they are already registered under the TAMID organization.
2. Wire DNS records (CNAME / A records) to point to the deployment target (Vercel, a CDN, or your backend service).
3. Update all four files above with the real domains (remove `[PLACEHOLDER]` markers).
4. Test that the updated prod domain references in the safety guard work correctly once deployed.

---

## 4. EMAIL

**Status:** Placeholder in use

The admin panel displays a contact email as a placeholder: `tamid@nyu.edu`

**Files affected:**

- `README.md` — contact/support section
- Any future footer or contact links added to the app

**Action required:** Replace `tamid@nyu.edu` with the real, monitored TAMID Group at NYU contact email address (or route it to the correct mailbox if using the `@nyu.edu` domain).

---

## 5. SOCIAL MEDIA HANDLES

**Status:** Noted for future; currently no hardcoded links in code

Per the rebrand sweep (grep confirmed zero references in src/), the app does not currently link to social media. However, if you plan to add social links (footer, sidebar, or about pages), ensure they reference:

- **LinkedIn:** Corporate page for TAMID Group at NYU (currently a placeholder; confirm the real company page exists)
- **Instagram:** `@nyutamid` or other official handle (currently a placeholder; confirm the account exists)

**Action required:** Once social media accounts are established, add any footer/link components that reference them. No code changes needed now; this is a placeholder reminder.

---

## 6. GITHUB ORGANIZATION & REPOSITORY

**Status:** Repo created; org setup required

The rebrand produces this repository: `TAMID_site_internal` in the `TAMID-Group-at-NYU` GitHub organization.

**Verification checklist:**

- [ ] Confirm GitHub org `TAMID-Group-at-NYU` exists and is accessible to authorized maintainers.
- [ ] Confirm repo `TAMID_site_internal` exists under that org.
- [ ] Set the repo as the remote upstream in your local clone:
  ```bash
  git remote add origin https://github.com/TAMID-Group-at-NYU/TAMID_site_internal.git
  git branch -M main
  git push -u origin main
  ```
- [ ] Update repository settings:
  - Visibility (public/private as appropriate for TAMID)
  - Branch protection rules (if desired)
  - Collaborators and teams
- [ ] Verify CI/CD badge in `README.md` now points to the correct GitHub Actions workflow and org/repo path.

**No code changes required** — this is infrastructure setup.

---

## 7. SUPABASE PROJECT (DATABASE & AUTH)

**Status:** Not created; human-owned provisioning required

The admin app requires a Supabase project for authentication and file storage. This is a critical dependency.

### 7.1 Create the Supabase Project

1. Log into [supabase.com](https://supabase.com) with the TAMID organization account.
2. Create a new Supabase project named something like "TAMID Admin App" or "TAMID Group".
3. Note the project's:
   - **URL:** `https://<project-ref>.supabase.co` (e.g., `https://tamidadmin123.supabase.co`)
   - **Anon/Publishable Key:** Found in Project Settings → API Keys (the `anonKey` / `sb_anon_*` value)
   - These are your `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

### 7.2 Create an Admin User

1. In the Supabase Console, go to **Authentication → Users**.
2. Create a new user account (e.g., `admin@nyu-tamid.org`). Set a temporary password.
3. Once created, open the user's **raw_app_meta_data** JSON editor (usually in the user detail view).
4. Add the following JSON:
   ```json
   {
     "admin": true
   }
   ```
   This claim is checked by the app's `adminApi.ts` logic (see `docs/local-admin-safety.md` for details).
5. Save the user.

### 7.3 Set Up Storage Buckets (Optional but Recommended)

The app uses Supabase Storage to manage images for events, board members, and site config. If you plan to upload media:

1. Create public-read buckets (or private with signed URLs) for:
   - `events` (event flyersand images)
   - `board-members` (headshots)
   - `site-config` (hero images, backgrounds, etc.)
2. Configure bucket policies (RLS — Row Level Security) to allow the admin user to upload/edit.

See the backend API contract (`docs/admin-workflows.md`) for expected bucket structure.

### 7.4 Populate the .env File

Create an **untracked** `.env` file in the repo root with your real Supabase credentials:

```bash
# .env (NEVER commit this file)
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_anon_<your-actual-key>
VITE_BACKEND_URL=https://api.nyu-tamid.org/v1  # Or your local dev backend URL
```

**Critical:** `.env` is already in `.gitignore`. Confirm it is never committed:

```bash
git check-ignore .env  # Should return .env
```

### 7.5 No SJBA Data Import

**Explicit reminder:** Do NOT copy any SJBA database rows, storage objects, or user data into the TAMID Supabase project. The new project must start completely empty. Migrating or seeding production event data, board members, or user sessions from SJBA is not part of this rebrand and is explicitly out of scope.

---

## 8. BACKEND API

**Status:** Not created; human-owned provisioning required

The admin app communicates with a backend API at the domain specified by `VITE_BACKEND_URL` (default: `https://api.nyu-tamid.org/v1`). This backend is external to the admin SPA and must be provisioned and deployed separately.

### 8.1 Backend Contract (Unchanged)

The backend must implement the same contract as the SJBA template, consuming the same Supabase project and exposing these routes (example):

- `GET /v1/health` — health check
- `GET/POST /v1/events` — event listing and creation
- `GET/PATCH /v1/events/{id}` — event details and updates
- `POST /v1/events/{id}/flyer` — multipart file upload for event flyersyntax
- `GET/POST /v1/board-members` — board member management
- `GET/PATCH /v1/board-members/{id}` — board member details
- `POST /v1/board-members/{id}/headshot` — headshot upload
- `GET/PATCH /v1/site-config` — global site configuration
- `GET/POST /v1/newsletter-sign-ups` — newsletter signup tracking
- And any other routes documented in `docs/admin-workflows.md` and `src/lib/api.ts`.

Payload shapes, authentication (Supabase bearer token), and the 9.5MB file size ceiling are unchanged from SJBA. The TAMID backend should replicate the contract exactly.

### 8.2 Backend Setup Steps

1. **Scaffold** a new backend service (Node.js/Express, Python/FastAPI, Go, or your choice).
2. **Implement** the routes and logic according to the SJBA template's contract (see above and `docs/admin-workflows.md`).
3. **Wire Supabase:** Configure the backend to connect to the TAMID Supabase project (using the service-role key for admin writes, as appropriate).
4. **Deploy** the backend to `https://api.nyu-tamid.org/v1` (or another host; update `.env` accordingly).
5. **Test** with the admin SPA: once both are deployed and `.env` is configured, log in and verify:
   - Auth works (Supabase bearer token accepted)
   - Event listing loads
   - File uploads succeed (flyersyntax, headshots)
   - Read-only safety guard activates if you point at production (per `docs/local-admin-safety.md`)

### 8.3 Production Safety Check

The admin app includes a read-only mode guard (see `src/lib/adminApi.ts` and `docs/local-admin-safety.md`). When the backend's `/v1/health` response includes `"environment": "production"` or the backend URL matches the hardcoded prod domain, the app disables write operations and shows a banner.

**Ensure your backend responds correctly:**

- Dev backend: `"environment": "development"` or a non-prod domain → app is writable.
- Prod backend (`api.nyu-tamid.org` or equivalent): `"environment": "production"` → app is read-only.

This guard must work before going live to prevent accidental writes to production from a dev/staging build.

---

## 9. DEPLOYMENT & GO-LIVE CHECKLIST

Once all eight sections above are complete, perform a final end-to-end test:

- [ ] **Build & run locally:** `npm install && npm run build && npm run dev`
- [ ] **Verify `.env` is loaded:** App boots without "VITE_* required" errors; console shows correct Supabase URL.
- [ ] **Test login:** Use the admin Supabase user created in Section 7.2 to log in.
- [ ] **Test read-write:** Upload an event flyer, edit board members, etc.
- [ ] **Test read-only guard:** Temporarily point `.env` at the production API; verify the read-only banner appears.
- [ ] **Check UI branding:** Header and sidebar display "TAMID" (not "SJBA"), favicon displays TAMID artwork, accent color matches decision from Section 2.
- [ ] **Run tests:** `npm test` to confirm all 51 tests still pass with your new env values.
- [ ] **Final grep:** `grep -rinE "sjba|jewish|stern|ohortig" src/` should return nothing (except the LICENSE attribution line in the root).

**Deployment target:** Use Vercel, Netlify, or a static host of choice. The app is a React SPA with no backend build requirement (only the separate backend API matters).

---

## 10. SUMMARY TABLE

| Item                          | Owner           | Blocker? | Reference |
| ----------------------------- | --------------- | -------- | --------- |
| Artwork (logo, favicons)      | TAMID Design    | YES      | Section 1 |
| Accent Color                  | TAMID Design    | NO       | Section 2 |
| Domains (admin/api/status)    | TAMID Ops/Infra | YES      | Section 3 |
| Email (contact)               | TAMID Admin     | NO       | Section 4 |
| Social Handles                | TAMID Marketing | NO       | Section 5 |
| GitHub Org/Repo               | TAMID Ops       | YES      | Section 6 |
| Supabase Project & Admin User | TAMID Ops/Eng   | YES      | Section 7 |
| Backend API                   | TAMID Eng       | YES      | Section 8 |
| Deployment                    | TAMID Ops/Eng   | YES      | Section 9 |

**Blocking items (must complete before go-live):** Artwork, Domains, GitHub, Supabase, Backend, Deployment.

**Non-blocking items (nice-to-have before launch; can be updated post-launch):** Accent Color, Email, Social Handles.

---

## 11. REVISION HISTORY

- **2026-08-02** — Initial HUMAN-TODOS.md created after Phase 5 verification gate (PASS). All phases 0-5 complete. Awaiting human provisioning of items 1-8.

---

_Generated by tamid-admin-rebrand workflow, Phase 6 (Human-Owned TODO Manifest)._
