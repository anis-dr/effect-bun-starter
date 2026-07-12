import { HttpEffect, HttpRouter } from "effect/unstable/http";

export type WebHandler = (request: Request) => Promise<Response>;

export const makeAuthRoutes = (handler: WebHandler) =>
  HttpRouter.add("*", "/api/auth/*", HttpEffect.fromWebHandler(handler));
