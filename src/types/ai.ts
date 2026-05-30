import type { LayoutResponse, RoomData } from "@/types/room";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  layoutName?: string;
  warnings?: string[];
}

export interface LayoutChatRequest {
  message: string;
  roomData: RoomData;
}

export interface LayoutChatResult {
  reply: string;
  layout: LayoutResponse;
}
