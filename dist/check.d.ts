export declare const MODELS_URL = "https://openrouter.ai/api/v1/models";
export interface ModelCheck {
    slug: string;
    zdr: boolean;
}
/**
 * Looks each slug up in OpenRouter's ZDR-filtered model list, the same
 * filter `provider.zdr` applies at request time. A slug missing there would
 * fail closed on every call.
 */
export declare function checkModels(slugs: readonly string[], fetchImpl?: typeof globalThis.fetch): Promise<ModelCheck[]>;
