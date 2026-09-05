export declare const LOG_BODY_LIMIT = 500;
export interface UpstreamFailure {
    status: number;
    statusText: string;
    /** At most `LOG_BODY_LIMIT` characters of the response body. */
    excerpt: string;
}
/**
 * Reads at most `LOG_BODY_LIMIT` characters of a response body, cancelling
 * the reader once that much has been decoded so a large or non-terminating
 * error body is never buffered just to log an excerpt. Falls back to
 * `text()` when the body is not a readable stream (test doubles).
 */
export declare function readBoundedBody(response: Response): Promise<string>;
export declare function describeFailure(response: Response): Promise<UpstreamFailure>;
/** Default handler: one `console.error` line, never the request or a header. */
export declare function logUpstreamFailure(appTitle: string, failure: UpstreamFailure): void;
