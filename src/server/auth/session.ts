import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Viewer } from "@/types/project";
import { authService } from "@/server/services/authService";

export const SESSION_COOKIE_NAME =
  process.env.DESAIN_SESSION_COOKIE_NAME ?? "desain_session";

export const getSessionCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30,
});

export const getExpiredSessionCookieOptions = () => ({
  ...getSessionCookieOptions(),
  maxAge: 0,
});

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
