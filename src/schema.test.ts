import { describe, expect, it } from "vitest";
import { z } from "zod";
import { stripNulls, zodToStrictJsonSchema } from "./schema.js";

describe("zodToStrictJsonSchema", () => {
	const schema = z.object({
		items: z.array(
			z.object({
				type: z.enum(["appointment", "task"]),
				title: z.string().describe("Kurzer Titel"),
				place: z.string().optional(),
			}),
		),
	});

	it("requires every property, forbids extras and makes optionals nullable", () => {
		const out = zodToStrictJsonSchema(schema) as {
			$schema?: unknown;
			required: string[];
			additionalProperties: boolean;
			properties: {
				items: {
					items: {
						required: string[];
						additionalProperties: boolean;
						properties: Record<string, unknown>;
					};
				};
			};
		};
		expect(out.$schema).toBeUndefined();
		expect(out.required).toEqual(["items"]);
		expect(out.additionalProperties).toBe(false);
		const item = out.properties.items.items;
		expect(item.required).toEqual(["type", "title", "place"]);
		expect(item.additionalProperties).toBe(false);
		expect(item.properties.title).toEqual({
			type: "string",
			description: "Kurzer Titel",
		});
		expect(item.properties.place).toEqual({
			anyOf: [{ type: "string" }, { type: "null" }],
		});
		expect(item.properties.type).toEqual({
			type: "string",
			enum: ["appointment", "task"],
		});
	});

	it("appends null to an existing anyOf instead of nesting it", () => {
		const out = zodToStrictJsonSchema(
			z.object({
				v: z
					.union([z.object({ a: z.string() }), z.object({ b: z.number() })])
					.optional(),
			}),
		) as { properties: { v: { anyOf: { type: string }[] } } };
		expect(out.properties.v.anyOf.map((entry) => entry.type)).toEqual([
			"object",
			"object",
			"null",
		]);
	});
});

describe("stripNulls", () => {
	it("drops null keys at every depth and leaves arrays intact", () => {
		expect(
			stripNulls({
				a: null,
				b: [{ c: null, d: 1 }, null, "x"],
				e: { f: null, g: false },
			}),
		).toEqual({ b: [{ d: 1 }, null, "x"], e: { g: false } });
	});
});
