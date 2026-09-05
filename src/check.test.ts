import { describe, expect, it } from "vitest";
import { checkModels } from "./check.js";

describe("checkModels", () => {
	it("queries the ZDR-filtered list and flags slugs missing from it", async () => {
		let url = "";
		const fetchImpl = ((input: string) => {
			url = input;
			return Promise.resolve(
				new Response(JSON.stringify({ data: [{ id: "a/1" }, { id: "b/2" }] })),
			);
		}) as unknown as typeof fetch;
		const result = await checkModels(["a/1", "c/3"], fetchImpl);
		expect(url).toContain("zdr=true");
		expect(result).toEqual([
			{ slug: "a/1", zdr: true },
			{ slug: "c/3", zdr: false },
		]);
	});

	it("throws when the list cannot be fetched", async () => {
		const fetchImpl = (() =>
			Promise.resolve(
				new Response("", { status: 503 }),
			)) as unknown as typeof fetch;
		await expect(checkModels(["a/1"], fetchImpl)).rejects.toThrow("503");
	});
});
