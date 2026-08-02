# TAMID Group at NYU -- Website Admin Panel

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![CI](https://github.com/TAMID-Group-at-NYU/TAMID_site_internal/actions/workflows/ci.yml/badge.svg)](https://github.com/TAMID-Group-at-NYU/TAMID_site_internal/actions/workflows/ci.yml)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel&logoColor=white)](https://admin.nyu-tamid.org)
[![Node.js](https://img.shields.io/badge/node-24.x-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.1-blue?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.3-purple?logo=vite&logoColor=white)](https://vitejs.dev/)

A React admin panel for managing the TAMID Group at NYU website content.

TAMID Group at NYU is an apolitical, areligious student organization that builds professional skills
through engagement with the Israeli economy. TAMID programs include Education, Consulting, Investment
Fund, and Israel Fellowship.

This admin panel allows authorized TAMID members to manage events, board members, newsletter
subscribers, semesters, and site configuration through a backend API and Supabase.

**Live Admin Panel**: [admin.nyu-tamid.org](https://admin.nyu-tamid.org) [PLACEHOLDER]
**Live API**: [api.nyu-tamid.org](https://api.nyu-tamid.org) [PLACEHOLDER]
**Status Page**: [status.nyu-tamid.org](https://status.nyu-tamid.org) [PLACEHOLDER]

## Getting Started

### Prerequisites

- Node.js 24.x
- A TAMID Supabase project with an admin user configured (see [Local admin safety](./docs/local-admin-safety.md))
- A running TAMID backend API at `VITE_BACKEND_URL`

### Local Development

```bash
cp .env.example .env
# Fill in your local Supabase URL + publishable key in .env
npm install
npm run dev
```

The app proxies `/v1` to `http://localhost:3000` by default. See `.env.example` for all required
variables.

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

## Documentation

- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [AGENTS.md](./AGENTS.md)
- [Admin workflows](./docs/admin-workflows.md)
- [Local admin safety](./docs/local-admin-safety.md)

## Contact

TAMID Group at NYU

Email: [tamid@nyu.edu](mailto:tamid@nyu.edu) [PLACEHOLDER]

Feel free to reach out to report bugs, ask questions, or inquire about joining the development team.

## License

This project is licensed under the [MIT License](./LICENSE).
