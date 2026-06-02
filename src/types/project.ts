import type { RoomData } from "@/types/room";

export interface Viewer {
  id: string;
  email: string;
  username: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  coverImageDataUrl: string | null;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
}

export interface EditorProject extends ProjectSummary {
  roomData: RoomData;
}

export interface ProjectDraftPayload {
  name: string;
  description: string;
  coverImageDataUrl: string | null;
  roomData: RoomData;
}
