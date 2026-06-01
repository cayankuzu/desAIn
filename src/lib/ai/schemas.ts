import { z } from "zod";

const roomShapeSchema = z.enum(["rectangle", "square", "l_shape", "custom"]);
const roomPurposeSchema = z.enum([
  "empty",
  "living",
  "kitchen",
  "bedroom",
  "kids",
  "study",
  "bathroom",
  "dining",
  "laundry",
  "entry",
  "balcony",
  "dressing",
]);

export const sceneSelectionSchema = z
  .object({
    objectId: z.string().trim().min(1).max(80).optional().nullable(),
    objectIds: z.array(z.string().trim().min(1).max(80)).max(24).default([]),
    groupId: z.string().trim().min(1).max(80).optional().nullable(),
    structure: z
      .object({
        type: z.enum(["wall", "opening"]),
        id: z.string().trim().min(1).max(80),
      })
      .optional()
      .nullable(),
  })
  .optional();

export const layoutChatRequestSchema = z.object({
  message: z.string().trim().min(1).max(300),
  roomData: z.any(),
  selection: sceneSelectionSchema,
  locale: z.enum(["tr", "en"]).default("tr"),
});

export const layoutResponseSchema = z.object({
  layoutName: z.string().default(""),
  summary: z.string().default(""),
  room: z
    .object({
      shape: roomShapeSchema.optional(),
      purpose: roomPurposeSchema.optional(),
      width: z.number().min(0.5).max(50).optional(),
      depth: z.number().min(0.5).max(50).optional(),
      height: z.number().min(1.8).max(6).optional(),
      cutoutWidth: z.number().min(0.8).max(20).optional(),
      cutoutDepth: z.number().min(0.8).max(20).optional(),
    })
    .optional(),
  objects: z
    .array(
      z.object({
        id: z.string(),
        x: z.number(),
        z: z.number(),
        rotation: z.number(),
        mountHeight: z.number().min(0).max(6).optional(),
        dimensions: z
          .object({
            width: z.number().min(0.05).max(20).optional(),
            depth: z.number().min(0.05).max(20).optional(),
            height: z.number().min(0.05).max(20).optional(),
          })
          .optional(),
      }),
    )
    .default([]),
  constraintsRespected: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});
