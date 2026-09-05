import type { z } from "zod";
import { type UpstreamFailure } from "./log.js";
export declare const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
export declare const DEFAULT_TIMEOUT_MS = 20000;
/**
 * The two provider preferences every request carries and no option can
 * remove: route only to endpoints with a zero-data-retention policy, and
 * only to hosts that honour every parameter we send, so a strict JSON schema
 * is never silently dropped.
 */
export declare const PINNED_PROVIDER: {
    readonly zdr: true;
    readonly require_parameters: true;
};
export interface ProviderPreferences {
    order?: string[];
    only?: string[];
    ignore?: string[];
    allow_fallbacks?: boolean;
    sort?: "price" | "throughput" | "latency";
    quantizations?: string[];
    [key: string]: unknown;
}
export interface OpenRouterOptions {
    /** Sent as `X-OpenRouter-Title` and used as the log prefix. */
    appTitle: string;
    /** Defaults to `process.env.OPENROUTER_API_KEY`, read on every call. */
    apiKey?: () => string | undefined;
    /** Extra provider preferences, merged under the pinned ones. */
    provider?: ProviderPreferences;
    /** Called on a non-2xx response. Defaults to one `console.error` line. */
    onUpstreamFailure?: (failure: UpstreamFailure) => void | Promise<void>;
    /** Injectable for tests; defaults to `globalThis.fetch`. */
    fetch?: typeof globalThis.fetch;
}
export interface ChatMessage {
    role: "system" | "user" | "assistant" | "tool";
    content: unknown;
    [key: string]: unknown;
}
interface RequestBase {
    model: string;
    /** OpenRouter's fallback list; sent only when it names more than one model. */
    models?: string[];
    messages: ChatMessage[];
    /** Extra body fields passed through verbatim (tools, temperature, …). */
    extra?: Record<string, unknown>;
    signal?: AbortSignal;
}
export interface CompleteOptions<T> extends RequestBase {
    /** When set, the response is parsed, null-stripped and validated with it. */
    schema?: z.ZodType<T>;
    schemaName?: string;
    /** Defaults to `DEFAULT_TIMEOUT_MS`; ignored when `signal` is given. */
    timeoutMs?: number;
}
export type StreamOptions = RequestBase;
export type FailureReason = "not_configured" | "upstream_error";
export type CompleteResult<T> = {
    ok: true;
    data: T;
    content: string;
} | {
    ok: false;
    reason: FailureReason | "invalid_output";
};
export type StreamResult = {
    ok: true;
    response: Response;
} | {
    ok: false;
    reason: FailureReason;
};
export interface OpenRouterClient {
    complete<T = string>(options: CompleteOptions<T>): Promise<CompleteResult<T>>;
    stream(options: StreamOptions): Promise<StreamResult>;
}
/**
 * Creates a client whose every request routes only to zero-data-retention
 * endpoints. Nothing thrown: a missing key never reaches the network
 * (`not_configured`), a network failure or a non-2xx response is
 * `upstream_error` (the latter reported through `onUpstreamFailure`), and
 * for `complete` a body the schema rejects is `invalid_output`.
 */
export declare function createOpenRouter(options: OpenRouterOptions): OpenRouterClient;
export {};
