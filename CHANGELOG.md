# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.4] - 2026-09-05

### Changed

- Bumped dev dependencies: `typescript` 5.9.3 → 7.0.2, `@types/node` 22 → 26,
  `@biomejs/biome` 2.5.3 → 2.5.11. No runtime or API changes; `dist/` output is unchanged.

## [0.1.3] - 2026-09-05

### Changed

- Security and code-of-conduct reports go to a personal contact address instead of a
  corporate one. Repository docs only; runtime behavior is unchanged, and the published
  package differs solely in its version and `CHANGELOG.md`.

## [0.1.2] - 2026-09-05

### Added

- Community files: contributing guide, code of conduct, security policy, issue and PR templates.
- Agent-facing discovery: `llms.txt`, `AGENTS.md`, and an installable `openrouter-zdr` skill
  under `skills/` for coding agents.
- npm metadata (keywords, homepage, bugs, `sideEffects: false`) for package discovery.
- Weekly grouped Dependabot updates for npm and GitHub Actions.

### Fixed

- The publish workflow upgrades npm before publishing; Node 22 bundles npm 10, which predates
  OIDC trusted publishing, so both earlier tag builds failed to publish.

## [0.1.1] - 2026-09-05

### Changed

- `dist/` is committed so the package installs from a git tag without a build step. CI fails
  when the committed build drifts from `src/`.

## [0.1.0] - 2026-09-05

### Added

- `createOpenRouter`: chat client that pins `provider.zdr` and `provider.require_parameters`
  on every request, with `complete` (optional zod structured output) and `stream`.
- `resolveModel` / `resolveModels`: per-module model resolution from environment variables.
- `zodToStrictJsonSchema`, `toStrictJsonSchema`, `stripNulls`: strict JSON schema derivation
  with `.optional()` round-tripping.
- `checkModels` and the `openrouter-zdr check-model` CLI.

[Unreleased]: https://github.com/FlorianRiquelme/openrouter-zdr/compare/v0.1.4...HEAD
[0.1.4]: https://github.com/FlorianRiquelme/openrouter-zdr/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/FlorianRiquelme/openrouter-zdr/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/FlorianRiquelme/openrouter-zdr/compare/v0.1.1...v0.1.2
[0.1.0]: https://github.com/FlorianRiquelme/openrouter-zdr/releases/tag/v0.1.0
