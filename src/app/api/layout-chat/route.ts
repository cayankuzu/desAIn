import { NextResponse } from "next/server";
import { buildMockLayoutResponse } from "@/lib/ai/mockResponses";
import { layoutChatRequestSchema, layoutResponseSchema } from "@/lib/ai/schemas";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = layoutChatRequestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Gecersiz istek govdesi.",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const result = buildMockLayoutResponse(
      parsed.data.message,
      parsed.data.roomData,
    );
    const layoutValidation = layoutResponseSchema.safeParse(result.layout);

    if (!layoutValidation.success) {
      return NextResponse.json(
        { error: "Mock layout JSON dogrulanamadi." },
        { status: 500 },
      );
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Mock AI route calismadi." },
      { status: 500 },
    );
  }
}
