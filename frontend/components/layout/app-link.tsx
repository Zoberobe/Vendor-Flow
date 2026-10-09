"use client";

import Link from "next/link";
import { forwardRef, type ComponentProps } from "react";

type Props = ComponentProps<typeof Link>;

/** Keep client-side navigation, but recover if a route transition stalls. */
export const AppLink = forwardRef<HTMLAnchorElement, Props>(function AppLink(
  { onClick, prefetch = false, ...props },
  ref,
) {
  return (
    <Link
      {...props}
      ref={ref}
      prefetch={prefetch}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (event.currentTarget.target && event.currentTarget.target !== "_self") return;

        const currentUrl = window.location.href;
        const destination = event.currentTarget.href;
        if (destination === currentUrl) return;
        window.setTimeout(() => {
          if (window.location.href === currentUrl) window.location.assign(destination);
        }, 2000);
      }}
    />
  );
});
