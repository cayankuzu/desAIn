import crypto from "node:crypto";
import type { ProjectDraftPayload, ProjectSummary, Viewer } from "@/types/project";
import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from "@/lib/appLimits";
import { hashPassword, hashToken, verifyPassword } from "@/server/auth/password";
import { SESSION_DURATION_DAYS } from "@/server/auth/sessionPolicy";
import { getDatabaseConfig } from "@/server/db/config";
import { getPersistenceAdapter, rowToViewer } from "@/server/repositories/persistenceAdapter";
import { projectService } from "@/server/services/projectService";

const RESET_TOKEN_DURATION_MINUTES = 30;

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const normalizeUsername = (username: string) => username.trim();

const assertEmail = (email: string) => {
  const normalized = normalizeEmail(email);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error("Gecerli bir e-posta adresi giriniz.");
  }

  return normalized;
};

const assertUsername = (username: string) => {
  const normalized = normalizeUsername(username);

  if (normalized.length < USERNAME_MIN_LENGTH) {
    throw new Error(`Kullanici adi en az ${USERNAME_MIN_LENGTH} karakter olmali.`);
  }

  if (normalized.length > USERNAME_MAX_LENGTH) {
    throw new Error(`Kullanici adi ${USERNAME_MAX_LENGTH} karakterden uzun olamaz.`);
  }

  return normalized;
};

const assertPassword = (password: string) => {
  if (password.length < 8) {
    throw new Error("Sifre en az 8 karakter olmali.");
  }

  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error("Sifre en az bir harf ve bir rakam icermeli.");
  }

  return password;
};

const assertPasswordForLogin = (password: string) => {
  if (!password.trim()) {
    throw new Error("Sifre alani bos birakilamaz.");
  }

  return password;
};

const toSessionExpiry = () => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);
  return expiresAt.toISOString();
};

const toResetExpiry = () => {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + RESET_TOKEN_DURATION_MINUTES);
  return expiresAt.toISOString();
};

export interface AuthSuccessResult {
  user: Viewer;
  sessionId: string;
  project?: ProjectSummary;
}

const sanitizeProjectSummary = (project: ProjectSummary | null | undefined) => {
  return project ?? undefined;
};

const saveDraftProjectForUser = async (
  userId: string,
  draft: ProjectDraftPayload | undefined,
) => {
  if (!draft) {
    return undefined;
  }

  const saved = await projectService.saveProject(userId, draft);
  return projectService.toSummary(saved);
};

export const authService = {
  async register(input: {
    email: string;
    username: string;
    password: string;
    initialProjectDraft?: ProjectDraftPayload;
  }): Promise<AuthSuccessResult> {
    const adapter = await getPersistenceAdapter();
    const email = assertEmail(input.email);
    const username = assertUsername(input.username);
    const password = assertPassword(input.password);

    if (await adapter.users.findByEmail(email)) {
      throw new Error("Bu e-posta adresi ile olusturulmus bir hesap zaten var.");
    }

    if (await adapter.users.findByUsername(username)) {
      throw new Error("Bu kullanici adi zaten kullanimda.");
    }

    const passwordHash = await hashPassword(password);
    const user = await adapter.users.create({
      email,
      username,
      passwordHash,
    });
    const session = await adapter.sessions.create(user.id, toSessionExpiry());
    const project = await saveDraftProjectForUser(user.id, input.initialProjectDraft);

    return {
      user: rowToViewer(user),
      sessionId: session.id,
      project: sanitizeProjectSummary(project),
    };
  },

  async login(input: {
    email: string;
    password: string;
    initialProjectDraft?: ProjectDraftPayload;
  }): Promise<AuthSuccessResult> {
    const adapter = await getPersistenceAdapter();
    const email = assertEmail(input.email);
    const password = assertPasswordForLogin(input.password);
    const user = await adapter.users.findByEmail(email);

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new Error("E-posta veya sifre hatali.");
    }

    const session = await adapter.sessions.create(user.id, toSessionExpiry());
    const project = await saveDraftProjectForUser(user.id, input.initialProjectDraft);

    return {
      user: rowToViewer(user),
      sessionId: session.id,
      project: sanitizeProjectSummary(project),
    };
  },

  async logout(sessionId: string | null) {
    if (!sessionId) {
      return;
    }

    const adapter = await getPersistenceAdapter();
    await adapter.sessions.delete(sessionId);
  },

  async getViewerBySessionId(sessionId: string | null) {
    if (!sessionId) {
      return null;
    }

    const adapter = await getPersistenceAdapter();
    const session = await adapter.sessions.findValidById(sessionId);

    if (!session) {
      return null;
    }

    const user = await adapter.users.findById(session.userId);
    return user ? rowToViewer(user) : null;
  },

  async requestPasswordReset(emailInput: string) {
    const adapter = await getPersistenceAdapter();
    const email = assertEmail(emailInput);
    const user = await adapter.users.findByEmail(email);

    if (!user) {
      return {
        delivered: true,
        previewUrl: undefined as string | undefined,
      };
    }

    const rawToken = crypto.randomBytes(24).toString("hex");
    const tokenHash = hashToken(rawToken);
    await adapter.passwordResetTokens.create(user.id, tokenHash, toResetExpiry());

    return {
      delivered: true,
      previewUrl:
        getDatabaseConfig().runtimeEnvironment === "local"
          ? `/sifre-sifirla?token=${rawToken}`
          : undefined,
    };
  },

  async updateUsername(userId: string, usernameInput: string) {
    const adapter = await getPersistenceAdapter();
    const user = await adapter.users.findById(userId);

    if (!user) {
      throw new Error("Kullanici bulunamadi.");
    }

    const username = assertUsername(usernameInput);

    if (user.username === username) {
      return rowToViewer(user);
    }

    const existing = await adapter.users.findByUsername(username);

    if (existing && existing.id !== userId) {
      throw new Error("Bu kullanici adi zaten kullanimda.");
    }

    await adapter.users.updateUsername(userId, username);

    const updatedUser = await adapter.users.findById(userId);

    if (!updatedUser) {
      throw new Error("Kullanici bulunamadi.");
    }

    return rowToViewer(updatedUser);
  },

  async requestPasswordResetForUser(userId: string) {
    const adapter = await getPersistenceAdapter();
    const user = await adapter.users.findById(userId);

    if (!user) {
      throw new Error("Kullanici bulunamadi.");
    }

    return authService.requestPasswordReset(user.email);
  },

  async resetPassword(token: string, nextPassword: string) {
    const adapter = await getPersistenceAdapter();
    if (!token) {
      throw new Error("Gecersiz sifirlama baglantisi.");
    }
    const password = assertPassword(nextPassword);
    const tokenRecord = await adapter.passwordResetTokens.findByTokenHash(
      hashToken(token),
    );

    if (
      !tokenRecord ||
      tokenRecord.usedAt ||
      new Date(tokenRecord.expiresAt).getTime() <= Date.now()
    ) {
      throw new Error("Sifre sifirlama baglantisi gecersiz veya suresi dolmus.");
    }

    const passwordHash = await hashPassword(password);
    await adapter.users.updatePassword(tokenRecord.userId, passwordHash);
    await adapter.passwordResetTokens.markUsed(tokenRecord.id);
  },
};
