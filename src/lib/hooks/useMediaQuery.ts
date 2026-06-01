"use client";

import { useSyncExternalStore } from "react";

type Unsubscribe = () => void;

const noopUnsubscribe: Unsubscribe = () => {};

export function useMediaQuery(query: string, serverFallback = false) {
  return useSyncExternalStore(
    (onStoreChange): Unsubscribe => {
      if (typeof window === "undefined") return noopUnsubscribe;

      const mql = window.matchMedia(query);
      const handler = () => onStoreChange();

      // Safari < 14.1 uses addListener/removeListener.
      if (typeof mql.addEventListener === "function") {
        mql.addEventListener("change", handler);
        return () => mql.removeEventListener("change", handler);
      }

      mql.addListener(handler);
      return () => mql.removeListener(handler);
    },
    () => (typeof window === "undefined" ? serverFallback : window.matchMedia(query).matches),
    () => serverFallback,
  );
}

