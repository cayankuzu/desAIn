import type { RoomData } from "@/types/room";

export type ProjectStatus =
  | "draft"
  | "uploading"
  | "analyzing"
  | "ready"
  | "error";

export interface ProjectMeta {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  status: ProjectStatus;
  photoCount: number;
  lockReason?: string;
  lastError?: string;
  analyzedAt?: string;
}

export interface ProjectUpload {
  id: string;
  filename: string;
  storedName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface ProjectMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export interface ProjectState {
  meta: ProjectMeta;
  uploads: ProjectUpload[];
  messages: ProjectMessage[];
  analysis?: unknown;
  roomData: RoomData;
}
