# AGENTS.md

Guidance for coding agents working **in this repository**. To *use* the package in another
project, read `skills/openrouter-zdr/SKILL.md` or `llms.txt` instead.

## What this is

A zero-dependency OpenRouter chat client whose one invariant is that every request carries
`provider.zdr: true` and `provider.require_parameters: true`. Everything else (zod structured
output, env-based model resolution, streaming, the `check-model` CLI) is in service of making
that safe default easy to adopt. Source lives in `src/`, one module per concern, each with a
sibling `*.test.ts`.

## Commands

```sh
pnpm install
pnpm test        # vitest, no network: tests inject fetch
pnpm lint        # biome (tabs, double quotes, organized imports)
pnpm typecheck
pnpm build       # tsc -> dist/ (committed!)
pnpm check       # all of the above + fails if dist/ is stale
```

Run `pnpm build` after any change under `src/` and commit `dist/` with it. CI runs `pnpm check`.

## Rules

- Never add a runtime dependency. `zod` stays a peer dependency.
- Never add an option, flag, or code path that removes or weakens the pinned provider fields.
  `PINNED_PROVIDER` is spread last on purpose; keep it that way.
- Never log or include in an error the API key, request headers, or request body. Upstream
  failures surface only status, status text, and a bounded excerpt (`LOG_BODY_LIMIT`).
- `complete` and `stream` never throw. New failure modes are new `reason` values, not exceptions.
- Every behavior change gets a test with an injected `fetch`, and a line under **Unreleased**
  in `CHANGELOG.md`.
- Exports go through `src/index.ts`. Keep the public surface small; prefer documenting a pattern
  over adding an API for it.
- Do not edit `.github/workflows/` or `.github/dependabot.yml` as part of a feature change;
  automation is maintained separately.

## Style

TypeScript strict with `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`. Biome
formats; do not fight it. Doc comments explain *why* a guard exists, not what the line does.
Conventional Commits in English.
