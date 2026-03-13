# ClawSetup

![macOS](https://img.shields.io/badge/platform-macOS-black)
![OpenClaw](https://img.shields.io/badge/OpenClaw-local-blue)
![Beginner Friendly](https://img.shields.io/badge/built%20for-beginners-green)
![Status](https://img.shields.io/badge/status-early%20desktop%20client-orange)

**A beginner-friendly OpenClaw Desktop Client for macOS.**  
Install, configure, and run OpenClaw locally through a simple visual interface.

[中文文档](./README.zh-CN.md)

> One-click setup. No terminal required. Built for beginners.

![ClawSetup Welcome](./public/readme/01-welcome.png)

ClawSetup helps beginners and non-technical users get started with OpenClaw on macOS without dealing with manual dependency setup, terminal workflows, or unclear runtime status.

## Why ClawSetup

OpenClaw is powerful, but local setup can still feel too technical for many new users.

For beginners, getting started often means:
- installing dependencies manually
- running unfamiliar terminal commands
- editing configuration files
- connecting a provider correctly
- guessing whether OpenClaw is actually running

That friction stops many users before they ever experience the value of OpenClaw.

ClawSetup turns that experience into a guided visual flow.

## What You Get

- One-click dependency installation
- Visual setup flow for beginners
- Feishu provider configuration
- Local runtime launch and verification
- Installation status and diagnostics
- Log viewer and configuration editing
- A lightweight local dashboard after setup

## Built For

- Beginners exploring OpenClaw for the first time
- Non-technical users who prefer a GUI over terminal workflows
- Hackathon and workshop participants who need fast onboarding
- Anyone who wants a simpler local OpenClaw experience

## How It Works

ClawSetup guides users through a simple local setup flow:

1. Check the local environment
2. Install required dependencies
3. Configure OpenClaw and provider settings
4. Launch OpenClaw locally
5. Verify runtime status
6. Continue from a lightweight local dashboard

The goal is to make OpenClaw feel approachable, visual, and easy to understand.

## Setup Walkthrough

### 1. Check the environment and start

ClawSetup opens with a visual welcome screen, system information, and a short summary of what will happen next.

![Welcome Screen](./public/readme/01-welcome.png)

### 2. Confirm the OpenClaw CLI state

The wizard checks whether the OpenClaw CLI is already installed and shows the current result before moving forward.

![OpenClaw CLI Step](./public/readme/02-openclaw-cli.png)

### 3. Configure your AI provider

Choose a provider, paste the API key, and validate the configuration directly in the UI instead of editing local config by hand.

![AI Provider Step](./public/readme/03-ai-provider.png)

### 4. Start onboarding and inspect runtime progress

ClawSetup configures OpenClaw locally and shows live progress so users can understand what is happening.

![Onboarding Running](./public/readme/04-onboarding-running.png)

### 5. Verify OpenClaw is ready locally

When onboarding succeeds, the wizard shows that OpenClaw is ready and exposes logs plus a direct path into OpenClaw.

![Onboarding Ready](./public/readme/05-onboarding-ready.png)

### 6. Connect Feishu when needed

Feishu setup is optional, but the wizard keeps the connection flow visual and step-by-step.

![Feishu Start](./public/readme/06-feishu-start.png)

### 7. Confirm the bot connection

After connecting the Feishu app, users can continue pairing from the same guided screen.

![Feishu Connected](./public/readme/07-feishu-connected.png)

### 8. Follow pairing approval status

ClawSetup surfaces pairing progress and keeps the current state visible without sending users back to the terminal.

![Feishu Auto Approve](./public/readme/08-feishu-auto-approve.png)

### 9. Finish Feishu pairing

Once pairing is approved, the setup flow clearly confirms that the IM channel is ready.

![Feishu Paired](./public/readme/09-feishu-paired.png)

### 10. Complete setup

The final screen confirms setup success and gives users a direct entry point into the OpenClaw dashboard.

![Setup Complete](./public/readme/10-setup-complete.png)

### 11. See the result inside Feishu

After pairing, users can verify the result directly in Feishu and confirm that the bot is connected.

![Feishu Chat Result](./public/readme/11-feishu-chat.png)

## Quick Start

```bash
git clone https://github.com/huaruic/clawsetup.git
cd clawsetup
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Current Scope

ClawSetup currently focuses on:
- macOS only
- local visual setup
- one-click dependency installation
- Feishu as the first provider integration
- local OpenClaw runtime launch
- lightweight dashboard capabilities

ClawSetup is the setup and onboarding layer of a future OpenClaw Desktop Client.

## Supported Provider

Current:
- Feishu

Planned:
- OpenAI
- Anthropic
- Gemini
- Moonshot

Feishu is the first provider integration used to validate the end-to-end local setup flow. It is not the long-term product boundary.

## Local-First by Design

ClawSetup is built for local OpenClaw usage.

That means:
- no cloud dependency for the setup experience
- local control over runtime and configuration
- better privacy and ownership of your environment
- a simpler path for users who want local AI tools

## Why It Matters

ClawSetup is not just a setup helper.

It is the early-stage experience of a future OpenClaw Desktop Client:
- easier to understand than terminal setup
- more approachable for beginners
- more visual and confidence-building
- better suited for mainstream adoption

## Roadmap

### Now

- macOS setup wizard
- one-click dependency installation
- Feishu provider setup
- runtime launch and verification

### Next

- richer local dashboard
- better log visibility
- improved configuration management
- stronger onboarding experience

### Later

- more providers
- desktop packaging
- deeper OpenClaw management workflows
- cross-platform exploration

## Demo

The screenshots above show the current setup flow from welcome, installation, and provider configuration to onboarding, Feishu pairing, and completion.

Short demo GIFs or videos can later highlight the same journey in motion.

## Why This Project Exists

ClawSetup started from a simple observation:

many people are interested in OpenClaw, but local setup still feels too technical for beginners.

This project exists to make OpenClaw more approachable through a visual, guided, and local-first experience.

## Tech Stack

- [Next.js 16](https://nextjs.org) with App Router
- React 19
- [shadcn/ui](https://ui.shadcn.com)
- Tailwind CSS v4
- TypeScript
- [Zod](https://zod.dev)
- [execa](https://github.com/sindresorhus/execa)

## Development

```bash
npm install
npm run dev
npm run lint
npm run build
```

## Contributing

Contributions are welcome.

If you'd like to improve the onboarding flow, provider support, local runtime experience, or product polish, feel free to open an issue or pull request.

## License

[MIT](./LICENSE)
