# Render by Audience; Keep Each Area's Data in That Area

Two rules for every screen of the web app.

**Rendering follows the audience.** Public pages (every screen a visitor or a search engine can reach without signing in) render on the server with their content in the first HTML, so they are indexable and paint fast; they may be cached at the edge (a CDN) when that is what keeps them fast. After that first paint a public page behaves like an app: interactions (filters, menus, forms) update in place without full page loads. Signed-in areas (an account page, an admin area) are tools, not landing pages: they optimise for fast interactions, may render in the browser, and may fetch, cache and prefetch their own data freely so screens switch instantly.

**Data stays in the area that owns it.** A screen loads data for its own audience and area, never another area's. A public page never requests a signed-in account's private data (drafts, owned lists, settings), and a signed-in area never makes a public page wait on it. Within an area, screens may share and reuse the same queries rather than each getting a bespoke endpoint; add a dedicated endpoint only when the shared data is too large or too private for the screen that needs it.

We chose this because public pages are judged on search visibility and first paint, and signed-in areas on how quickly people can act. The cost is a server loader for every public route.
