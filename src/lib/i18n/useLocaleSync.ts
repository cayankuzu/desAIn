"use client";

import { useEffect } from "react";
import { useUIStore } from "@/store/uiStore";

export function useLocaleSync() {
  const locale = useUIStore((state) => state.locale);
  const setLocale = useUIStore((state) => state.setLocale);

  useEffect(() => {
    const storedLocale = window.localStorage.getItem("desain-locale");

    if (storedLocale === "tr" || storedLocale === "en") {
      setLocale(storedLocale);
    }
  }, [setLocale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return { locale, setLocale };
}
