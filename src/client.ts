import type { z } from "zod";
import {
	describeFailure,
	logUpstreamFailure,
	type UpstreamFailure,
} from "./log.js";
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
} as const;

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

export type CompleteResult<T> =
	| { ok: true; data: T; content: string }
	| { ok: false; reason: FailureReason | "invalid_output" };

export type StreamResult =
	| { ok: true; response: Response }
	| { ok: false; reason: FailureReason };

export interface OpenRouterClient {
	complete<T = string>(options: CompleteOptions<T>): Promise<CompleteResult<T>>;
	stream(options: StreamOptions): Promise<StreamResult>;
}

function contentOf(envelope: unknown): string | null {
	const content = (
		envelope as { choices?: { message?: { content?: unknown } }[] } | null
	)?.choices?.[0]?.message?.content;
	return typeof content === "string" ? content : null;
}

/**
 * Creates a client whose every request routes only to zero-data-retention
 * endpoints. Nothing thrown: a missing key never reaches the network
 * (`not_configured`), a network failure or a non-2xx response is
 * `upstream_error` (the latter reported through `onUpstreamFailure`), and
 * for `complete` a body the schema rejects is `invalid_output`.
 */
export function createOpenRouter(options: OpenRouterOptions): OpenRouterClient {
	const readKey = options.apiKey ?? (() => process.env.OPENROUTER_API_KEY);
	const doFetch = options.fetch ?? ((...args) => globalThis.fetch(...args));
	const report =
		options.onUpstreamFailure ??
		((failure: UpstreamFailure) =>
			logUpstreamFailure(options.appTitle, failure));

	function buildBody(request: RequestBase, more: Record<string, unknown>) {
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

	async function send(
		body: Record<string, unknown>,
		signal: AbortSignal | undefined,
	): Promise<StreamResult> {
		const apiKey = readKey();
		if (!apiKey) return { ok: false, reason: "not_configured" };
		let response: Response;
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
		} catch {
			return { ok: false, reason: "upstream_error" };
		}
		if (!response.ok) {
			try {
				await report(await describeFailure(response));
			} catch {}
			return { ok: false, reason: "upstream_error" };
		}
		return { ok: true, response };
	}

	return {
		async complete<T = string>(
			request: CompleteOptions<T>,
		): Promise<CompleteResult<T>> {
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
			const signal =
				request.signal ??
				AbortSignal.timeout(request.timeoutMs ?? DEFAULT_TIMEOUT_MS);
			const sent = await send(buildBody(request, responseFormat), signal);
			if (!sent.ok) return sent;

			let content: string | null;
			try {
				content = contentOf(await sent.response.json());
			} catch {
				return { ok: false, reason: "upstream_error" };
			}
			if (content === null || content.trim() === "") {
				return { ok: false, reason: "upstream_error" };
			}
			if (!request.schema) {
				return { ok: true, data: content as T, content };
			}
			let raw: unknown;
			try {
				raw = JSON.parse(content);
			} catch {
				return { ok: false, reason: "invalid_output" };
			}
			const parsed = request.schema.safeParse(stripNulls(raw));
			if (!parsed.success) return { ok: false, reason: "invalid_output" };
			return { ok: true, data: parsed.data, content };
		},

		stream(request: StreamOptions): Promise<StreamResult> {
			return send(buildBody(request, { stream: true }), request.signal);
		},
	};
}
