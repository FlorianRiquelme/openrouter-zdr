import { z } from "zod";

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nullable(schema: unknown): JsonObject {
	if (isObject(schema) && Array.isArray(schema.anyOf)) {
		return { ...schema, anyOf: [...schema.anyOf, { type: "null" }] };
	}
	return { anyOf: [schema, { type: "null" }] };
}

/**
 * Rewrites a JSON schema for a provider's strict structured-output mode:
 * every object lists all its properties as required with
 * `additionalProperties: false`, and a property that was optional becomes
 * nullable instead, so the model can still leave it out by returning null.
 * `stripNulls` undoes that on the way back.
 */
export function toStrictJsonSchema(schema: JsonObject): JsonObject {
	const walk = (node: unknown): unknown => {
		if (Array.isArray(node)) return node.map(walk);
		if (!isObject(node)) return node;
		const out: JsonObject = {};
		for (const [key, value] of Object.entries(node)) {
			if (key === "$schema") continue;
			out[key] = walk(value);
		}
		if (out.type === "object" && isObject(out.properties)) {
			const required = new Set(
				Array.isArray(out.required) ? (out.required as string[]) : [],
			);
			const properties: JsonObject = {};
			for (const [name, property] of Object.entries(out.properties)) {
				properties[name] = required.has(name) ? property : nullable(property);
			}
			out.properties = properties;
			out.required = Object.keys(properties);
			out.additionalProperties = false;
		}
		return out;
	};
	return walk(schema) as JsonObject;
}

/** Derives the strict request schema for a zod type (see `toStrictJsonSchema`). */
export function zodToStrictJsonSchema(schema: z.ZodType): JsonObject {
	return toStrictJsonSchema(z.toJSONSchema(schema) as JsonObject);
}

/**
 * Removes null-valued keys from every object, recursively, so a field the
 * strict schema forced to be nullable comes back as absent and validates
 * against the caller's `.optional()`. Schemas that need a literal null must
 * not rely on this client's structured output.
 */
export function stripNulls(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(stripNulls);
	if (!isObject(value)) return value;
	const out: JsonObject = {};
	for (const [key, entry] of Object.entries(value)) {
		if (entry === null) continue;
		out[key] = stripNulls(entry);
	}
	return out;
}
