import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { defineRule } from "@oxlint/plugins";

import type { ESTree } from "@oxlint/plugins";

// The naming rows of CODING_STANDARDS.md that a linter can check (ADR 0018).

/** `appLayer`, `pgClientLayer`, `testLayer`. */
const LAYER_VALUE = /^[a-z][A-Za-z0-9]*Layer$/u;
/** `layer`, `layerConfig`, `layerBun`, `layerTest`. */
const STATIC_LAYER = /^layer(?:[A-Z][A-Za-z0-9]*)?$/u;
/** The Effect 2/3 style: `DatabaseLive`, `AppLayer`. */
const LEGACY_LAYER = /^[A-Z][A-Za-z0-9]*(?:Live|Layer)$/u;
const SPAN_NAME = /^[A-Z][A-Za-z0-9]*\.[a-z][A-Za-z0-9]*$/u;
const CONFIG_KEY = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/u;
const ATOM_VALUE = /^[a-z][A-Za-z0-9]*Atom$/u;
const KEBAB_FILE = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)*\.[cm]?[jt]sx?$/u;
const LAYER_BUILDERS = new Set(["Layer", "HttpApiBuilder"]);
/** HTTP API errors are named for their outcome (`StoresUnavailable`). */
const API_ERRORS_DIR = /\/packages\/domain\/src\/api\//u;
/** TanStack Router names these files by its own scheme. */
const ROUTE_FILE = /\/routes\//u;

const packageNames = new Map<string, string | undefined>();

/** The `name` of the package.json nearest to `directory`, walking up. */
function nearestPackageName(directory: string): string | undefined {
	if (packageNames.has(directory)) return packageNames.get(directory);
	const manifest = join(directory, "package.json");
	const parent = dirname(directory);
	const name = existsSync(manifest)
		? (JSON.parse(readFileSync(manifest, "utf8")) as { readonly name?: string }).name
		: parent === directory
			? undefined
			: nearestPackageName(parent);
	packageNames.set(directory, name);
	return name;
}

function propertyName(node: ESTree.MemberExpression): string | undefined {
	if (node.property.type === "Identifier") return node.property.name;
	if (node.property.type === "Literal" && typeof node.property.value === "string")
		return node.property.value;
	return undefined;
}

function isMember(node: ESTree.Node, object: string, property?: string): boolean {
	return (
		node.type === "MemberExpression" &&
		node.object.type === "Identifier" &&
		node.object.name === object &&
		(property === undefined || propertyName(node) === property)
	);
}

function stringLiteral(node: ESTree.Node | undefined): string | undefined {
	return node?.type === "Literal" && typeof node.value === "string" ? node.value : undefined;
}

/** `Layer.succeed(…)`, `HttpApiBuilder.group(…)`, `Database.layer`,
 * `PgClient.layer(…)`, `appLayer`, or a `.pipe(…)` of any of them. */
function isLayerExpression(node: ESTree.Node): boolean {
	if (node.type === "Identifier") return LAYER_VALUE.test(node.name);
	if (node.type === "MemberExpression") {
		if (node.object.type === "Identifier" && LAYER_BUILDERS.has(node.object.name)) return true;
		const name = propertyName(node);
		return name !== undefined && STATIC_LAYER.test(name);
	}
	if (node.type !== "CallExpression" || node.callee.type !== "MemberExpression") return false;
	if (propertyName(node.callee) === "pipe")
		return (
			isLayerExpression(node.callee.object) ||
			node.arguments.some((argument) => isLayerExpression(argument))
		);
	return isLayerExpression(node.callee);
}

function returnsLayer(node: ESTree.Node | null | undefined): boolean {
	if (node?.type !== "ArrowFunctionExpression") return false;
	return node.body.type !== "BlockStatement" && isLayerExpression(node.body);
}

/** `Atom.make(…)`, `Atom.family(…)`, `ApiClient.runtime.fn(…)(…)`, or a
 * `.pipe(…)` of one. */
function isAtomExpression(node: ESTree.Node): boolean {
	if (node.type !== "CallExpression") return false;
	const { callee } = node;
	if (callee.type === "CallExpression") return isAtomExpression(callee);
	if (callee.type !== "MemberExpression") return false;
	if (isMember(callee.object, "Atom")) return true;
	if (callee.object.type === "Identifier" && callee.object.name === "Atom") return true;
	if (callee.object.type === "MemberExpression" && propertyName(callee.object) === "runtime")
		return true;
	if (propertyName(callee) === "pipe") return isAtomExpression(callee.object);
	return false;
}

/** `X.Service<…>()("key", …)` or `Schema.TaggedError<…>()("Tag", …)`: the
 * builder name and the first string argument. */
