# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ClawSetup is a local setup wizard for installing and configuring OpenClaw with a Feishu (Lark) plugin. It is a single Next.js application with both the UI and API routes in one project.

## Commands

- `npm run dev` — Next.js dev server (port 3000)
- `npm run build` — production build
- `npm run start` — start production server
- `npm run lint` — ESLint (flat config, core-web-vitals + typescript)

## Architecture

### Frontend (Next.js 16 + React 19, App Router)
- UI library: shadcn/ui (base-nova style) with Tailwind CSS v4, lucide-react icons
- Multi-step wizard flow with shared layout component `SetupShell` (`src/components/setup-shell.tsx`):
  - `/` — Environment Check (auto-runs preflight checks on mount)
  - `/feishu` — Feishu Configuration (app credentials form, loads saved config)
  - `/verify` — Initialize & Verify (auto-runs pipeline on mount)
  - `/done` — Setup Complete (opens OpenClaw Dashboard)

### API Routes (`src/app/api/`)
- All API logic lives in Next.js Route Handlers (no separate backend)
- Shared server-side modules in `src/lib/`:
  - `shell.ts` — Platform adapter (Unix/Windows), shell execution via execa, command existence checks
  - `tasks.ts` — In-memory async task system (create, execute, log, track by UUID)
  - `feishu.ts` — Feishu config persistence (~/.clawsetup/feishu.json), tenant token exchange, bot API verification

### API Endpoints
- `GET /api/health` — health check
- `GET /api/system/info` — platform, node version, openclaw detection
- `POST /api/preflight/check` — checks for node, openclaw, npx
- `POST /api/install/openclaw` — triggers async install task
- `POST /api/install/feishu-plugin` — triggers async plugin install task
- `GET /api/tasks/:id` — task status; `GET /api/tasks/:id/logs` — task logs; `GET /api/tasks/:id/stream` — SSE log stream
- `GET /api/config/preview` — preview saved feishu config
- `POST /api/config/feishu/validate` — validates feishu config shape
- `POST /api/config/apply` — stores feishu config
- `POST /api/runtime/restart` — start/restart openclaw gateway (skips if already running)
- `GET /api/runtime/status` — gateway status
- `POST /api/runtime/verify` — full verification (gateway + Feishu API)

## Key Conventions

- Single Next.js project — run `npm install` at root
- API routes use relative paths (no CORS needed)
- Feishu config is persisted to `~/.clawsetup/feishu.json`
- Tasks are tracked in-memory via UUID-keyed Map with SSE streaming
