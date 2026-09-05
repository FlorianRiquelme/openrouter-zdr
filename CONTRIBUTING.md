# Contributing

Thanks for helping. This is a small, deliberately boring library: one job, zero runtime
dependencies, no surprises. Contributions that keep it that way are very welcome.

## Before you start

- **Bugs and ideas** go through [issues](https://github.com/FlorianRiquelme/openrouter-zdr/issues).
  For anything beyond a typo, open one first so we agree on the shape before you write code.
- **Security problems** must not be filed as public issues. See [SECURITY.md](SECURITY.md).
- Read the [Code of Conduct](CODE_OF_CONDUCT.md).

## What fits

- Anything that makes the zero-data-retention pin harder to bypass or easier to verify.
- Fixes and hardening for structured output, model resolution, streaming, or the CLI.
- Documentation that a first-time reader would have wanted.

## What does not fit

- New runtime dependencies. The package ships with none and stays that way.
- Options that weaken or remove `provider.zdr` or `provider.require_parameters`.
- Features that only serve one app. Wrap the client in your own module instead.
- Logging that could ever include a key, a header, or a request body.

## Development

Requirements: Node 22+ and [pnpm](https://pnpm.io) (the version is pinned in `package.json`,
Corepack picks it up).

```sh
pnpm install
pnpm test          # vitest
pnpm lint          # biome
pnpm typecheck     # tsc --noEmit
pnpm build         # emits dist/
pnpm check         # everything CI runs
```

`dist/` is committed so the package installs from a git tag without a build step. Run
`pnpm build` before committing anything under `src/`; CI fails when the committed `dist/`
drifts from the source.

## Pull requests

1. Branch from `main`.
2. Add or update a test in `src/*.test.ts` for every behavior change. Tests use an injected
   `fetch`, never the network.
3. Run `pnpm check` and make sure it passes.
4. Add a line under **Unreleased** in [CHANGELOG.md](CHANGELOG.md).
5. Keep the PR focused. One change per PR is easier to review and easier to revert.

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org) (`feat:`,
`fix:`, `docs:`, `chore:`), in English.

## Releasing (maintainers)

1. Bump `version` in `package.json` and move the **Unreleased** entries under the new version in
   `CHANGELOG.md`.
2. `pnpm check`, commit, then tag `vX.Y.Z` and push the tag.
3. The publish workflow builds, verifies, and publishes to npm with provenance.
