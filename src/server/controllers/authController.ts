import { NextResponse } from "next/server";
import type { ProjectDraftPayload } from "@/types/project";
import {
  getExpiredSessionCookieOptions,
  getSessionCookieOptions,
  getSessionIdFromCookies,
  SESSION_COOKIE_NAME,
} from "@/server/auth/session";
import { getControllerErrorMessage } from "@/server/controllers/errorMessages";
import { authService } from "@/server/services/authService";

const readJsonBody = async <T>(request: Request) => {
  return (await request.json()) as T;
};

type AuthRequestPayload = {
  email: string;
  password: string;
  username?: string;
  initialProjectDraft?: ProjectDraftPayload;
};

type ForgotPasswordPayload = {
  email: string;
};

type ResetPasswordPayload = {
  token: string;
  password: string;
};

type UpdateProfilePayload = {
  username: string;
};

export const authController = {
  async register(request: Request) {
    try {
      const payload = await readJsonBody<AuthRequestPayload>(request);
      const result = await authService.register({
        email: payload.email,
        username: payload.username ?? "",
        password: payload.password,
        initialProjectDraft: payload.initialProjectDraft,
      });

      const response = NextResponse.json({
        ok: true,
        user: result.user,
        project: result.project ?? null,
      });
      response.cookies.set(
        SESSION_COOKIE_NAME,
        result.sessionId,
        getSessionCookieOptions(),
      );

      return response;
    } catch (error) {
      return NextResponse.json(
        { ok: false, message: getControllerErrorMessage(error) },
        { status: 400 },
      );
    }
  },

  async login(request: Request) {
    try {
      const payload = await readJsonBody<AuthRequestPayload>(request);
      const result = await authService.login({
        email: payload.email,
        password: payload.password,
        initialProjectDraft: payload.initialProjectDraft,
      });

      const response = NextResponse.json({
        ok: true,
        user: result.user,
        project: result.project ?? null,
      });
      response.cookies.set(
        SESSION_COOKIE_NAME,
        result.sessionId,
        getSessionCookieOptions(),
      );

      return response;
    } catch (error) {
      return NextResponse.json(
        { ok: false, message: getControllerErrorMessage(error) },
        { status: 400 },
      );
    }
  },

  async logout() {
    const sessionId = await getSessionIdFromCookies();
    await authService.logout(sessionId);

    const response = NextResponse.json({ ok: true });
    response.cookies.set(
      SESSION_COOKIE_NAME,
      "",
      getExpiredSessionCookieOptions(),
    );

    return response;
  },

  async forgotPassword(request: Request) {
    try {
      const payload = await readJsonBody<ForgotPasswordPayload>(request);
      const result = await authService.requestPasswordReset(payload.email);

      return NextResponse.json({
        ok: true,
        previewUrl: result.previewUrl ?? null,
      });
    } catch (error) {
      return NextResponse.json(
        { ok: false, message: getControllerErrorMessage(error) },
        { status: 400 },
      );
    }
  },

  async updateProfile(userId: string, request: Request) {
    try {
      const payload = await readJsonBody<UpdateProfilePayload>(request);
      const user = await authService.updateUsername(userId, payload.username);

      return NextResponse.json({
        ok: true,
        user,
      });
    } catch (error) {
      return NextResponse.json(
        { ok: false, message: getControllerErrorMessage(error) },
        { status: 400 },
      );
    }
  },

  async sendPasswordResetEmail(userId: string) {
    try {
      const result = await authService.requestPasswordResetForUser(userId);

      return NextResponse.json({
        ok: true,
        previewUrl: result.previewUrl ?? null,
      });
    } catch (error) {
      return NextResponse.json(
        { ok: false, message: getControllerErrorMessage(error) },
        { status: 400 },
      );
    }
  },

  async resetPassword(request: Request) {
    try {
      const payload = await readJsonBody<ResetPasswordPayload>(request);
      await authService.resetPassword(payload.token, payload.password);

      return NextResponse.json({ ok: true });
    } catch (error) {
      return NextResponse.json(
        { ok: false, message: getControllerErrorMessage(error) },
        { status: 400 },
      );
    }
  },

  async session() {
    const sessionId = await getSessionIdFromCookies();
    const user = await authService.getViewerBySessionId(sessionId);
    const response = NextResponse.json({
      ok: true,
      user,
    });

    if (sessionId && user) {
      response.cookies.set(
        SESSION_COOKIE_NAME,
        sessionId,
        getSessionCookieOptions(),
      );

      return response;
    }

    if (sessionId && !user) {
      response.cookies.set(
        SESSION_COOKIE_NAME,
        "",
        getExpiredSessionCookieOptions(),
      );

      return response;
    }

    return response;
  },
};
