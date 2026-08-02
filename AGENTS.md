# AGENTS.md

This repository uses AI coding agents for development assistance.

## Guidelines for Agents

- Work only inside this repository. Do not read or modify files outside the repo root.
- Do not commit `.env` or any file containing real Supabase keys, passwords, or secrets.
- Do not copy, reference, or seed any external organization's data.
- Run `npm run lint`, `npm run format:check`, `npm test`, and `npm run build` before declaring work complete.
- Follow the backend contract documented in `docs/admin-workflows.md` (route paths, payload shapes, 9.5 MB ceiling) exactly.
- For any changes to the production-safety guard in `src/lib/adminApi.ts`, update the corresponding test in `src/lib/adminApi.test.ts`.
