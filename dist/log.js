export const LOG_BODY_LIMIT = 500;
/**
 * Reads at most `LOG_BODY_LIMIT` characters of a response body, cancelling
 * the reader once that much has been decoded so a large or non-terminating
 * error body is never buffered just to log an excerpt. Falls back to
 * `text()` when the body is not a readable stream (test doubles).
 */
export async function readBoundedBody(response) {
    const body = response.body;
    if (!body || typeof body.getReader !== "function") {
        try {
            return (await response.text()).slice(0, LOG_BODY_LIMIT);
        }
        catch {
            return "";
        }
    }
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let text = "";
    try {
        while (text.length < LOG_BODY_LIMIT) {
            const { done, value } = await reader.read();
            if (done)
                break;
            text += decoder.decode(value, { stream: true });
        }
    }
    catch {
        return text.slice(0, LOG_BODY_LIMIT);
    }
    finally {
        try {
            await reader.cancel();
        }
        catch { }
    }
    return text.slice(0, LOG_BODY_LIMIT);
}
export async function describeFailure(response) {
    return {
        status: response.status,
        statusText: response.statusText,
        excerpt: await readBoundedBody(response),
    };
}
/** Default handler: one `console.error` line, never the request or a header. */
export function logUpstreamFailure(appTitle, failure) {
    console.error(`[${appTitle}] OpenRouter ${failure.status} ${failure.statusText}: ${failure.excerpt}`);
}
