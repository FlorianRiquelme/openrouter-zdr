import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createOpenRouter, OPENROUTER_URL } from "./client.js";

type Init = Parameters<typeof fetch>[1];

function envelope(content: unknown) {
	return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}

function harness(respond: (body: Record<string, unknown>) => Response) {
	const calls: { url: string; init: Init; body: Record<string, unknown> }[] =
		[];
	const fetchImpl = vi.fn((input: unknown, init?: Init) => {
		const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
		calls.push({ url: String(input), init, body });
		return Promise.resolve(respond(body));
	}) as unknown as typeof fetch;
	return { calls, fetchImpl };
}

const messages = [{ role: "user" as const, content: "hi" }];

describe("createOpenRouter", () => {
	it("pins ZDR and require_parameters even when a caller tries to turn them off", async () => {
		const { calls, fetchImpl } = harness(() => envelope("ok"));
		const client = createOpenRouter({
			appTitle: "T",
			apiKey: () => "k",
			fetch: fetchImpl,
			provider: { zdr: false, require_parameters: false, sort: "price" },
		});
		await client.complete({ model: "m/1", messages });
		expect(calls[0]?.body.provider).toEqual({
			sort: "price",
			zdr: true,
			require_parameters: true,
		});
	});

	it("sends the title header and bearer key to the chat completions URL", async () => {
		const { calls, fetchImpl } = harness(() => envelope("ok"));
		const client = createOpenRouter({
			appTitle: "Familie",
			apiKey: () => "secret",
			fetch: fetchImpl,
		});
		await client.complete({ model: "m/1", messages });
		expect(calls[0]?.url).toBe(OPENROUTER_URL);
		const headers = calls[0]?.init?.headers as Record<string, string>;
		expect(headers["X-OpenRouter-Title"]).toBe("Familie");
		expect(headers.Authorization).toBe("Bearer secret");
	});

	it("never reaches the network without a key", async () => {
		const { calls, fetchImpl } = harness(() => envelope("ok"));
		const client = createOpenRouter({
			appTitle: "T",
			apiKey: () => undefined,
			fetch: fetchImpl,
		});
		expect(await client.complete({ model: "m/1", messages })).toEqual({
			ok: false,
			reason: "not_configured",
		});
		expect(await client.stream({ model: "m/1", messages })).toEqual({
			ok: false,
			reason: "not_configured",
		});
		expect(calls).toHaveLength(0);
	});

	it("sends models only when more than one is named, and passes extra fields through", async () => {
		const { calls, fetchImpl } = harness(() => envelope("ok"));
		const client = createOpenRouter({
			appTitle: "T",
			apiKey: () => "k",
			fetch: fetchImpl,
		});
		await client.complete({ model: "m/1", models: ["m/1"], messages });
		await client.complete({
			model: "m/1",
			models: ["m/1", "m/2"],
			messages,
			extra: { temperature: 0.2 },
		});
		expect(calls[0]?.body.models).toBeUndefined();
		expect(calls[1]?.body.models).toEqual(["m/1", "m/2"]);
		expect(calls[1]?.body.temperature).toBe(0.2);
	});

	it("returns the content as data when no schema is given", async () => {
		const { fetchImpl } = harness(() => envelope("Hallo"));
		const client = createOpenRouter({
			appTitle: "T",
			apiKey: () => "k",
			fetch: fetchImpl,
		});
		expect(await client.complete({ model: "m/1", messages })).toEqual({
			ok: true,
			data: "Hallo",
			content: "Hallo",
		});
	});

	it("requests strict structured output and returns null-stripped, validated data", async () => {
		const { calls, fetchImpl } = harness(() =>
			envelope(
				JSON.stringify({
					items: [{ type: "task", title: "Windeln", dueDate: null }],
				}),
			),
		);
		const client = createOpenRouter({
			appTitle: "T",
			apiKey: () => "k",
			fetch: fetchImpl,
		});
		const schema = z.object({
			items: z.array(
				z.object({
					type: z.enum(["task", "note"]),
					title: z.string(),
					dueDate: z.string().optional(),
				}),
			),
		});
		const result = await client.complete({
			model: "m/1",
			messages,
			schema,
			schemaName: "proposed_items",
		});
		expect(result).toEqual({
			ok: true,
			data: { items: [{ type: "task", title: "Windeln" }] },
			content: expect.any(String),
		});
		const format = calls[0]?.body.response_format as {
			type: string;
			json_schema: { name: string; strict: boolean; schema: unknown };
		};
		expect(format.type).toBe("json_schema");
		expect(format.json_schema.name).toBe("proposed_items");
		expect(format.json_schema.strict).toBe(true);
		expect(JSON.stringify(format.json_schema.schema)).toContain(
			'"additionalProperties":false',
		);
	});

	it("reports invalid_output for JSON the schema rejects and for non-JSON", async () => {
		const client = (content: string) =>
			createOpenRouter({
				appTitle: "T",
				apiKey: () => "k",
				fetch: harness(() => envelope(content)).fetchImpl,
			});
		const schema = z.object({ n: z.number() });
		expect(
			await client('{"n":"x"}').complete({ model: "m/1", messages, schema }),
		).toEqual({ ok: false, reason: "invalid_output" });
		expect(
			await client("not json {").complete({ model: "m/1", messages, schema }),
		).toEqual({ ok: false, reason: "invalid_output" });
	});

	it("classifies a non-2xx as upstream_error and reports a bounded excerpt without headers", async () => {
		const { fetchImpl } = harness(
			() =>
				new Response(`{"error":"${"e".repeat(900)}"}`, {
					status: 429,
					statusText: "Too Many Requests",
				}),
		);
		const failures: unknown[] = [];
		const client = createOpenRouter({
			appTitle: "T",
			apiKey: () => "k",
			fetch: fetchImpl,
			onUpstreamFailure: (failure) => {
				failures.push(failure);
			},
		});
		expect(await client.complete({ model: "m/1", messages })).toEqual({
			ok: false,
			reason: "upstream_error",
		});
		const failure = failures[0] as {
			status: number;
			statusText: string;
			excerpt: string;
		};
		expect(failure.status).toBe(429);
		expect(failure.statusText).toBe("Too Many Requests");
		expect(failure.excerpt).toHaveLength(500);
		expect(JSON.stringify(failure)).not.toContain("Bearer");
	});

	it("classifies a thrown fetch and an empty envelope as upstream_error", async () => {
		const throwing = createOpenRouter({
			appTitle: "T",
			apiKey: () => "k",
			fetch: (() => Promise.reject(new Error("down"))) as typeof fetch,
		});
		expect(await throwing.complete({ model: "m/1", messages })).toEqual({
			ok: false,
			reason: "upstream_error",
		});
		const empty = createOpenRouter({
			appTitle: "T",
			apiKey: () => "k",
			fetch: harness(() => new Response(JSON.stringify({ choices: [] })))
				.fetchImpl,
		});
		expect(await empty.complete({ model: "m/1", messages })).toEqual({
			ok: false,
			reason: "upstream_error",
		});
	});

	it("stream sets stream:true and hands back the untouched Response", async () => {
		const upstream = new Response("data: {}\n\n", { status: 200 });
		const { calls, fetchImpl } = harness(() => upstream);
		const client = createOpenRouter({
			appTitle: "T",
			apiKey: () => "k",
			fetch: fetchImpl,
		});
		const result = await client.stream({
			model: "m/1",
			messages,
			extra: { tools: [{ type: "function" }] },
		});
		expect(result).toEqual({ ok: true, response: upstream });
		expect(calls[0]?.body.stream).toBe(true);
		expect(calls[0]?.body.tools).toEqual([{ type: "function" }]);
		expect(calls[0]?.body.provider).toEqual({
			zdr: true,
			require_parameters: true,
		});
	});
});
