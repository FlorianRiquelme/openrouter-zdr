# openrouter-zdr

An OpenRouter chat client for apps that must never let a prompt reach a host that keeps it.
Every request carries `provider.zdr: true` and `provider.require_parameters: true`, and no
option can remove them. Around that pin: per-module model resolution from env, strict
structured output from a zod schema, streaming for your own relay, and fail-closed error
handling that never throws and never logs a request body or header.

Zero runtime dependencies. `zod` 4 is a peer dependency. ESM only, Node 22+.

## Install

```sh
pnpm add openrouter-zdr zod
```

## Use

Wrap it once per app. In a Next.js app this is the one server-only module allowed to talk to
OpenRouter:

```ts
import "server-only";
import { createOpenRouter } from "openrouter-zdr";

export const openrouter = createOpenRouter({ appTitle: "Familie" });
```

Structured output, typed by the zod schema:

```ts
import { resolveModel } from "openrouter-zdr";

const result = await openrouter.complete({
	model: resolveModel("KUEMMERER", "z-ai/glm-5.3-flash"),
	messages: [{ role: "system", content: prompt }, { role: "user", content: text }],
	schema: ProposedItemsSchema,
	schemaName: "proposed_items",
});
if (result.ok) use(result.data);
else handle(result.reason); // "not_configured" | "upstream_error" | "invalid_output"
```

Optional zod fields become nullable in the strict request schema and nulls are stripped from
the answer before validation, so `.optional()` round-trips. Schemas that need a literal
`null` should not use this path.

Streaming, for a route that relays the SSE body itself:

```ts
const { model, models } = resolveModels("CHAT", "openai/gpt-5.6-luna", [
	"anthropic/claude-sonnet-5",
]);
const sent = await openrouter.stream({ model, models, messages, extra: { tools } });
if (sent.ok) relay(sent.response.body);
```

## Model resolution

| Call | Precedence |
| --- | --- |
| `resolveModel("KUEMMERER", default)` | `KUEMMERER_MODEL` → `OPENROUTER_MODEL` → default |
| `resolveModels("CHAT", default, fallbacks)` | primary as above, then `CHAT_FALLBACK_MODELS` → `OPENROUTER_FALLBACK_MODELS` → `fallbacks`; a blank env value disables fallbacks; the primary is de-duplicated out of the tail |

## Failures

`complete` and `stream` never throw. A missing key never reaches the network. A non-2xx response
is reported to `onUpstreamFailure` with status, status text and at most 500 characters of the
body; the default handler prints one `console.error` line prefixed with `appTitle`. The key,
the request body and the headers are never logged.

## Check a model before deploying

A model without a zero-data-retention endpoint fails closed on every call. Check first:

```sh
pnpm exec openrouter-zdr check-model z-ai/glm-5.3-flash openai/gpt-5.6-luna
```

Exit code 1 if any slug is missing from OpenRouter's ZDR-filtered list.

## What ZDR does and does not cover

- OpenRouter tracks a retention policy per endpoint and routes only to endpoints that keep
  nothing. Under ZDR, first-party OpenAI and Google AI Studio endpoints are excluded; those
  models route via Azure, Bedrock or Vertex.
- Implicit prompt caching counts as not retaining under OpenRouter's policy and stays allowed.
- ZDR is not EU data residency. That is a separate OpenRouter enterprise feature.
- Turn on the account-level ZDR toggles and keep prompt logging off in the OpenRouter dashboard
  as well. This package guarantees the request side; the account guards any code path that
  bypasses it.

## Installing from git

Until the package is on npm, install it straight from a tag. `dist/` is committed so no build
step runs on install, and CI fails if it drifts from `src/`:

```sh
pnpm add github:FlorianRiquelme/openrouter-zdr#v0.1.1
```

## Releasing

CI runs `pnpm check` on every push, which rebuilds `dist/` and fails when the committed copy is stale, so run `pnpm build` before committing. Pushing a `v*` tag runs the publish workflow, which uses npm
trusted publishing (OIDC, no token). Before the first tag, create the package on npm and add
this repository as a trusted publisher in the package settings, or run the first `npm publish`
by hand.
