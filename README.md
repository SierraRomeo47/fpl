# FPL DnD

Next.js app for Fantasy Premier League: squad view, transfers, league tools, and AI-style insights using your FPL session.

## Prerequisites

- Node.js 20+ recommended (matches deployment docs)
- npm (or pnpm/yarn)

## Run locally

```bash
cd fpl
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Log in via `/login` so the app can associate your team entry.

## Scripts

| Command | Purpose |
|--------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `npm test` | Jest tests |

## Configuration

- Use `.env.local` for local secrets or overrides (not committed; see `.gitignore`).
- `sessions.json` is created at runtime for session storage — gitignored; do not commit it.

## Misc

- **Deployment**: see `DEPLOYMENT.md` (Hetzner-oriented guide).
- **Browser extension / automation helpers**: `tools/extension-automation/`
- **Design reference**: `../stitch_fpl_design_system/` (parent folder)
