/**
 * Resolves the model for one module: `<MODULE>_MODEL` wins, then the shared
 * `OPENROUTER_MODEL`, then the module's own default from code.
 */
export function resolveModel(moduleKey, fallback, env = process.env) {
    return env[`${moduleKey}_MODEL`] ?? env.OPENROUTER_MODEL ?? fallback;
}
function parseList(raw) {
    return raw
        .split(",")
        .map((slug) => slug.trim())
        .filter((slug) => slug.length > 0);
}
/**
 * Resolves the primary model plus the ordered list OpenRouter's `models`
 * fallback field expects: the primary first, then the fallbacks from
 * `<MODULE>_FALLBACK_MODELS`, else `OPENROUTER_FALLBACK_MODELS`, else
 * `defaultFallbacks`. A blank env value disables fallback routing. The
 * primary is de-duplicated out of the tail.
 */
export function resolveModels(moduleKey, fallback, defaultFallbacks = [], env = process.env) {
    const model = resolveModel(moduleKey, fallback, env);
    const raw = env[`${moduleKey}_FALLBACK_MODELS`] ?? env.OPENROUTER_FALLBACK_MODELS;
    const fallbacks = raw === undefined ? [...defaultFallbacks] : parseList(raw);
    return {
        model,
        models: [model, ...fallbacks.filter((slug) => slug !== model)],
    };
}
