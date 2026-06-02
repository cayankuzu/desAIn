export const SESSION_COOKIE_NAME =
  process.env.DESAIN_SESSION_COOKIE_NAME ?? "desain_session";
export const SESSION_DURATION_DAYS = 3650;
export const SESSION_COOKIE_MAX_AGE_SECONDS =
  60 * 60 * 24 * SESSION_DURATION_DAYS;

export const getSessionCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
});

export const getExpiredSessionCookieOptions = () => ({
  ...getSessionCookieOptions(),
  maxAge: 0,
});
