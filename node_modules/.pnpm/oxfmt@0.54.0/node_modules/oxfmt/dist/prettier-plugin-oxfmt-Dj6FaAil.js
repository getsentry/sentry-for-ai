import { jsTextToDoc } from "./index.js";
//#region src-js/libs/prettier-plugin-oxfmt/text-to-doc.ts
const textToDoc = async (embeddedSourceText, textToDocOptions) => {
	const { parser, parentParser, filepath, _oxfmtPluginOptionsJson } = textToDocOptions;
	const docJSON = await jsTextToDoc(parser === "typescript" || parser === "babel-ts" ? filepath?.endsWith(".tsx") ? "tsx" : "ts" : "jsx", embeddedSourceText, _oxfmtPluginOptionsJson, detectParentContext(parentParser, textToDocOptions));
	if (docJSON === null) throw new Error("`oxfmt::textToDoc()` failed. Use `OXC_LOG` env var to see Rust-side logs.");
	const { doc, refs } = JSON.parse(docJSON);
	if (refs.length === 0) return doc;
	return resolveRefs(doc, refs, Array.from({ length: refs.length }));
};
/**
* Rust emits `Interned` sub-trees once into `refs` and references them via `{ _REF: <id> }` placeholders,
* preventing exponential JSON blowup when the same sub-tree is duplicated variants.
*
* Restore shared object references so Prettier sees the original (memory-shared) structure.
* Identity does not affect output because Prettier identifies groups by their `id` field,
* not by JS object identity.
*
* The `_REF` key (uppercase, prefixed) is chosen to never collide with valid Prettier Doc node keys,
* so the `typeof obj._REF === "number"` check uniquely identifies placeholders.
*
* Refs are resolved on-demand with memoization.
* A ref `i` may reference any other ref `j` (including `j < i`) because Rust caches `Interned` by pointer
* and an earlier-encountered `Interned` (smaller id) can also appear inside a later one's content.
* Topological / reverse-order resolution would observe `undefined` holes, so we recurse lazily.
*/
function resolveRefs(node, rawRefs, cache) {
	if (node === null || typeof node !== "object") return node;
	if (Array.isArray(node)) return node.map((n) => resolveRefs(n, rawRefs, cache));
	const obj = node;
	if (typeof obj._REF === "number") {
		const id = obj._REF;
		const cached = cache[id];
		if (cached !== void 0) return cached;
		const resolved = resolveRefs(rawRefs[id], rawRefs, cache);
		cache[id] = resolved;
		return resolved;
	}
	const out = {};
	for (const k in obj) out[k] = resolveRefs(obj[k], rawRefs, cache);
	return out;
}
/**
* Detects Vue fragment mode from Prettier's internal flags.
*
* When Prettier formats Vue SFC templates, it calls textToDoc with special flags:
* - `__isVueForBindingLeft`: v-for left-hand side (e.g., `(item, index)` in `v-for="(item, index) in items"`)
* - `__isVueBindings`: v-slot bindings (e.g., `{ item }` in `#default="{ item }"`)
* - `__isEmbeddedTypescriptGenericParameters`: `<script generic="...">` type parameters
*/
function detectParentContext(parentParser, options) {
	if (parentParser === "vue") {
		if ("__isVueForBindingLeft" in options) return "vue-for-binding-left";
		if ("__isVueBindings" in options) return "vue-bindings";
		if ("__isEmbeddedTypescriptGenericParameters" in options) return "vue-script-generic";
		return "vue-script";
	}
	if (parentParser === "svelte") return "svelte-script";
	return parentParser;
}
//#endregion
//#region src-js/libs/prettier-plugin-oxfmt/index.ts
/**
* Prettier plugin that uses `oxc_formatter` for (j|t)s-in-xxx part.
*
* When Prettier formats Vue/HTML (which can embed JS/TS code inside) files,
* it calls the `embed()` function for each block.
*
* By default, it uses the `babel` or `typescript` parser and `estree` printer.
* Therefore, by overriding these internally, we can use `oxc_formatter` instead.
* e.g. Now it's possible to apply our builtin sort-imports for JS/TS code inside Vue `<script>`.
*/
const options = { _oxfmtPluginOptionsJson: {
	category: "JavaScript",
	type: "string",
	default: "{}",
	description: "Bundled JSON string for oxfmt-plugin options"
} };
const oxfmtParser = {
	parse: textToDoc,
	astFormat: "OXFMT",
	locStart: () => -1,
	locEnd: () => -1
};
const parsers = {
	babel: oxfmtParser,
	"babel-ts": oxfmtParser,
	typescript: oxfmtParser
};
const printers = { OXFMT: { print: ({ node }) => node } };
//#endregion
export { options, parsers, printers };
