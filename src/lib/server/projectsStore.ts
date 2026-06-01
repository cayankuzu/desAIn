import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { ProjectMessage, ProjectMeta, ProjectState, ProjectUpload } from "@/types/project";
import type { RoomData } from "@/types/room";
import { createRoomPreset } from "@/lib/room/roomPresets";

const PROJECTS_ROOT =
  process.env.DESAIN_PROJECTS_ROOT?.trim() ||
  (process.env.VERCEL
    ? "/tmp/desain/projects"
    : path.join(process.cwd(), "data", "projects"));
const DEFAULT_PROJECT_SCOPE = "anonymous";

function normalizeProjectScope(scope?: string | null) {
  const normalized = scope?.trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  return normalized || DEFAULT_PROJECT_SCOPE;
}

export function getProjectScope(request: Request) {
  return normalizeProjectScope(request.headers.get("x-desain-client-id"));
}

const scopedRoot = (scope?: string | null) =>
  path.join(/*turbopackIgnore: true*/ PROJECTS_ROOT, normalizeProjectScope(scope));
const projectDir = (scope: string | null | undefined, projectId: string) =>
  path.join(scopedRoot(scope), projectId);
const metaPath = (scope: string | null | undefined, projectId: string) =>
  path.join(projectDir(scope, projectId), "meta.json");
const uploadsPath = (scope: string | null | undefined, projectId: string) =>
  path.join(projectDir(scope, projectId), "uploads.json");
const messagesPath = (scope: string | null | undefined, projectId: string) =>
  path.join(projectDir(scope, projectId), "messages.json");
const analysisPath = (scope: string | null | undefined, projectId: string) =>
  path.join(projectDir(scope, projectId), "analysis.json");
const roomPath = (scope: string | null | undefined, projectId: string) =>
  path.join(projectDir(scope, projectId), "room.json");
const uploadsDir = (scope: string | null | undefined, projectId: string) =>
  path.join(projectDir(scope, projectId), "uploads");

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath: string, value: unknown) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

const createDefaultRoomData = (): RoomData => createRoomPreset("rectangle", "living");

export async function createProject(title?: string, scope?: string | null): Promise<ProjectMeta> {
  await ensureDir(scopedRoot(scope));

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const meta: ProjectMeta = {
    id,
    title: title?.trim() ? title.trim() : `Project ${id.slice(0, 6)}`,
    createdAt: now,
    updatedAt: now,
    status: "draft",
    photoCount: 0,
  };

  await writeJsonFile(metaPath(scope, id), meta);
  await writeJsonFile(uploadsPath(scope, id), [] satisfies ProjectUpload[]);
  await writeJsonFile(messagesPath(scope, id), [] satisfies ProjectMessage[]);
  await writeJsonFile(roomPath(scope, id), createDefaultRoomData() satisfies RoomData);

  return meta;
}

export async function listProjects(scope?: string | null): Promise<ProjectMeta[]> {
  const root = scopedRoot(scope);
  await ensureDir(root);

  const entries = await fs.readdir(root, { withFileTypes: true });
  const metas: ProjectMeta[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const projectId = entry.name;
    const meta = await readJsonFile<ProjectMeta | null>(metaPath(scope, projectId), null);
    if (meta) metas.push(meta);
  }

  metas.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return metas;
}

export async function readProject(
  projectId: string,
  scope?: string | null,
): Promise<ProjectState | null> {
  const meta = await readJsonFile<ProjectMeta | null>(metaPath(scope, projectId), null);
  if (!meta) return null;

  const uploads = await readJsonFile<ProjectUpload[]>(uploadsPath(scope, projectId), []);
  const messages = await readJsonFile<ProjectMessage[]>(messagesPath(scope, projectId), []);
  const analysis = await readJsonFile<unknown | null>(analysisPath(scope, projectId), null);
  const roomData = await readJsonFile<RoomData>(roomPath(scope, projectId), createDefaultRoomData());

  return {
    meta,
    uploads,
    messages,
    analysis: analysis ?? undefined,
    roomData,
  };
}

export async function updateProjectMeta(
  projectId: string,
  patch: Partial<Omit<ProjectMeta, "id" | "createdAt">>,
  scope?: string | null,
): Promise<ProjectMeta | null> {
  const meta = await readJsonFile<ProjectMeta | null>(metaPath(scope, projectId), null);
  if (!meta) return null;

  const next: ProjectMeta = {
    ...meta,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  await writeJsonFile(metaPath(scope, projectId), next);
  return next;
}

export async function addProjectMessage(
  projectId: string,
  message: Omit<ProjectMessage, "id" | "createdAt">,
  scope?: string | null,
): Promise<ProjectMessage | null> {
  const messages = await readJsonFile<ProjectMessage[]>(messagesPath(scope, projectId), []);
  const next: ProjectMessage = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...message,
  };

  messages.push(next);
  await writeJsonFile(messagesPath(scope, projectId), messages);
  await updateProjectMeta(projectId, {}, scope);
  return next;
}

export async function saveProjectUpload(
  projectId: string,
  file: File,
  scope?: string | null,
): Promise<ProjectUpload | null> {
  const meta = await readJsonFile<ProjectMeta | null>(metaPath(scope, projectId), null);
  if (!meta) return null;

  await ensureDir(uploadsDir(scope, projectId));

  const originalName = file.name || "upload";
  const safeExt = path.extname(originalName).slice(0, 12).replace(/[^.a-zA-Z0-9]/g, "");
  const id = crypto.randomUUID();
  const storedName = `${id}${safeExt || ""}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.writeFile(path.join(uploadsDir(scope, projectId), storedName), buffer);

  const uploads = await readJsonFile<ProjectUpload[]>(uploadsPath(scope, projectId), []);
  const upload: ProjectUpload = {
    id,
    filename: originalName,
    storedName,
    mimeType: file.type || "application/octet-stream",
    size: buffer.length,
    createdAt: new Date().toISOString(),
  };

  uploads.push(upload);
  await writeJsonFile(uploadsPath(scope, projectId), uploads);
  await updateProjectMeta(
    projectId,
    {
      photoCount: uploads.length,
    },
    scope,
  );

  return upload;
}

export async function readProjectUploadBytes(
  projectId: string,
  storedName: string,
  scope?: string | null,
) {
  return await fs.readFile(path.join(uploadsDir(scope, projectId), storedName));
}

export async function writeProjectAnalysis(
  projectId: string,
  analysis: unknown,
  scope?: string | null,
) {
  await writeJsonFile(analysisPath(scope, projectId), analysis);
  await updateProjectMeta(
    projectId,
    { status: "ready", lockReason: undefined, lastError: undefined },
    scope,
  );
}

export async function writeProjectRoomData(
  projectId: string,
  roomData: RoomData,
  scope?: string | null,
) {
  const meta = await readJsonFile<ProjectMeta | null>(metaPath(scope, projectId), null);
  if (!meta) return null;

  await writeJsonFile(roomPath(scope, projectId), roomData);
  await updateProjectMeta(projectId, {}, scope);
  return roomData;
}

export async function deleteProject(projectId: string, scope?: string | null) {
  const dir = projectDir(scope, projectId);
  try {
    await fs.rm(dir, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}
