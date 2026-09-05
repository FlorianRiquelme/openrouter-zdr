export const MODELS_URL = "https://openrouter.ai/api/v1/models";

export interface ModelCheck {
	slug: string;
	zdr: boolean;
}

/**
 * Looks each slug up in OpenRouter's ZDR-filtered model list, the same
 * filter `provider.zdr` applies at request time. A slug missing there would
 * fail closed on every call.
 */
export async function checkModels(
	slugs: readonly string[],
	fetchImpl: typeof globalThis.fetch = globalThis.fetch,
): Promise<ModelCheck[]> {
	const response = await fetchImpl(`${MODELS_URL}?zdr=true`);
	if (!response.ok) {
		throw new Error(`OpenRouter models list: ${response.status}`);
	}
	const data = (await response.json()) as { data?: { id?: unknown }[] };
	const available = new Set(
		(data.data ?? [])
			.map((model) => model.id)
			.filter((id): id is string => typeof id === "string"),
	);
	return slugs.map((slug) => ({ slug, zdr: available.has(slug) }));
}
