import { describeFailure, logUpstreamFailure, } from "./log.js";
import { stripNulls, zodToStrictJsonSchema } from "./schema.js";
export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
export const DEFAULT_TIMEOUT_MS = 20_000;
/**
 * The two provider preferences every request carries and no option can
 * remove: route only to endpoints with a zero-data-retention policy, and
 * only to hosts that honour every parameter we send, so a strict JSON schema
 * is never silently dropped.
 */
export const PINNED_PROVIDER = {
    zdr: true,
    require_parameters: true,
};
function contentOf(envelope) {
    const content = envelope?.choices?.[0]?.message?.content;
    return typeof content === "string" ? content : null;
}
/**
 * Creates a client whose every request routes only to zero-data-retention
 * endpoints. Nothing thrown: a missing key never reaches the network
 * (`not_configured`), a network failure or a non-2xx response is
 * `upstream_error` (the latter reported through `onUpstreamFailure`), and
 * for `complete` a body the schema rejects is `invalid_output`.
 */
export function createOpenRouter(options) {
    const readKey = options.apiKey ?? (() => process.env.OPENROUTER_API_KEY);
    const doFetch = options.fetch ?? ((...args) => globalThis.fetch(...args));
    const report = options.onUpstreamFailure ??
        ((failure) => logUpstreamFailure(options.appTitle, failure));
    function buildBody(request, more) {
        return {
            ...request.extra,
            model: request.model,
            ...(request.models && request.models.length > 1
                ? { models: request.models }
                : {}),
            messages: request.messages,
            ...more,
            provider: { ...options.provider, ...PINNED_PROVIDER },
        };
    }
    async function send(body, signal) {
        const apiKey = readKey();
        if (!apiKey)
            return { ok: false, reason: "not_configured" };
        let response;
        try {
            response = await doFetch(OPENROUTER_URL, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "X-OpenRouter-Title": options.appTitle,
                },
                body: JSON.stringify(body),
                ...(signal ? { signal } : {}),
            });
        }
        catch {
            return { ok: false, reason: "upstream_error" };
        }
        if (!response.ok) {
            try {
                await report(await describeFailure(response));
            }
            catch { }
            return { ok: false, reason: "upstream_error" };
        }
        return { ok: true, response };
    }
    return {
        async complete(request) {
            const responseFormat = request.schema
                ? {
                    response_format: {
                        type: "json_schema",
                        json_schema: {
                            name: request.schemaName ?? "response",
                            strict: true,
                            schema: zodToStrictJsonSchema(request.schema),
                        },
                    },
                }
                : {};
            const signal = request.signal ??
                AbortSignal.timeout(request.timeoutMs ?? DEFAULT_TIMEOUT_MS);
            const sent = await send(buildBody(request, responseFormat), signal);
            if (!sent.ok)
                return sent;
            let content;
            try {
                content = contentOf(await sent.response.json());
            }
            catch {
                return { ok: false, reason: "upstream_error" };
            }
            if (content === null || content.trim() === "") {
                return { ok: false, reason: "upstream_error" };
            }
            if (!request.schema) {
                return { ok: true, data: content, content };
            }
            let raw;
            try {
                raw = JSON.parse(content);
            }
            catch {
                return { ok: false, reason: "invalid_output" };
            }
            const parsed = request.schema.safeParse(stripNulls(raw));
            if (!parsed.success)
                return { ok: false, reason: "invalid_output" };
            return { ok: true, data: parsed.data, content };
        },
        stream(request) {
            return send(buildBody(request, { stream: true }), request.signal);
        },
    };
}
