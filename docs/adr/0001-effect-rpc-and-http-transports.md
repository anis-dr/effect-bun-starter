# Use Effect HttpApi For Type-Safe HTTP

Effect Bun Starter will use Effect `HttpApi` as the default client/server contract for application and external HTTP. This gives end-to-end type safety through shared Effect Schema contracts, typed successes, typed expected errors, and generated clients without requiring a parallel RPC surface. Effect RPC is deferred until a concrete first-party transport needs it, such as browser workers or another controlled internal channel.
