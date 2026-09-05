#!/usr/bin/env node
import { checkModels } from "./check.js";
const [command, ...slugs] = process.argv.slice(2);
if (command !== "check-model" || slugs.length === 0) {
    console.error("usage: openrouter-zdr check-model <model-slug> [...]");
    process.exit(2);
}
const results = await checkModels(slugs);
for (const result of results) {
    console.log(`${result.zdr ? "ok      " : "missing "} ${result.slug}`);
}
process.exit(results.every((result) => result.zdr) ? 0 : 1);
