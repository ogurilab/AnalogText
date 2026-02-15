# Copilot / AI Agent Instructions
## Language
- comments shuold be in Japanese

## Project snapshot
- Vite + TypeScript SPA template. Entry flow: [index.html](index.html) -> [src/main.ts](src/main.ts).
- UI logic example: `setupCounter` in [src/counter.ts](src/counter.ts).

## Key workflows you should use
- Start development server: `npm run dev` (Vite).
- Build and type-check: `npm run build` (runs `tsc` for type-checking, then `vite build`).
- Preview production bundle: `npm run preview`.

Notes:
- `tsc` is invoked during `build` for type-checking only — `tsconfig.json` sets `noEmit: true`. Always ensure types pass locally before creating PRs.

## Project conventions (required to follow)
- Keep explicit file extensions on local imports. Example from code: `import { setupCounter } from './counter.ts'` — do not remove `.ts`.
- Module format: ES modules (`package.json` "type": "module"). Prefer native ESM imports/exports.
- `tsconfig.json` uses `moduleResolution: "bundler"` and `verbatimModuleSyntax: true`: preserve import specifiers exactly as written.
- Strict TypeScript: `strict`, `noUnusedLocals`, `noUnusedParameters` are enabled. Avoid leaving unused identifiers or imports — remove them or use them meaningfully.

## Files to inspect when changing behavior
- [index.html](index.html) — HTML entry; references `/src/main.ts`.
- [src/main.ts](src/main.ts) — app bootstrap, imports CSS and assets, mounts DOM.
- [src/counter.ts](src/counter.ts) — example DOM wiring and event handling.
- [package.json](package.json) and [tsconfig.json](tsconfig.json) — scripts and compiler rules.

## Examples & patterns to mimic
- DOM selection with type assertions and non-null: `document.querySelector<HTMLButtonElement>('#counter')!` — follow nullable/nonnull handling patterns used here.
- Asset imports use absolute paths or Vite-resolved imports (e.g. `/vite.svg` or `import viteLogo from '/vite.svg'`). Use Vite asset conventions.

## What not to change without discussion
- Do not remove `.ts` extensions from imports.
- Do not change `tsconfig` flags (e.g., `noEmit`, `moduleResolution`) without coordinating — they affect how Vite and TypeScript interact here.
- There is no test or CI configuration in the repo; do not add a test framework or CI pipeline without confirming the preferred approach.

## PR checklist for AI-generated changes
- Run `npm run build` locally; fix any type errors first.
- Run `npm run dev` to sanity-check UI interactions.
- Keep changes minimal and consistent with the existing simple structure.

If any of these points are unclear or you'd like the agent to follow additional conventions (formatting, linting, tests), tell me and I'll update this file.
