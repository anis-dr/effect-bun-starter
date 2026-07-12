import * as React from "react";

const MOBILE_BREAKPOINT = 768;

const getServerSnapshot = () => false;

const getSnapshot = () => window.innerWidth < MOBILE_BREAKPOINT;

const subscribe = (notify: () => void) => {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  mql.addEventListener("change", notify);
  return () => mql.removeEventListener("change", notify);
};

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
