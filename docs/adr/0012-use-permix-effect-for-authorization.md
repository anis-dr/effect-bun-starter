# Use Permix's Effect Integration for Authorization, Patched for Effect v4

Permissions are declared with [Permix](https://permix.letstri.dev) and checked through `permix/effect`, so rules are typed by resource and action and checks run as Effect services. `packages/domain/src/permissions.ts` holds the catalog (`Permissions`), each role's rules (`rolePermissions`) and `allow(action)`, which fails with `Forbidden` (403). The `Authentication` middleware resolves the signed-in account's role and provides a fresh Permix holding that role's rules for every request, so no request sees another's rules.

Roles: `superadmin` is the account whose email equals `SUPERADMIN_EMAIL` (configuration, not a row), `admin` is an account with a row in `admins`, appointed by the superadmin, and `member` is every other signed-in account.

Permix 4.3.0's Effect adapter targets Effect v3 and fails on Effect v4 because it calls the removed `Context.GenericTag`, so the repo carries a two-line Bun patch (`patches/permix@4.3.0.patch`, registered under `patchedDependencies`) that switches it to `Context.Service` until Permix supports Effect v4.

## Considered Options

- **Permix core behind a local `Context.Service`**: works unpatched, but re-implements the adapter's layers and helpers in this repo.
- **Plain `Effect.fn` policy functions**: no dependency, but no typed resource/action catalog to share with the web app.
- **PostgreSQL row-level security**: enforces row visibility in the database, but needs a transaction per request, a non-owner role, and privileged paths for cross-account queries.

## Consequences

- `permix` is pinned to exactly `4.3.0`; Bun applies the patch only to that version. Before upgrading, check whether the new release still calls `Context.GenericTag`; delete the patch once Permix supports Effect v4.
- Permix checks individual actions and objects; it does not filter queries. Ownership filters (a row belongs to the signed-in account) stay in the SQL.
