# CONTRIBUTING.md

## Development Setup

1. Clone the repository.
2. Run `npm install` (Node 24.x required).
3. Copy `.env.example` to `.env` and fill in your local Supabase URL and publishable key.
4. Start a local Supabase stack and create an admin user per `docs/local-admin-safety.md`.
5. Run `npm run dev` to start the Vite dev server.

## Pull Request Flow

1. Create a feature branch from `main`.
2. Make your changes. Run `npm run lint`, `npm run format:check`, `npm test`, and `npm run build` locally.
3. Open a pull request against `main` with a clear description of the change.
4. CI runs lint, format check, tests, and build automatically.
5. At least one review is required before merging.

## Code Style

- TypeScript strict mode. No `any` unless justified.
- Prettier + ESLint enforce formatting (run `npm run format` to auto-fix).
- Do not weaken existing test assertions; update expected values to match new behavior.

## Security

- Never commit `.env`, real Supabase keys, or service-role credentials.
- The production-safety read-only guard in `src/lib/adminApi.ts` must remain functional. See `docs/local-admin-safety.md`.
