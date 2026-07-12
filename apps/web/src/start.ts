import { SpanStatusCode, trace } from "@opentelemetry/api";
import { createMiddleware, createStart } from "@tanstack/react-start";

const tracer = trace.getTracer("effect-bun-starter-web");
const otelTraceProxyPath = "/api/otel/v1/traces";

const tracingMiddleware = createMiddleware().server(
  async ({ next, request }) => {
    await import("./instrumentation.server");

    const url = new URL(request.url);

    if (url.pathname === otelTraceProxyPath) {
      return next();
    }

    return tracer.startActiveSpan(
      `${request.method} ${url.pathname}`,
      async (span) => {
        span.setAttributes({
          "http.method": request.method,
          "http.route": url.pathname,
          "http.url": request.url,
        });

        try {
          const result = await next();
          const status = result.response.status;

          span.setAttribute("http.status_code", status);
          span.setStatus({
            code: status >= 500 ? SpanStatusCode.ERROR : SpanStatusCode.OK,
          });

          return result;
        } catch (error) {
          const exception =
            error instanceof Error ? error : new Error(String(error));

          span.recordException(exception);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: exception.message,
          });
          throw error;
        } finally {
          span.end();
        }
      }
    );
  }
);

export const startInstance = createStart(() => ({
  requestMiddleware: [tracingMiddleware],
}));
