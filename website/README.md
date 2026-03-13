# ClawSetup Website

This directory contains the standalone `Astro` marketing site for ClawSetup.

## Commands

Run commands from `website/`:

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Content Sources

The first version of the site reuses content from the main repository:

- product messaging from `../README.md`
- Chinese copy reference from `../README.zh-CN.md`
- screenshots copied from `../public/readme/`

## Scope

This site is intentionally separate from the main `Next.js` product app. It is for public-facing product storytelling, screenshots, and GitHub conversion rather than setup wizard functionality.

## Deploy (Vercel)

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New** → **Project**, then select the `huaruic/ClawSetup` repository.
3. Configure:
   - **Root Directory**: `website` (required)
   - **Framework Preset**: Astro (auto-detected)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Click **Deploy**. After the first deploy, each push to the connected branch will trigger a new deployment.
