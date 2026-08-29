import { createMiddleware, createStart } from "@tanstack/react-start";

import { handleTracingRequest } from "./tracing-middleware.server";

const tracingMiddleware = createMiddleware().server((options) =>
  handleTracingRequest(options)
);

export const startInstance = createStart(() => ({
  requestMiddleware: [tracingMiddleware],
}));
