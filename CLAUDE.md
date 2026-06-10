# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev        # Start dev server (Express + Vite HMR on same port)
pnpm build      # Build frontend (Vite) + bundle server (esbuild) → dist/
pnpm start      # Run production build
pnpm check      # TypeScript type-check (no emit)
pnpm test       # Run vitest test suite
pnpm format     # Prettier format all files
pnpm db:push    # Generate + apply Drizzle migrations to MySQL
```

Run a single test file:
```bash
pnpm vitest run server/briefing.test.ts
```

## Architecture

**Fullstack TypeScript monorepo** — React 19 frontend + Express 4 backend sharing types through tRPC 11. No separate API versioning; the tRPC router IS the contract.

### Request flow

```
Browser → Vite dev proxy → Express → tRPC router → DB (Drizzle/MySQL) or Google API or Claude API
```

In production, Express serves the Vite-built static files directly alongside the API.

### Key directories

- `server/_core/` — framework layer: Express setup, tRPC context/procedures, auth cookies, Claude API wrapper (`llm.ts`), scheduled heartbeat jobs. Touch this rarely.
- `server/` (root files) — feature routers and services: `routers.ts` assembles the full `appRouter`, individual files handle briefing, Gmail/Calendar sync, shift extraction, note parsing.
- `client/src/` — React app. Routes defined in `App.tsx`. Data fetching exclusively via tRPC hooks from `lib/trpc.ts`.
- `drizzle/schema.ts` — single source of truth for DB schema. All tables cascade-delete on `users.id`.
- `shared/` — types shared between client and server.

### Auth pattern

Manus OAuth via session cookies. Backend: `protectedProcedure` in `server/_core/trpc.ts` enforces auth. Frontend: `useAuth()` hook from `client/src/_core/hooks/useAuth.ts`.

### tRPC procedure conventions

- Queries = read, mutations = write/side-effects
- Context carries `{ user, req, res }` — access with `ctx.user` inside procedures
- All procedures live in `server/routers.ts` (assembled) or sub-routers imported there

### Google integration

`server/google.ts` wraps Gmail + Calendar API calls. OAuth tokens stored in `googleTokens` table and refreshed automatically. Sync triggered manually (mutations) or via heartbeat (`server/scheduled.ts`).

### AI / Claude

`server/_core/llm.ts` wraps `@anthropic-ai/sdk`. Briefing generation in `server/briefing.ts` calls Claude with structured markdown output. Shift image extraction in `server/shift-extractor.ts` uses vision.

### Frontend design system

Dark mode default. Colors defined as CSS tokens in `client/src/index.css`:
- Background: `#0a0a0a`, Accent: gold `#e8c547`
- Fonts: Bebas Neue (headings) + DM Sans (body)
- Components: shadcn/ui (config in `components.json`) + Tailwind 4
- Pre-built heavy components: `DashboardLayout`, `AIChatBox`, `BriefingRenderer`, `ShiftsSection`, `Map`
