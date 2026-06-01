"use client";

import { create } from "zustand";
import { MAX_ACTIVE_PROJECTS } from "@/lib/project/workflowLimits";
import type { ProjectMeta, ProjectState } from "@/types/project";
import type { RoomData } from "@/types/room";

const ACTIVE_PROJECT_KEY = "desain-active-project-id";
const PROJECT_CLIENT_ID_KEY = "desain-client-id";
export const PROJECT_CLIENT_ID_HEADER = "x-desain-client-id";
let initPromise: Promise<void> | null = null;

const normalizeProjectClientId = (value: string | null) => {
  const normalized = value?.trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  return normalized || null;
};

const createProjectClientId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `client_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

export const getProjectClientId = () => {
  if (typeof window === "undefined") return null;

  const stored = normalizeProjectClientId(window.localStorage.getItem(PROJECT_CLIENT_ID_KEY));
  if (stored) return stored;

  const next = createProjectClientId();
  window.localStorage.setItem(PROJECT_CLIENT_ID_KEY, next);
  return next;
};

export const withProjectClientHeaders = (headers?: HeadersInit) => {
  const next = new Headers(headers);
  const clientId = getProjectClientId();
  if (clientId) {
    next.set(PROJECT_CLIENT_ID_HEADER, clientId);
  }
  return next;
};

async function jsonFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: withProjectClientHeaders(init?.headers),
  });
  let data: unknown = null;
  try {
    data = (await res.json()) as unknown;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data as T;
}

const readStoredActiveProjectId = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_PROJECT_KEY);
};

const storeActiveProjectId = (projectId: string | null) => {
  if (typeof window === "undefined") return;
  if (!projectId) {
    window.localStorage.removeItem(ACTIVE_PROJECT_KEY);
    return;
  }
  window.localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
};

type ProjectStoreState = {
  initialized: boolean;
  projects: ProjectMeta[];
  activeProjectId: string | null;
  activeProject: ProjectState | null;
  loading: boolean;
  busy: boolean;
  error: string | null;
  init: () => Promise<void>;
  refreshProjects: () => Promise<void>;
  loadProjectById: (projectId: string) => Promise<void>;
  createProject: (title?: string) => Promise<void>;
  renameProject: (projectId: string, title: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  saveRoomData: (projectId: string, roomData: RoomData) => Promise<void>;
};

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  initialized: false,
  projects: [],
  activeProjectId: null,
  activeProject: null,
  loading: false,
  busy: false,
  error: null,

  init: async () => {
    if (get().initialized) return;
    if (initPromise) {
      await initPromise;
      return;
    }

    initPromise = (async () => {
      set({ loading: true, error: null });
      try {
        const data = await jsonFetch<{ projects: ProjectMeta[] }>("/api/projects");
        const projects = data.projects;
        const stored = readStoredActiveProjectId();
        const preferred =
          (stored && projects.find((p) => p.id === stored)?.id) ?? projects[0]?.id ?? null;

        set({
          projects,
          activeProjectId: preferred,
          activeProject: null,
        });

        storeActiveProjectId(preferred);
        if (preferred) {
          const projectData = await jsonFetch<{ project: ProjectState }>(`/api/projects/${preferred}`);
          set({ activeProject: projectData.project });
        }

        set({ initialized: true });
      } catch (e) {
        set({ error: e instanceof Error ? e.message : "Failed to load projects" });
      } finally {
        set({ loading: false });
        initPromise = null;
      }
    })();

    await initPromise;
  },

  refreshProjects: async () => {
    try {
      const data = await jsonFetch<{ projects: ProjectMeta[] }>("/api/projects");
      const currentActiveId = get().activeProjectId;
      const nextActiveId = data.projects.some((project) => project.id === currentActiveId)
        ? currentActiveId
        : data.projects[0]?.id ?? null;

      if (!nextActiveId) {
        storeActiveProjectId(null);
        set({
          projects: data.projects,
          activeProjectId: null,
          activeProject: null,
        });
        return;
      }

      set({ projects: data.projects, activeProjectId: nextActiveId });
    } catch {
      // ignore
    }
  },

  loadProjectById: async (projectId) => {
    set({ busy: true, error: null });
    try {
      const data = await jsonFetch<{ project: ProjectState }>(`/api/projects/${projectId}`);
      storeActiveProjectId(projectId);
      set({ activeProjectId: projectId, activeProject: data.project });
      await get().refreshProjects();
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Failed to load project" });
    } finally {
      set({ busy: false });
    }
  },

  createProject: async (title) => {
    set({ busy: true, error: null });
    try {
      if (get().projects.length >= MAX_ACTIVE_PROJECTS) {
        throw new Error(
          `Aynı anda en fazla ${MAX_ACTIVE_PROJECTS} sohbet oluşturabilirsin. Yeni sohbet açmak için önce bir sohbet sil.`,
        );
      }

      const data = await jsonFetch<{ project: ProjectMeta }>("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      await get().loadProjectById(data.project.id);
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Failed to create project" });
    } finally {
      set({ busy: false });
    }
  },

  renameProject: async (projectId, title) => {
    const nextTitle = title.trim();
    if (!nextTitle) return;

    set({ busy: true, error: null });
    try {
      await jsonFetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: nextTitle }),
      });
      await get().refreshProjects();
      if (get().activeProjectId === projectId) {
        const data = await jsonFetch<{ project: ProjectState }>(`/api/projects/${projectId}`);
        set({ activeProject: data.project });
      }
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Rename failed" });
    } finally {
      set({ busy: false });
    }
  },

  deleteProject: async (projectId) => {
    set({ busy: true, error: null });
    try {
      await jsonFetch(`/api/projects/${projectId}`, { method: "DELETE" });
      const data = await jsonFetch<{ projects: ProjectMeta[] }>("/api/projects");
      const remaining = data.projects;
      const nextActive =
        remaining.find((p) => p.id !== projectId)?.id ?? remaining[0]?.id ?? null;

      set({
        projects: remaining,
        activeProjectId: nextActive,
        activeProject: null,
      });

      storeActiveProjectId(nextActive);
      if (nextActive) {
        const projectData = await jsonFetch<{ project: ProjectState }>(`/api/projects/${nextActive}`);
        set({ activeProject: projectData.project });
      }
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Delete failed" });
    } finally {
      set({ busy: false });
    }
  },

  saveRoomData: async (projectId, roomData) => {
    try {
      await jsonFetch(`/api/projects/${projectId}/room`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomData }),
      });
      await get().refreshProjects();
    } catch {
      // ignore autosave errors
    }
  },
}));
