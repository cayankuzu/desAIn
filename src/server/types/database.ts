import type { RoomData } from "@/types/room";

export type RuntimeEnvironment = "local" | "production";
export type DatabaseDriver = "sqlite";
export type DatabaseStorage = "file" | "vercel-blob";

export interface DatabaseConfig {
  runtimeEnvironment: RuntimeEnvironment;
  driver: DatabaseDriver;
  filePath: string;
  storage: DatabaseStorage;
  blobPathname?: string;
}

export interface UserRecord {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionRecord {
  id: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}

export interface PasswordResetTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

export interface ProjectRecord {
  id: string;
  userId: string;
  name: string;
  description: string;
  coverImageDataUrl: string | null;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
}

export interface ProjectSceneRecord {
  id: string;
  projectId: string;
  roomShape: string;
  roomPurpose: string;
  roomWidth: number;
  roomDepth: number;
  roomHeight: number;
  roomDataJson: string;
  notesJson: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectListRow extends ProjectRecord {
  itemCount: number;
}

export interface EditorProjectRecord extends ProjectRecord {
  itemCount: number;
  roomData: RoomData;
}
