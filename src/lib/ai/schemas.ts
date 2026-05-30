import { z } from "zod";

export const layoutChatRequestSchema = z.object({
  message: z.string().trim().min(1).max(300),
  roomData: z.any(),
});

export const layoutResponseSchema = z.object({
  layoutName: z.string(),
  summary: z.string(),
  objects: z.array(
    z.object({
      id: z.string(),
      x: z.number(),
      z: z.number(),
      rotation: z.number(),
    }),
  ),
  constraintsRespected: z.array(z.string()),
  warnings: z.array(z.string()),
});
