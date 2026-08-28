# Bug Tracker Workspace

A database-free React + Vite bug tracking workspace. It uses seeded demo records and browser `localStorage` so the complete demo works without Postgres, Supabase, an API server, or account setup.

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
- “Reset demo data” restores the original seed data.
- Data is local to the current browser and is not shared between devices or users.

## Main source files

- `src/App.tsx` — application pages, data model, state, persistence, and interactions
- `src/index.css` — theme, layout, responsive behavior, and visual styling
- `src/main.tsx` — application entry point
- `src/components/` — shared UI primitives