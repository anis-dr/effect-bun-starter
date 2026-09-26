import {
  createCsrfMiddleware,
  createMiddleware,
  createStart,
} from "@tanstack/react-start";

import { handleTracingRequest } from "./tracing-middleware.server";

const tracingMiddleware = createMiddleware().server((options) =>
  handleTracingRequest(options)
);

// Server functions forward the visitor's session cookie to the API, so only
// this site's own pages may call them: requests whose Sec-Fetch-Site or
// Origin says another site sent them get a 403. Page loads are not checked.
const csrfMiddleware = createCsrfMiddleware({
  filter: (context) => context.handlerType === "serverFn",
});

// Tracing runs first so rejected requests still show up in traces.
export const startInstance = createStart(() => ({
  requestMiddleware: [tracingMiddleware, csrfMiddleware],
}));
