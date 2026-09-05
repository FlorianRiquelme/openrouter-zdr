# Security Policy

This package exists to keep prompts away from hosts that retain them, so security and privacy
reports get priority over everything else.

## Reporting a vulnerability

Please do not open a public issue. Use one of:

- **GitHub private vulnerability reporting**:
  [Report a vulnerability](https://github.com/FlorianRiquelme/openrouter-zdr/security/advisories/new)
- **Email**: flo@friquelme.dev

Include what you observed, a minimal reproduction if you have one, and the package version.
You will get an acknowledgement within a few days and a fix or a clear answer as soon as
possible after that. Credit is given in the release notes unless you prefer otherwise.

## What counts

Anything that lets a request leave this client without `provider.zdr: true` and
`provider.require_parameters: true`, anything that logs or exposes an API key, a header, or a
request body, and the usual classes of library bugs (prototype pollution through the schema
rewriter, unbounded reads, and so on).

Behavior on OpenRouter's side, such as which endpoints are classified as zero-data-retention,
is outside this package. Report those to [OpenRouter](https://openrouter.ai) directly.

## Supported versions

Only the latest published minor receives fixes. Upgrade before reporting if you can.
