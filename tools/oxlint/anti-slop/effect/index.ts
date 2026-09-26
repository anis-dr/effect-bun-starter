import { eslintCompatPlugin } from "@oxlint/plugins";

import { effectNamingRule } from "./rules/effect-naming.ts";
import { noServiceConstructorImportsRule } from "./rules/no-service-constructor-imports.ts";

/** Opt-in Oxlint rules for Effect service and Layer architecture. */
const antiSlopEffectPlugin = eslintCompatPlugin({
	meta: { name: "anti-slop-effect" },
	rules: {
		"effect-naming": effectNamingRule,
		"no-service-constructor-imports": noServiceConstructorImportsRule,
	},
});

export default antiSlopEffectPlugin;
