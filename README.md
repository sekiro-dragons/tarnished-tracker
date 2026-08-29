# Bug Tracker Workspace

A database-free React + Vite bug tracking workspace. Tracker data is seeded and stored in the browser's `localStorage`, while authentication is handled by Supabase Auth.

## Authentication

Tarnished Tracker uses Supabase Auth for:

- Email magic links
- Google OAuth
- GitHub OAuth

Tracker data itself is still stored in browser `localStorage`.

Copy `.env.example` to `.env.local` and configure:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Google and GitHub OAuth providers must also be enabled in the Supabase project.

## Run locally

From the repository root:

```bash
pnpm install
PORT=24577 BASE_PATH=/ pnpm --filter @workspace/bug-tracker run dev
```

Then open the local URL printed by Vite.

The managed Replit workflow supplies `PORT` and `BASE_PATH` automatically, so you can also run the project through the normal Replit preview.

## Build

```bash
PORT=24577 BASE_PATH=/ pnpm --filter @workspace/bug-tracker run build
```

## Data behavior

- Data is seeded the first time the app opens.
- Changes are saved to browser `localStorage`.
- “Reset demo data” restores the original seed data but does not delete the Supabase account.
- Data is local to the current browser and is not shared between devices or users.

## Main source files

- `src/App.tsx` — application pages, data model, state, persistence, and interactions
- `src/index.css` — theme, layout, responsive behavior, and visual styling
- `src/main.tsx` — application entry point
- `src/components/` — shared UI primitives
- `src/lib/supabase.ts` — Supabase client configuration
- `src/lib/help-assistant.ts` — local knowledge-base assistant (Guidance of Grace)
- `src/components/help-assistant.tsx` — Guidance of Grace floating help UI
