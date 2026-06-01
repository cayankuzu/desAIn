import { NextResponse } from "next/server";
import { layoutChatRequestSchema, layoutResponseSchema } from "@/lib/ai/schemas";
import { planLayoutWithCurrentProvider } from "@/lib/ai/runtime";
import { addProjectMessage, readProject } from "@/lib/server/projectsStore";
import type { RoomData } from "@/types/room";

export const runtime = "nodejs";

export async function POST(request: Request, ctx: RouteContext<"/api/projects/[projectId]/chat">) {
  const { projectId } = await ctx.params;
  const project = await readProject(projectId);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (project.meta.status === "uploading" || project.meta.status === "analyzing") {
    return NextResponse.json(
      { error: "Project locked", reason: project.meta.lockReason ?? "Busy" },
      { status: 423 },
    );
  }

  const json = await request.json();
  const parsed = layoutChatRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const locale = parsed.data.locale;

  await addProjectMessage(projectId, { role: "user", content: parsed.data.message });

  try {
    const result = await planLayoutWithCurrentProvider({
      message: parsed.data.message,
      roomData: parsed.data.roomData as RoomData,
      locale,
      history: project.messages,
      selection: parsed.data.selection ?? null,
    });

    const layoutValidation = layoutResponseSchema.safeParse(result.layout);
    if (!layoutValidation.success) {
      return NextResponse.json({ error: "AI response invalid" }, { status: 500 });
    }

    await addProjectMessage(projectId, { role: "assistant", content: result.reply });

    return NextResponse.json({
      reply: result.reply,
      layout: layoutValidation.data,
    });
  } catch (error) {
    await addProjectMessage(projectId, {
      role: "assistant",
      content:
        locale === "en"
          ? "The AI could not generate a reply. Please try again. (If GROQ_API_KEY is missing, mock replies will be used.)"
          : "AI yanıtı alınamadı. Lütfen tekrar dene. (GROQ_API_KEY yoksa mock yanıtlar çalışır.)",
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
