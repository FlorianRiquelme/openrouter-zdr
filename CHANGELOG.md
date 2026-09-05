# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Community files: contributing guide, code of conduct, security policy, issue and PR templates.
- Agent-facing discovery: `llms.txt`, `AGENTS.md`, and an installable `openrouter-zdr` skill
  under `skills/` for coding agents.
- npm metadata (keywords, homepage, bugs, `sideEffects: false`) for package discovery.

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

[Unreleased]: https://github.com/FlorianRiquelme/openrouter-zdr/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/FlorianRiquelme/openrouter-zdr/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/FlorianRiquelme/openrouter-zdr/releases/tag/v0.1.0
