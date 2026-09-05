import { describe, expect, it } from "vitest";
import { LOG_BODY_LIMIT, readBoundedBody } from "./log.js";

describe("readBoundedBody", () => {
	it("caps a streamed body at the limit and cancels the reader", async () => {
		let cancelled = false;
		const chunk = new TextEncoder().encode("x".repeat(200));
		let sent = 0;
		const body = new ReadableStream<Uint8Array>({
			pull(controller) {
				sent += 1;
				controller.enqueue(chunk);
			},
			cancel() {
				cancelled = true;
			},
		});
		const text = await readBoundedBody(new Response(body));
		expect(text).toHaveLength(LOG_BODY_LIMIT);
		expect(cancelled).toBe(true);
		expect(sent).toBeLessThan(10);
	});

	it("falls back to text() when the body is not a stream", async () => {
		const fake = {
			body: null,
			text: () => Promise.resolve("plain error"),
		} as unknown as Response;
		expect(await readBoundedBody(fake)).toBe("plain error");
	});
});
