# Landing Site Stack Decision

## Decision

ClawSetup's public marketing site should use `Astro` as the default stack.

The existing `Next.js` app remains the product application for the setup wizard and API routes. The marketing site should be built as a separate static site instead of being merged into the current app.

## Status

Accepted.

## Why Astro

- The first landing page version is content-first and conversion-first, not app-first.
- The initial scope is a single static page that reuses README copy and product screenshots.
- Astro is a better fit for fast static delivery, simpler content authoring, and lower maintenance for a marketing site.
- Keeping the site separate avoids coupling product code, marketing content, and release cycles.
- Astro leaves room for a future blog, FAQ, changelog, and SEO-focused content pages without carrying the weight of a full app framework.

## Why Not Next.js For V1

- The repository already uses Next.js for the local setup product, so using it again for the landing site would blur the boundary between product app and public website.
- For a mostly static landing page, Next.js adds more application complexity than the current website scope needs.
- The current goal is to ship a lightweight site quickly, not to introduce more shared runtime concerns.

## Implementation Boundary

- Current app: `Next.js` product UI and API routes in this repository.
- New site: `Astro` static marketing site.
- Recommended location for implementation: a separate `website/` project at the repository root, or a dedicated companion repo if deployment and ownership need to stay independent.

## V1 Site Scope

The Astro site should cover:

- Hero with value proposition and CTA
- Problem / solution framing
- Screenshot walkthrough
- Local-first / privacy-first positioning
- FAQ
- GitHub-oriented CTA

## Reuse Plan

The first Astro version should reuse existing repository assets:

- Product messaging from `README.md`
- Chinese copy from `README.zh-CN.md`
- Screenshots from `public/readme/`

## Revisit Conditions

Re-evaluate this decision only if one of the following becomes true:

- The marketing site needs heavy authenticated or dashboard-like interactions
- The team decides the website and product app must share a single runtime and deployment pipeline
- Content pages are no longer the primary website use case
