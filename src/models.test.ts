import { describe, expect, it } from "vitest";
import { resolveModel, resolveModels } from "./models.js";

describe("resolveModel", () => {
	it("falls back to the code default", () => {
		expect(resolveModel("KUEMMERER", "vendor/default", {})).toBe(
			"vendor/default",
		);
	});

	it("prefers OPENROUTER_MODEL over the default", () => {
		expect(
			resolveModel("KUEMMERER", "vendor/default", {
				OPENROUTER_MODEL: "vendor/shared",
			}),
		).toBe("vendor/shared");
	});

	it("prefers the module key over OPENROUTER_MODEL", () => {
		expect(
			resolveModel("KUEMMERER", "vendor/default", {
				OPENROUTER_MODEL: "vendor/shared",
				KUEMMERER_MODEL: "vendor/module",
			}),
		).toBe("vendor/module");
	});
});

describe("resolveModels", () => {
	it("uses the default fallbacks when no env is set, primary first", () => {
		expect(resolveModels("CHAT", "a/1", ["b/2", "c/3"], {})).toEqual({
			model: "a/1",
			models: ["a/1", "b/2", "c/3"],
		});
	});

	it("de-duplicates the primary out of the tail", () => {
		expect(
			resolveModels("CHAT", "a/1", ["b/2"], { OPENROUTER_MODEL: "b/2" }),
		).toEqual({ model: "b/2", models: ["b/2"] });
	});

	it("reads, trims and filters OPENROUTER_FALLBACK_MODELS", () => {
		expect(
			resolveModels("CHAT", "a/1", ["x/9"], {
				OPENROUTER_FALLBACK_MODELS: " b/2 ,, c/3 ",
			}).models,
		).toEqual(["a/1", "b/2", "c/3"]);
	});

	it("a blank fallback env disables fallback routing", () => {
		expect(
			resolveModels("CHAT", "a/1", ["x/9"], { OPENROUTER_FALLBACK_MODELS: "" })
				.models,
		).toEqual(["a/1"]);
	});

	it("the module's own fallback list wins over the shared one", () => {
		expect(
			resolveModels("CHAT", "a/1", [], {
				OPENROUTER_FALLBACK_MODELS: "b/2",
				CHAT_FALLBACK_MODELS: "c/3",
			}).models,
		).toEqual(["a/1", "c/3"]);
	});
});
