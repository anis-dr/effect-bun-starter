import {
  context,
  propagation,
  SpanKind,
  SpanStatusCode,
  trace,
} from "@opentelemetry/api";
import type { Span } from "@opentelemetry/api";
import {
  ATTR_HTTP_REQUEST_METHOD,
  ATTR_HTTP_RESPONSE_STATUS_CODE,
  ATTR_HTTP_ROUTE,
  ATTR_SERVER_ADDRESS,
  ATTR_URL_PATH,
} from "@opentelemetry/semantic-conventions";
import { createMiddleware } from "@tanstack/react-start";
import { Effect, Option, Schema } from "effect";

import "./instrumentation.server";

const tracer = trace.getTracer("effect-bun-starter-web");
const otelTraceProxyPath = "/api/otel/v1/traces";
const middleware = createMiddleware();
type RequestHandler = NonNullable<typeof middleware.options.server>;

function spanName(
  handlerType: string,
  method: string,
  route: Option.Option<string>,
  serverFunctionName: Option.Option<string>
): string {
  if (handlerType === "serverFn" && Option.isSome(serverFunctionName)) {
    return `${method} serverFn.${serverFunctionName.value}`;
  }
  if (Option.isSome(route)) {
    return `${method} ${route.value}`;
  }
  return `HTTP ${method}`;
}

export const handleTracingRequest: RequestHandler = function ({
  handlerType,
  next,
  pathname,
  request,
  serverFnMeta,
}) {
  const url = new URL(request.url);
  if (url.pathname === otelTraceProxyPath) {
    return next();
  }

  const route = Option.liftPredicate(
    pathname,
    () => handlerType === "router" && pathname === "/"
  );
  const serverFunctionName = Option.map(
    Option.fromNullishOr(serverFnMeta),
    ({ name }) => name
  );
  const name = spanName(handlerType, request.method, route, serverFunctionName);
  const parentContext = propagation.extract(
    context.active(),
    Object.fromEntries(request.headers)
  );

  function runSpan(span: Span) {
    if (Option.isSome(route)) {
      span.setAttribute(ATTR_HTTP_ROUTE, route.value);
    }

    const requestEffect = Effect.gen(function* runNext() {
      const result = next();
      if (result instanceof Promise) {
        return yield* Effect.promise(() => result);
      }
      return result;
    });
    const tracedRequest = requestEffect.pipe(
      Effect.tap((result) =>
        Effect.sync(() => {
          const status = result.response.status;
          span.setAttribute(ATTR_HTTP_RESPONSE_STATUS_CODE, status);
          if (status >= 500) {
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: `HTTP ${status}`,
            });
          }
          span.end();
        })
      ),
      Effect.tapDefect((defect) =>
        Effect.sync(() => {
          const exception = Option.liftPredicate(
            defect,
            Schema.is(Schema.Error())
          );
          const message = Option.match(exception, {
            onNone: () => String(defect),
            onSome: (error) => error.message,
          });
          const recordedException = Option.match(exception, {
            onNone: () => message,
            onSome: (error) => error,
          });
          span.recordException(recordedException);
          span.setStatus({ code: SpanStatusCode.ERROR, message });
          span.end();
        })
      )
    );
    return Effect.runPromise(tracedRequest);
  }

  return tracer.startActiveSpan(
    name,
    {
      attributes: {
        [ATTR_HTTP_REQUEST_METHOD]: request.method,
        [ATTR_SERVER_ADDRESS]: url.hostname,
        [ATTR_URL_PATH]: pathname,
        "tanstack.start.handler.type": handlerType,
      },
      kind: SpanKind.SERVER,
    },
    parentContext,
    runSpan
  );
};
