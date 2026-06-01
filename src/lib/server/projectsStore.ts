import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { ProjectMessage, ProjectMeta, ProjectState, ProjectUpload } from "@/types/project";
import type { RoomData } from "@/types/room";
import { createRoomPreset } from "@/lib/room/roomPresets";

const PROJECTS_ROOT = path.join(process.cwd(), "data", "projects");

const projectDir = (projectId: string) => path.join(PROJECTS_ROOT, projectId);
const metaPath = (projectId: string) => path.join(projectDir(projectId), "meta.json");
const uploadsPath = (projectId: string) => path.join(projectDir(projectId), "uploads.json");
const messagesPath = (projectId: string) => path.join(projectDir(projectId), "messages.json");
const analysisPath = (projectId: string) => path.join(projectDir(projectId), "analysis.json");
const roomPath = (projectId: string) => path.join(projectDir(projectId), "room.json");
const uploadsDir = (projectId: string) => path.join(projectDir(projectId), "uploads");

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

export async function createProject(title?: string): Promise<ProjectMeta> {
  await ensureDir(PROJECTS_ROOT);

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

  await writeJsonFile(metaPath(id), meta);
  await writeJsonFile(uploadsPath(id), [] satisfies ProjectUpload[]);
  await writeJsonFile(messagesPath(id), [] satisfies ProjectMessage[]);
  await writeJsonFile(roomPath(id), createDefaultRoomData() satisfies RoomData);

  return meta;
}

export async function listProjects(): Promise<ProjectMeta[]> {
  await ensureDir(PROJECTS_ROOT);

  const entries = await fs.readdir(PROJECTS_ROOT, { withFileTypes: true });
  const metas: ProjectMeta[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const projectId = entry.name;
    const meta = await readJsonFile<ProjectMeta | null>(metaPath(projectId), null);
    if (meta) metas.push(meta);
  }

  metas.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return metas;
}

export async function readProject(projectId: string): Promise<ProjectState | null> {
  const meta = await readJsonFile<ProjectMeta | null>(metaPath(projectId), null);
  if (!meta) return null;

  const uploads = await readJsonFile<ProjectUpload[]>(uploadsPath(projectId), []);
  const messages = await readJsonFile<ProjectMessage[]>(messagesPath(projectId), []);
  const analysis = await readJsonFile<unknown | null>(analysisPath(projectId), null);
  const roomData = await readJsonFile<RoomData>(roomPath(projectId), createDefaultRoomData());

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
): Promise<ProjectMeta | null> {
  const meta = await readJsonFile<ProjectMeta | null>(metaPath(projectId), null);
  if (!meta) return null;

  const next: ProjectMeta = {
    ...meta,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  await writeJsonFile(metaPath(projectId), next);
  return next;
}

export async function addProjectMessage(
  projectId: string,
  message: Omit<ProjectMessage, "id" | "createdAt">,
): Promise<ProjectMessage | null> {
  const messages = await readJsonFile<ProjectMessage[]>(messagesPath(projectId), []);
  const next: ProjectMessage = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...message,
  };

  messages.push(next);
  await writeJsonFile(messagesPath(projectId), messages);
  await updateProjectMeta(projectId, {});
  return next;
}

export async function saveProjectUpload(
  projectId: string,
  file: File,
): Promise<ProjectUpload | null> {
  const meta = await readJsonFile<ProjectMeta | null>(metaPath(projectId), null);
  if (!meta) return null;

  await ensureDir(uploadsDir(projectId));

  const originalName = file.name || "upload";
  const safeExt = path.extname(originalName).slice(0, 12).replace(/[^.a-zA-Z0-9]/g, "");
  const id = crypto.randomUUID();
  const storedName = `${id}${safeExt || ""}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.writeFile(path.join(uploadsDir(projectId), storedName), buffer);

  const uploads = await readJsonFile<ProjectUpload[]>(uploadsPath(projectId), []);
  const upload: ProjectUpload = {
    id,
    filename: originalName,
    storedName,
    mimeType: file.type || "application/octet-stream",
    size: buffer.length,
    createdAt: new Date().toISOString(),
  };

  uploads.push(upload);
  await writeJsonFile(uploadsPath(projectId), uploads);
  await updateProjectMeta(projectId, {
    photoCount: uploads.length,
  });

  return upload;
}

export async function readProjectUploadBytes(projectId: string, storedName: string) {
  return await fs.readFile(path.join(uploadsDir(projectId), storedName));
}

export async function writeProjectAnalysis(projectId: string, analysis: unknown) {
  await writeJsonFile(analysisPath(projectId), analysis);
  await updateProjectMeta(projectId, { status: "ready", lockReason: undefined, lastError: undefined });
}

export async function writeProjectRoomData(projectId: string, roomData: RoomData) {
  const meta = await readJsonFile<ProjectMeta | null>(metaPath(projectId), null);
  if (!meta) return null;

  await writeJsonFile(roomPath(projectId), roomData);
  await updateProjectMeta(projectId, {});
  return roomData;
}

export async function deleteProject(projectId: string) {
  const dir = projectDir(projectId);
  try {
    await fs.rm(dir, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}
