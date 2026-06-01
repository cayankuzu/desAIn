import { NextResponse } from "next/server";
import { planLayoutWithCurrentProvider } from "@/lib/ai/runtime";
import { layoutChatRequestSchema, layoutResponseSchema } from "@/lib/ai/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = layoutChatRequestSchema.safeParse(json);

    if (!parsed.success) {
      const locale =
        json && typeof json === "object" && (json as { locale?: "tr" | "en" }).locale === "en"
          ? "en"
          : "tr";

      return NextResponse.json(
        {
          error: locale === "en" ? "Invalid request body." : "Geçersiz istek gövdesi.",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const result = await planLayoutWithCurrentProvider({
      message: parsed.data.message,
      roomData: parsed.data.roomData,
      locale: parsed.data.locale,
      selection: parsed.data.selection ?? null,
    });
    const layoutValidation = layoutResponseSchema.safeParse(result.layout);

    if (!layoutValidation.success) {
      return NextResponse.json({ error: "Layout JSON doğrulanamadı." }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Layout chat route çalışmadı." }, { status: 500 });
  }
}
