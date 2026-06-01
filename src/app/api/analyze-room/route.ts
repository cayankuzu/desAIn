import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeRoomWithCurrentProvider } from "@/lib/ai/runtime";
import { curatedInventoryCatalog } from "@/lib/room/inventoryCatalog";

export const runtime = "nodejs";

const analyzeRoomRequestSchema = z.object({
  locale: z.enum(["tr", "en"]).default("tr"),
  images: z
    .array(
      z.object({
        mimeType: z.string().trim().min(1),
        base64: z.string().trim().min(1),
      }),
    )
    .min(1),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = analyzeRoomRequestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Geçersiz istek gövdesi.",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const inventory = curatedInventoryCatalog.map((item) => ({
      id: item.id,
      label: item.label,
      category: item.category,
      width: item.dimensions.width,
      depth: item.dimensions.depth,
      height: item.dimensions.height,
      tags: item.tags,
    }));

    const analysis = await analyzeRoomWithCurrentProvider({
      images: parsed.data.images,
      inventory,
      locale: parsed.data.locale,
    });

    return NextResponse.json({
      status: "ok",
      analysis,
    });
  } catch {
    return NextResponse.json({ error: "Analiz route çalışmadı." }, { status: 500 });
  }
}
