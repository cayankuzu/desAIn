import { z } from "zod";

const openingSchema = z.object({
  id: z.string().min(1).max(80).optional(),
  type: z.enum(["door", "window", "balcony_door", "radiator"]),
  wallId: z.string().min(1).max(80),
  position: z.number().min(0),
  width: z.number().min(0.2).max(8),
  height: z.number().min(0.2).max(6).optional(),
  sillHeight: z.number().min(0).max(4).optional(),
  clearDepth: z.number().min(0).max(4).optional(),
  locked: z.boolean().optional(),
});

const discoveredInventorySchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(80),
  labelKey: z.string().min(1).max(120).optional(),
  category: z.enum([
    "sofa",
    "bed",
    "table",
    "chair",
    "wardrobe",
    "tv_unit",
    "carpet",
    "generic_box",
  ]),
  generator: z
    .enum([
      "SofaGenerator",
      "BedGenerator",
      "TableGenerator",
      "ChairGenerator",
      "WardrobeGenerator",
      "TVUnitGenerator",
      "CarpetGenerator",
      "GenericObjectGenerator",
    ])
    .optional(),
  color: z.string().min(3).max(24).optional(),
  dimensions: z.object({
    width: z.number().min(0.05).max(20),
    depth: z.number().min(0.05).max(20),
    height: z.number().min(0.05).max(20),
  }),
  rotation: z.number().optional(),
  previewType: z.string().min(1).max(40).optional(),
  params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  tags: z.array(z.string().min(1).max(40)).max(24).default([]),
});

export const roomDraftSchema = z.object({
  room: z.object({
    shape: z.enum(["rectangle", "square", "l_shape"]).default("rectangle"),
    width: z.number().min(0.5).max(50),
    depth: z.number().min(0.5).max(50),
    height: z.number().min(1.8).max(6).default(2.6),
    openings: z.array(openingSchema).max(24).default([]),
  }),
  items: z
    .array(
      z.object({
        templateId: z.string().min(1),
        x: z.number().min(0),
        z: z.number().min(0),
        rotation: z.number().optional(),
        locked: z.boolean().optional(),
        note: z.string().max(160).optional(),
      }),
    )
    .max(120)
    .default([]),
  notes: z.array(z.string().max(240)).max(30).default([]),
  warnings: z.array(z.string().max(260)).max(20).default([]),
  captureAdvice: z.array(z.string().max(260)).max(20).default([]),
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
  discoveredInventory: z.array(discoveredInventorySchema).max(40).default([]),
});

export type RoomDraft = z.infer<typeof roomDraftSchema>;
