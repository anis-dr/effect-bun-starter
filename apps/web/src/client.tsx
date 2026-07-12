import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";

import { startBrowserTelemetry } from "./instrumentation.client";

startBrowserTelemetry();

const { StartClient } = await import("@tanstack/react-start/client");

hydrateRoot(
  document,
  <StrictMode>
    <StartClient />
  </StrictMode>
);
