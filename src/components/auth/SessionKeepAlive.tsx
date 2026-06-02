"use client";

import { useEffect } from "react";

export function SessionKeepAlive() {
  useEffect(() => {
    const controller = new AbortController();

    void fetch("/api/auth/session", {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    }).catch(() => {});

    return () => controller.abort();
  }, []);

  return null;
}
