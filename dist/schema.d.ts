import { z } from "zod";
type JsonObject = Record<string, unknown>;
/**
 * Rewrites a JSON schema for a provider's strict structured-output mode:
 * every object lists all its properties as required with
 * `additionalProperties: false`, and a property that was optional becomes
 * nullable instead, so the model can still leave it out by returning null.
 * `stripNulls` undoes that on the way back.
 */
export declare function toStrictJsonSchema(schema: JsonObject): JsonObject;
/** Derives the strict request schema for a zod type (see `toStrictJsonSchema`). */
export declare function zodToStrictJsonSchema(schema: z.ZodType): JsonObject;
/**
 * Removes null-valued keys from every object, recursively, so a field the
 * strict schema forced to be nullable comes back as absent and validates
 * against the caller's `.optional()`. Schemas that need a literal null must
 * not rely on this client's structured output.
 */
export declare function stripNulls(value: unknown): unknown;
export {};
