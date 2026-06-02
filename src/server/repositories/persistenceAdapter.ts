import crypto from "node:crypto";
import type { ProjectDraftPayload, ProjectSummary, Viewer } from "@/types/project";
import type { RoomData } from "@/types/room";
import {
  ensureSqliteReady,
  sqliteAll,
  sqliteGet,
  sqliteRun,
  sqliteTransaction,
  type SqliteExecutor,
} from "@/server/db/sqliteRuntime";
import type {
  EditorProjectRecord,
  PasswordResetTokenRecord,
  ProjectListRow,
  ProjectRecord,
  SessionRecord,
  UserRecord,
} from "@/server/types/database";

interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findByUsername(username: string): Promise<UserRecord | null>;
  findById(userId: string): Promise<UserRecord | null>;
  create(input: Pick<UserRecord, "email" | "username" | "passwordHash">): Promise<UserRecord>;
  updateUsername(userId: string, username: string): Promise<void>;
  updatePassword(userId: string, passwordHash: string): Promise<void>;
}

interface SessionRepository {
  create(userId: string, expiresAt: string): Promise<SessionRecord>;
  findValidById(sessionId: string): Promise<SessionRecord | null>;
  delete(sessionId: string): Promise<void>;
  deleteExpired(): Promise<void>;
}

interface PasswordResetRepository {
  create(userId: string, tokenHash: string, expiresAt: string): Promise<PasswordResetTokenRecord>;
  findByTokenHash(tokenHash: string): Promise<PasswordResetTokenRecord | null>;
  markUsed(tokenId: string): Promise<void>;
}

interface ProjectRepository {
  listForUser(userId: string): Promise<ProjectSummary[]>;
  getEditorProject(userId: string, projectId: string): Promise<EditorProjectRecord | null>;
  saveForUser(
    userId: string,
    draft: ProjectDraftPayload,
    projectId?: string,
  ): Promise<EditorProjectRecord>;
  updateCover(userId: string, projectId: string, coverImageDataUrl: string): Promise<ProjectSummary | null>;
  deleteForUser(userId: string, projectId: string): Promise<boolean>;
}

export interface PersistenceAdapter {
  users: UserRepository;
  sessions: SessionRepository;
  passwordResetTokens: PasswordResetRepository;
  projects: ProjectRepository;
  migrate(): Promise<void>;
}

const nowIso = () => new Date().toISOString();

const rowToViewer = (user: UserRecord): Viewer => ({
  id: user.id,
  email: user.email,
  username: user.username,
});

const toProjectSummary = (
  row: Pick<ProjectRecord, "id" | "name" | "description" | "coverImageDataUrl" | "createdAt" | "updatedAt" | "lastOpenedAt"> & {
    itemCount: number;
  },
): ProjectSummary => ({
  id: row.id,
  name: row.name,
  description: row.description,
  coverImageDataUrl: row.coverImageDataUrl,
  itemCount: row.itemCount,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  lastOpenedAt: row.lastOpenedAt,
});

const serializeRoomData = (roomData: RoomData) => JSON.stringify(roomData);

