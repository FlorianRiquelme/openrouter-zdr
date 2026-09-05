export type Env = Record<string, string | undefined>;
export interface ResolvedModels {
    model: string;
    models: string[];
}
/**
 * Resolves the model for one module: `<MODULE>_MODEL` wins, then the shared
 * `OPENROUTER_MODEL`, then the module's own default from code.
 */
export declare function resolveModel(moduleKey: string, fallback: string, env?: Env): string;
/**
 * Resolves the primary model plus the ordered list OpenRouter's `models`
 * fallback field expects: the primary first, then the fallbacks from
 * `<MODULE>_FALLBACK_MODELS`, else `OPENROUTER_FALLBACK_MODELS`, else
 * `defaultFallbacks`. A blank env value disables fallback routing. The
 * primary is de-duplicated out of the tail.
 */
export declare function resolveModels(moduleKey: string, fallback: string, defaultFallbacks?: readonly string[], env?: Env): ResolvedModels;
