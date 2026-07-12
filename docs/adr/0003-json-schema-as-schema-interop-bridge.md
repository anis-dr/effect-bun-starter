# Use JSON Schema as the Schema Interop Bridge

Effect Bun Starter will use Effect Schema as the primary schema system and JSON Schema as the intermediary format when Zod interoperability is needed. This keeps domain validation centered on Effect while avoiding a second parallel schema source; Zod can participate through JSON Schema conversion instead of becoming the fallback modeling language.