function classFactory(
	superClass: ESTree.Node | null | undefined,
): { readonly builder: string; readonly key: string; readonly node: ESTree.Node } | undefined {
	if (superClass?.type !== "CallExpression") return undefined;
	const inner = superClass.callee;
	if (inner.type !== "CallExpression" || inner.callee.type !== "MemberExpression") return undefined;
	const builder = propertyName(inner.callee);
	const keyNode = superClass.arguments[0];
	const key = stringLiteral(keyNode);
	if (builder === undefined || key === undefined || keyNode === undefined) return undefined;
	return { builder, key, node: keyNode };
}

export const effectNamingRule = defineRule({
	meta: {
		type: "suggestion",
		docs: {
			description:
				"Name Effect code the way Effect does: services, layers, errors, spans, config keys, atoms and files (CODING_STANDARDS.md, ADR 0018).",
		},
		messages: {
			layerValue:
				'Layer "{{name}}": a service\'s layer is a static layer / layer<Variant> member (e.g. Database.layer); any other Layer is camelCase ending in Layer (e.g. appLayer).',
			staticLayer: 'Static Layer member "{{name}}" must be named layer or layer<Variant> (e.g. layerConfig).',
			serviceKey:
				'Service key "{{key}}" must be "{{expected}}" (the nearest package.json name, then the class name).',
			errorName:
				'Error class "{{name}}" must end in Error (e.g. AuthConfigError). Only HTTP API errors in packages/domain/src/api/ are named for their outcome.',
			errorTag: 'Error tag "{{tag}}" must equal its class name "{{name}}".',
			spanName: 'Span "{{name}}" must be "<Module>.<operation>" (e.g. "Auth.getSession").',
			configKey: 'Config key "{{name}}" must be UPPER_SNAKE (e.g. DATABASE_URL).',
			atomName: 'Atom "{{name}}" must be camelCase ending in Atom (e.g. storesAtom).',
			fileName:
				'File "{{name}}" must be kebab-case and named for what it holds; HttpApi handler files end in -handlers, never -live.',
		},
	},
	create(context) {
		const filename = context.filename.replaceAll("\\", "/");
		const isApiErrorFile = API_ERRORS_DIR.test(filename);

		return {
			Program(node) {
				if (ROUTE_FILE.test(filename)) return;
				const base = filename.slice(filename.lastIndexOf("/") + 1);
				if (!KEBAB_FILE.test(base) || /-live\.[cm]?[jt]sx?$/u.test(base))
					context.report({ node, messageId: "fileName", data: { name: base } });
			},
			ClassDeclaration(node) {
				if (node.id === null) return;
				const name = node.id.name;
				const factory = classFactory(node.superClass);
				if (factory === undefined) return;
				if (factory.builder === "Service") {
					const expected = `${nearestPackageName(dirname(filename)) ?? "<package>"}/${name}`;
					if (factory.key !== expected)
						context.report({ node: factory.node, messageId: "serviceKey", data: { expected, key: factory.key } });
					return;
				}
				if (factory.builder !== "TaggedError") return;
				if (!isApiErrorFile && !name.endsWith("Error"))
					context.report({ node: node.id, messageId: "errorName", data: { name } });
				if (factory.key !== name)
					context.report({ node: factory.node, messageId: "errorTag", data: { name, tag: factory.key } });
			},
			CallExpression(node) {
				const { callee } = node;
				if (isMember(callee, "Effect", "fn")) {
					const span = stringLiteral(node.arguments[0]);
					if (span !== undefined && !SPAN_NAME.test(span))
						context.report({ node: node.arguments[0] ?? node, messageId: "spanName", data: { name: span } });
					return;
				}
				// Constructors (`Config.String`, `Config.Redacted`) take a key;
				// combinators (`Config.withDefault`) take values.
				if (isMember(callee, "Config") && callee.type === "MemberExpression" && /^[A-Z]/u.test(propertyName(callee) ?? ""))
					for (const argument of node.arguments) {
						const key = stringLiteral(argument);
						if (key !== undefined && !CONFIG_KEY.test(key))
							context.report({ node: argument, messageId: "configKey", data: { name: key } });
					}
			},
			VariableDeclarator(node) {
				if (node.id.type !== "Identifier") return;
				const { name } = node.id;
				const init = node.init ?? undefined;
				const holdsLayer = (init !== undefined && isLayerExpression(init)) || returnsLayer(init);
				if ((holdsLayer && !LAYER_VALUE.test(name)) || LEGACY_LAYER.test(name))
					context.report({ node: node.id, messageId: "layerValue", data: { name } });
				if (init !== undefined && isAtomExpression(init) && !ATOM_VALUE.test(name))
					context.report({ node: node.id, messageId: "atomName", data: { name } });
			},
			PropertyDefinition(node) {
				if (!node.static || node.key.type !== "Identifier") return;
				const { name } = node.key;
				const holdsLayer = (node.value !== null && node.value !== undefined && isLayerExpression(node.value)) || returnsLayer(node.value);
				if ((holdsLayer || /layer/iu.test(name)) && !STATIC_LAYER.test(name))
					context.report({ node: node.key, messageId: "staticLayer", data: { name } });
			},
		};
	},
});
