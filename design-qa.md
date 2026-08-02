# Design QA Notes

This file tracks visual fidelity evidence for the TAMID Group at NYU admin panel.

## Brand Color — RESOLVED

Decision (2026-08-02): the TAMID palette is **Navy `#18274B` (primary)** + **Sky Blue `#41B5E8` (accent)**,
per `brand/STYLE.md` (extracted from the national TAMID Group site). The inherited SJBA tokens have been
replaced in `src/index.css`:

- `--primary: #18274B` (navy), `--primary-foreground: #FFFFFF` (readable white on navy)
- `--accent`, `--ring`, `--sidebar-primary`, `--accent-brand` → Sky Blue `#41B5E8`
- Secondary blues (`#219CD3`, `#0F94CF`) map to `--chart-2/3`; grays `#F5F5F5/#F2F2F2/#EBEAEA/#E1E1E1/#808080`
  map to `--secondary/--muted/--border/--input/--muted-foreground`.
- Semantic status colors (success-green / destructive-red dots in `App.css`) are intentionally kept — they
  are state indicators, not brand accents.

Fonts switched from Geist to **Roboto** (headings/UI) + **Open Sans** (body) via a Google Fonts link in
`index.html`, matching the public site. See `STYLE.md` in the repo root for the full brand kit.

## Storage Browser

- Desktop and mobile layouts verified against the target design.
- Compact file rows, breadcrumb path, search, and toolbar actions confirmed functional.
- No P0/P1/P2 findings remain.

## Artwork

- `public/tamid-logo-clear.png` now holds the national TAMID wordmark (`brand/logos/tamid-logo-dark.png`,
  dark text for the light admin shell).
- Favicons (`public/favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`) are
  still placeholders — replace with a TAMID sky-blue icon-only mark before going live.
