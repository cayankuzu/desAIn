import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Viewer } from "@/types/project";
import {
  getExpiredSessionCookieOptions,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/server/auth/sessionPolicy";
import { authService } from "@/server/services/authService";

export {
  getExpiredSessionCookieOptions,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/server/auth/sessionPolicy";

export const setSessionCookie = async (sessionId: string) => {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, getSessionCookieOptions());
};

export const clearSessionCookie = async () => {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", getExpiredSessionCookieOptions());
};

export const getSessionIdFromCookies = async () => {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
};

export const getCurrentViewer = async (): Promise<Viewer | null> => {
  return authService.getViewerBySessionId(await getSessionIdFromCookies());
};

export const requireViewer = async () => {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    redirect("/giris");
  }

  return viewer;
};
