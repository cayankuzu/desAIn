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
  locale?: "tr" | "en";
  selection?:
    | {
        objectId?: string | null;
        objectIds?: string[];
        groupId?: string | null;
        structure?:
          | {
              type: "wall" | "opening";
              id: string;
            }
          | null;
      }
    | null;
}

export interface LayoutChatResult {
  reply: string;
  layout: LayoutResponse;
}
