import { z } from "zod";
function isObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function nullable(schema) {
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
export function toStrictJsonSchema(schema) {
    const walk = (node) => {
        if (Array.isArray(node))
            return node.map(walk);
        if (!isObject(node))
            return node;
        const out = {};
        for (const [key, value] of Object.entries(node)) {
            if (key === "$schema")
                continue;
            out[key] = walk(value);
        }
        if (out.type === "object" && isObject(out.properties)) {
            const required = new Set(Array.isArray(out.required) ? out.required : []);
            const properties = {};
            for (const [name, property] of Object.entries(out.properties)) {
                properties[name] = required.has(name) ? property : nullable(property);
            }
            out.properties = properties;
            out.required = Object.keys(properties);
            out.additionalProperties = false;
        }
        return out;
    };
    return walk(schema);
}
/** Derives the strict request schema for a zod type (see `toStrictJsonSchema`). */
export function zodToStrictJsonSchema(schema) {
    return toStrictJsonSchema(z.toJSONSchema(schema));
}
/**
 * Removes null-valued keys from every object, recursively, so a field the
 * strict schema forced to be nullable comes back as absent and validates
 * against the caller's `.optional()`. Schemas that need a literal null must
 * not rely on this client's structured output.
 */
export function stripNulls(value) {
    if (Array.isArray(value))
        return value.map(stripNulls);
    if (!isObject(value))
        return value;
    const out = {};
    for (const [key, entry] of Object.entries(value)) {
        if (entry === null)
            continue;
        out[key] = stripNulls(entry);
    }
    return out;
}