const createSqliteRepositories = (): PersistenceAdapter => {
  const users: UserRepository = {
    async findByEmail(email) {
      return (
        (await sqliteGet<UserRecord>(
          `
            SELECT
              id,
              email,
              username,
              password_hash AS passwordHash,
              created_at AS createdAt,
              updated_at AS updatedAt
            FROM users
            WHERE email = ?
          `,
          [email],
        )) ?? null
      );
    },
    async findByUsername(username) {
      return (
        (await sqliteGet<UserRecord>(
          `
            SELECT
              id,
              email,
              username,
              password_hash AS passwordHash,
              created_at AS createdAt,
              updated_at AS updatedAt
            FROM users
            WHERE username = ?
          `,
          [username],
        )) ?? null
      );
    },
    async findById(userId) {
      return (
        (await sqliteGet<UserRecord>(
          `
            SELECT
              id,
              email,
              username,
              password_hash AS passwordHash,
              created_at AS createdAt,
              updated_at AS updatedAt
            FROM users
            WHERE id = ?
          `,
          [userId],
        )) ?? null
      );
    },
    async create(input) {
      const record: UserRecord = {
        id: crypto.randomUUID(),
        email: input.email,
        username: input.username,
        passwordHash: input.passwordHash,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };

      await sqliteRun(
        `
          INSERT INTO users (
            id,
            email,
            username,
            password_hash,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          record.id,
          record.email,
          record.username,
          record.passwordHash,
          record.createdAt,
          record.updatedAt,
        ],
      );

      return record;
    },
    async updateUsername(userId, username) {
      await sqliteRun(
        "UPDATE users SET username = ?, updated_at = ? WHERE id = ?",
        [username, nowIso(), userId],
      );
    },
    async updatePassword(userId, passwordHash) {
      await sqliteRun(
        "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
        [passwordHash, nowIso(), userId],
      );
    },
  };

  const sessions: SessionRepository = {
    async create(userId, expiresAt) {
      const session: SessionRecord = {
        id: crypto.randomUUID(),
        userId,
        expiresAt,
        createdAt: nowIso(),
      };

      await sqliteRun(
        `
          INSERT INTO sessions (
            id,
            user_id,
            expires_at,
            created_at
          ) VALUES (?, ?, ?, ?)
        `,
        [session.id, session.userId, session.expiresAt, session.createdAt],
      );

      return session;
    },
    async findValidById(sessionId) {
      return (
        (await sqliteGet<SessionRecord>(
          `
            SELECT
              id,
              user_id AS userId,
              expires_at AS expiresAt,
              created_at AS createdAt
            FROM sessions
            WHERE id = ?
              AND expires_at > ?
          `,
          [sessionId, nowIso()],
        )) ?? null
      );
    },
    async delete(sessionId) {
      await sqliteRun("DELETE FROM sessions WHERE id = ?", [sessionId]);
    },
    async deleteExpired() {
      await sqliteRun("DELETE FROM sessions WHERE expires_at <= ?", [nowIso()]);
    },
  };

  const passwordResetTokens: PasswordResetRepository = {
    async create(userId, tokenHash, expiresAt) {
      const record: PasswordResetTokenRecord = {
        id: crypto.randomUUID(),
        userId,
        tokenHash,
        expiresAt,
        usedAt: null,
        createdAt: nowIso(),
      };

      await sqliteRun(
        `
          INSERT INTO password_reset_tokens (
            id,
            user_id,
            token_hash,
            expires_at,
            used_at,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          record.id,
          record.userId,
          record.tokenHash,
          record.expiresAt,
          record.usedAt,
          record.createdAt,
        ],
      );

      return record;
    },
    async findByTokenHash(tokenHash) {
      return (
        (await sqliteGet<PasswordResetTokenRecord>(
          `
            SELECT
              id,
              user_id AS userId,
              token_hash AS tokenHash,
              expires_at AS expiresAt,
              used_at AS usedAt,
              created_at AS createdAt
            FROM password_reset_tokens
            WHERE token_hash = ?
          `,
          [tokenHash],
        )) ?? null
      );
    },
    async markUsed(tokenId) {
      await sqliteRun(
        "UPDATE password_reset_tokens SET used_at = ? WHERE id = ?",
        [nowIso(), tokenId],
      );
    },
  };

  const saveProjectGraph = async (
    executor: SqliteExecutor,
    projectId: string,
    draft: ProjectDraftPayload,
    sceneId: string,
  ) => {
    const roomDataJson = serializeRoomData(draft.roomData);
    const notesJson = draft.roomData.notes
      ? JSON.stringify(draft.roomData.notes)
      : null;
    const timestamp = nowIso();

    await executor.run(
      `
        INSERT OR REPLACE INTO project_scenes (
          id,
          project_id,
          room_shape,
          room_purpose,
          room_width,
          room_depth,
          room_height,
          room_data_json,
          notes_json,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        sceneId,
        projectId,
        draft.roomData.room.shape,
        draft.roomData.room.purpose,
        draft.roomData.room.width,
        draft.roomData.room.depth,
        draft.roomData.room.height,
        roomDataJson,
        notesJson,
        timestamp,
        timestamp,
      ],
    );

    await executor.run("DELETE FROM project_items WHERE scene_id = ?", [sceneId]);
    await executor.run("DELETE FROM project_groups WHERE scene_id = ?", [sceneId]);

    for (const object of draft.roomData.objects) {
      await executor.run(
        `
          INSERT INTO project_items (
            id,
            scene_id,
            source_object_id,
            label,
            label_key,
            category,
            generator,
            position_x,
            position_z,
            rotation,
            dimension_width,
            dimension_depth,
            dimension_height,
            color,
            movable,
            locked,
            params_json,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          crypto.randomUUID(),
          sceneId,
          object.id,
          object.label,
          object.labelKey,
          object.category,
          object.generator,
          object.position.x,
          object.position.z,
          object.rotation,
          object.dimensions.width,
          object.dimensions.depth,
          object.dimensions.height,
          object.color,
          object.movable ? 1 : 0,
          object.locked ? 1 : 0,
          JSON.stringify(object.params),
          timestamp,
          timestamp,
        ],
      );
    }

    for (const group of draft.roomData.groups ?? []) {
      await executor.run(
        `
          INSERT INTO project_groups (
            id,
            scene_id,
            source_group_id,
            label,
            object_ids_json,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          crypto.randomUUID(),
          sceneId,
          group.id,
          group.label,
          JSON.stringify(group.objectIds),
          timestamp,
          timestamp,
        ],
      );
    }
  };

  const projects: ProjectRepository = {
    async listForUser(userId) {
      const rows = await sqliteAll<ProjectListRow>(
        `
          SELECT
            p.id,
            p.user_id AS userId,
            p.name,
            p.description,
            p.cover_image_data_url AS coverImageDataUrl,
            p.created_at AS createdAt,
            p.updated_at AS updatedAt,
            p.last_opened_at AS lastOpenedAt,
            COALESCE(COUNT(i.id), 0) AS itemCount
          FROM projects p
          LEFT JOIN project_scenes s ON s.project_id = p.id
          LEFT JOIN project_items i ON i.scene_id = s.id
          WHERE p.user_id = ?
          GROUP BY p.id
          ORDER BY p.updated_at DESC
        `,
        [userId],
      );

      return rows.map((row) =>
        toProjectSummary({
          ...row,
          itemCount: Number(row.itemCount),
        }),
      );
    },
    async getEditorProject(userId, projectId) {
      const row = await sqliteGet<{
        id: string;
        userId: string;
        name: string;
        description: string;
        coverImageDataUrl: string | null;
        createdAt: string;
        updatedAt: string;
        lastOpenedAt: string;
        itemCount: number;
        roomDataJson: string;
      }>(
        `
          SELECT
            p.id,
            p.user_id AS userId,
            p.name,
            p.description,
            p.cover_image_data_url AS coverImageDataUrl,
            p.created_at AS createdAt,
            p.updated_at AS updatedAt,
            p.last_opened_at AS lastOpenedAt,
            COALESCE(COUNT(i.id), 0) AS itemCount,
            s.room_data_json AS roomDataJson
          FROM projects p
          JOIN project_scenes s ON s.project_id = p.id
          LEFT JOIN project_items i ON i.scene_id = s.id
          WHERE p.user_id = ?
            AND p.id = ?
          GROUP BY p.id
        `,
        [userId, projectId],
      );

      if (!row) {
        return null;
      }

      await sqliteRun(
        "UPDATE projects SET last_opened_at = ? WHERE id = ?",
        [nowIso(), projectId],
      );

      return {
        id: row.id,
        userId: row.userId,
        name: row.name,
        description: row.description,
        coverImageDataUrl: row.coverImageDataUrl,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        lastOpenedAt: nowIso(),
        itemCount: Number(row.itemCount),
        roomData: JSON.parse(row.roomDataJson) as RoomData,
      };
    },
    async saveForUser(userId, draft, projectId) {
      return sqliteTransaction(async (tx) => {
        const timestamp = nowIso();
        const nextProjectId = projectId ?? crypto.randomUUID();
        const existing = projectId
          ? await tx.get<{ id: string; sceneId: string | null; createdAt: string }>(
              `
                SELECT
                  p.id,
                  s.id AS sceneId,
                  p.created_at AS createdAt
                FROM projects p
                LEFT JOIN project_scenes s ON s.project_id = p.id
                WHERE p.user_id = ?
                  AND p.id = ?
              `,
              [userId, projectId],
            )
          : null;

        if (projectId && !existing) {
          throw new Error("Guncellenecek proje bulunamadi.");
        }

        const sceneId = existing?.sceneId ?? crypto.randomUUID();

        if (existing) {
          await tx.run(
            `
              UPDATE projects
              SET
                name = ?,
                description = ?,
                cover_image_data_url = ?,
                updated_at = ?,
                last_opened_at = ?
              WHERE id = ?
                AND user_id = ?
            `,
            [
              draft.name,
              draft.description,
              draft.coverImageDataUrl,
              timestamp,
              timestamp,
              nextProjectId,
              userId,
            ],
          );
        } else {
          await tx.run(
            `
              INSERT INTO projects (
                id,
                user_id,
                name,
                description,
                cover_image_data_url,
                created_at,
                updated_at,
                last_opened_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              nextProjectId,
              userId,
              draft.name,
              draft.description,
              draft.coverImageDataUrl,
              timestamp,
              timestamp,
              timestamp,
            ],
          );
        }

        await saveProjectGraph(tx, nextProjectId, draft, sceneId);

        return {
          id: nextProjectId,
          userId,
          name: draft.name,
          description: draft.description,
          coverImageDataUrl: draft.coverImageDataUrl,
          createdAt: existing?.createdAt ?? timestamp,
          updatedAt: timestamp,
          lastOpenedAt: timestamp,
          itemCount: draft.roomData.objects.length,
          roomData: draft.roomData,
        };
      });
    },
    async updateCover(userId, projectId, coverImageDataUrl) {
      const timestamp = nowIso();
      await sqliteRun(
        `
          UPDATE projects
          SET
            cover_image_data_url = ?,
            updated_at = ?
          WHERE id = ?
            AND user_id = ?
        `,
        [coverImageDataUrl, timestamp, projectId, userId],
      );

      const row = await sqliteGet<ProjectListRow>(
        `
          SELECT
            p.id,
            p.user_id AS userId,
            p.name,
            p.description,
            p.cover_image_data_url AS coverImageDataUrl,
            p.created_at AS createdAt,
            p.updated_at AS updatedAt,
            p.last_opened_at AS lastOpenedAt,
            COALESCE(COUNT(i.id), 0) AS itemCount
          FROM projects p
          LEFT JOIN project_scenes s ON s.project_id = p.id
          LEFT JOIN project_items i ON i.scene_id = s.id
          WHERE p.user_id = ?
            AND p.id = ?
          GROUP BY p.id
        `,
        [userId, projectId],
      );

      if (!row) {
        return null;
      }

      return toProjectSummary({
        ...row,
        itemCount: Number(row.itemCount),
      });
    },
    async deleteForUser(userId, projectId) {
      const result = await sqliteRun(
        `
          DELETE FROM projects
          WHERE id = ?
            AND user_id = ?
        `,
        [projectId, userId],
      );

      return result.changes > 0;
    },
  };

  return {
    users,
    sessions,
    passwordResetTokens,
    projects,
    migrate: ensureSqliteReady,
  };
};

let adapterPromise: Promise<PersistenceAdapter> | null = null;

export const getPersistenceAdapter = async (): Promise<PersistenceAdapter> => {
  if (!adapterPromise) {
    adapterPromise = Promise.resolve(createSqliteRepositories());
  }

  const adapter = await adapterPromise;
  await adapter.migrate();
  return adapter;
};

export { rowToViewer };
