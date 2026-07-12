# Use Effect Config for Environment Variables

Effect Bun Starter reads environment variables through Effect `Config`. This keeps parsing, defaults, validation, and test overrides inside the Effect runtime instead of scattered direct `process.env` or `Bun.env` reads. Direct environment access is allowed only inside an explicit `ConfigProvider` adapter.
