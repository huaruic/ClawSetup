# ClawSetup

A local setup wizard for installing and configuring [OpenClaw](https://openclaw.ai) with [Feishu (Lark)](https://www.feishu.cn) bot integration.

[中文文档](./README.zh-CN.md)

## What It Does

ClawSetup guides non-technical users through four steps to get OpenClaw running locally with a Feishu bot:

1. **Environment Check** — Validates Node.js, OpenClaw CLI, and gateway status. Offers one-click install if missing.
2. **Feishu Configuration** — Collects App ID, App Secret, and Verification Token with a link to the setup guide.
3. **Initialize & Verify** — Starts the gateway, applies config, and verifies Feishu API connectivity (token exchange + bot info).
4. **Done** — Opens the OpenClaw Dashboard.

## Quick Start

```bash
git clone https://github.com/anthropics/ClawSetup.git
cd ClawSetup
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Prerequisites

- **Node.js** >= 18
- **OpenClaw CLI** (the wizard can install it for you)

## Project Structure

```
ClawSetup/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Step 1: Environment Check
│   │   ├── feishu/page.tsx       # Step 2: Feishu Configuration
│   │   ├── verify/page.tsx       # Step 3: Initialize & Verify
│   │   ├── done/page.tsx         # Step 4: Setup Complete
│   │   └── api/                  # API Route Handlers
│   │       ├── health/
│   │       ├── system/info/
│   │       ├── preflight/check/
│   │       ├── install/{openclaw,feishu-plugin}/
│   │       ├── config/{preview,apply,feishu/validate}/
│   │       ├── runtime/{restart,status,verify}/
│   │       └── tasks/[id]/{,logs/,stream/}
│   ├── components/
│   │   ├── setup-shell.tsx       # Shared wizard layout
│   │   └── ui/                   # shadcn/ui components
│   └── lib/
│       ├── shell.ts              # Shell execution & platform adapter
│       ├── tasks.ts              # In-memory async task system
│       ├── feishu.ts             # Feishu API client & config persistence
│       └── utils.ts
├── public/
├── package.json
├── next.config.ts
├── tsconfig.json
└── CLAUDE.md
```

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router) with React 19
- **UI**: [shadcn/ui](https://ui.shadcn.com) + [Tailwind CSS v4](https://tailwindcss.com)
- **Validation**: [Zod v4](https://zod.dev)
- **Shell Execution**: [execa](https://github.com/sindresorhus/execa)
- **Language**: TypeScript (strict)

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/system/info` | Platform, Node.js, OpenClaw detection |
| POST | `/api/preflight/check` | Check for node, openclaw, npx |
| POST | `/api/install/openclaw` | Trigger async OpenClaw install |
| POST | `/api/install/feishu-plugin` | Trigger async Feishu plugin install |
| GET | `/api/tasks/:id` | Task status |
| GET | `/api/tasks/:id/logs` | Task logs |
| GET | `/api/tasks/:id/stream` | SSE log stream |
| GET | `/api/config/preview` | Preview saved Feishu config |
| POST | `/api/config/feishu/validate` | Validate Feishu config shape |
| POST | `/api/config/apply` | Save Feishu config |
| POST | `/api/runtime/restart` | Start/restart OpenClaw gateway |
| GET | `/api/runtime/status` | Gateway status |
| POST | `/api/runtime/verify` | Full verification (gateway + Feishu API) |

## Scripts

```bash
npm run dev       # Start development server (port 3000)
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[MIT](./LICENSE)
