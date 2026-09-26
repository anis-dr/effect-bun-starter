import { useRouter } from "@tanstack/react-router";
import type { ComponentProps } from "react";

/**
 * Astryx renders every link through this (`LinkProvider`), so sidebar,
 * header and button hrefs navigate client-side instead of reloading. Modified
 * clicks and `target` links keep the browser's behaviour.
 */
export const RouterLink = ({
  children,
  href,
  onClick,
  ...props
}: ComponentProps<"a"> & { readonly href: string }) => {
  const router = useRouter();
  return (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event);
        const isPlainClick =
          event.button === 0 &&
          !event.defaultPrevented &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.shiftKey &&
          !event.altKey &&
          props.target === undefined;
        if (isPlainClick) {
          event.preventDefault();
          void router.navigate({ href });
        }
      }}
    >
      {children}
    </a>
  );
};
