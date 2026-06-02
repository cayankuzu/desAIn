import type { EditorProject, ProjectDraftPayload, ProjectSummary } from "@/types/project";
import {
  PROJECT_DESCRIPTION_MAX_LENGTH,
  PROJECT_NAME_MAX_LENGTH,
  PROJECT_NAME_MIN_LENGTH,
} from "@/lib/appLimits";
import type { RoomData } from "@/types/room";
import { getPersistenceAdapter } from "@/server/repositories/persistenceAdapter";

const assertProjectName = (name: string) => {
  const normalized = name.trim();

  if (normalized.length < PROJECT_NAME_MIN_LENGTH) {
    throw new Error(`Proje adi en az ${PROJECT_NAME_MIN_LENGTH} karakter olmali.`);
  }

  if (normalized.length > PROJECT_NAME_MAX_LENGTH) {
    throw new Error(`Proje adi ${PROJECT_NAME_MAX_LENGTH} karakterden uzun olamaz.`);
  }

  return normalized;
};

const assertProjectDescription = (description: string) => {
  const normalized = description.trim();

  if (normalized.length > PROJECT_DESCRIPTION_MAX_LENGTH) {
    throw new Error(
      `Proje aciklamasi ${PROJECT_DESCRIPTION_MAX_LENGTH} karakterden uzun olamaz.`,
    );
  }

  return normalized;
};

const assertCoverImage = (coverImageDataUrl: string | null) => {
  if (!coverImageDataUrl) {
    return null;
  }

  if (!coverImageDataUrl.startsWith("data:image/")) {
    throw new Error("Kapak gorseli yalnizca proje viewport goruntusu olabilir.");
  }

  if (coverImageDataUrl.length > 2_500_000) {
    throw new Error("Kapak gorseli cok buyuk. Lutfen yeni bir kare alin.");
  }

  return coverImageDataUrl;
};

const assertRoomData = (roomData: RoomData | null | undefined) => {
  if (!roomData || !roomData.room || !Array.isArray(roomData.objects)) {
    throw new Error("Kaydedilecek proje sahnesi eksik.");
  }

  return roomData;
};

const sanitizeProjectDraft = (draft: ProjectDraftPayload): ProjectDraftPayload => ({
  name: assertProjectName(draft.name),
  description: assertProjectDescription(draft.description),
  coverImageDataUrl: assertCoverImage(draft.coverImageDataUrl),
  roomData: assertRoomData(draft.roomData),
});

const toSummary = (project: EditorProject): ProjectSummary => ({
  id: project.id,
  name: project.name,
  description: project.description,
  coverImageDataUrl: project.coverImageDataUrl,
  itemCount: project.itemCount,
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
  lastOpenedAt: project.lastOpenedAt,
});

export const projectService = {
  async listProjects(userId: string) {
    const adapter = await getPersistenceAdapter();
    return adapter.projects.listForUser(userId);
  },

  async getEditorProject(userId: string, projectId: string) {
    const adapter = await getPersistenceAdapter();
    const project = await adapter.projects.getEditorProject(userId, projectId);

    if (!project) {
      return null;
    }

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      coverImageDataUrl: project.coverImageDataUrl,
      itemCount: project.itemCount,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      lastOpenedAt: project.lastOpenedAt,
      roomData: project.roomData,
    } satisfies EditorProject;
  },

  async saveProject(
    userId: string,
    draft: ProjectDraftPayload,
    projectId?: string,
  ) {
    const adapter = await getPersistenceAdapter();
    const saved = await adapter.projects.saveForUser(
      userId,
      sanitizeProjectDraft(draft),
      projectId,
    );

    return {
      id: saved.id,
      name: saved.name,
      description: saved.description,
      coverImageDataUrl: saved.coverImageDataUrl,
      itemCount: saved.itemCount,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
      lastOpenedAt: saved.lastOpenedAt,
      roomData: saved.roomData,
    } satisfies EditorProject;
  },

  async updateCover(userId: string, projectId: string, coverImageDataUrl: string) {
    const adapter = await getPersistenceAdapter();
    const updated = await adapter.projects.updateCover(
      userId,
      projectId,
      assertCoverImage(coverImageDataUrl) ?? "",
    );

    return updated;
  },

  async deleteProject(userId: string, projectId: string) {
    const adapter = await getPersistenceAdapter();
    return adapter.projects.deleteForUser(userId, projectId);
  },

  toSummary,
  sanitizeProjectDraft,
};
