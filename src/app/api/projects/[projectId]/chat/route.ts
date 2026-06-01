import { NextResponse } from "next/server";
import { layoutChatRequestSchema, layoutResponseSchema } from "@/lib/ai/schemas";
import { planLayoutWithCurrentProvider } from "@/lib/ai/runtime";
import { MAX_PROJECT_CHAT_TURNS } from "@/lib/project/workflowLimits";
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
  const userTurnCount = project.messages.filter((message) => message.role === "user").length;

  if (userTurnCount >= MAX_PROJECT_CHAT_TURNS) {
    return NextResponse.json(
      {
        error:
          locale === "en"
            ? `This project reached the ${MAX_PROJECT_CHAT_TURNS} message limit. Create a new project for more chat.`
            : `Bu proje ${MAX_PROJECT_CHAT_TURNS} sohbet hakkına ulaştı. Daha fazla sohbet için yeni proje oluştur.`,
        max: MAX_PROJECT_CHAT_TURNS,
        current: userTurnCount,
      },
      { status: 429 },
    );
  }

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
      const reply =
        locale === "en"
          ? "I could not safely apply that request because the AI response was incomplete. Please try again with a clearer object, wall, size, or rotation instruction."
          : "Bu isteği güvenli şekilde uygulayamadım çünkü AI yanıtı eksik geldi. Lütfen öğe, duvar, boyut veya dönüş komutunu daha net yazarak tekrar dene.";

      await addProjectMessage(projectId, { role: "assistant", content: reply });
      return NextResponse.json({ error: reply }, { status: 500 });
    }

    await addProjectMessage(projectId, { role: "assistant", content: result.reply });

    return NextResponse.json({
      reply: result.reply,
      layout: layoutValidation.data,
    });
  } catch {
    const reply =
      locale === "en"
        ? "I could not complete that request. Please try again with a more specific room or object instruction."
        : "Bu isteği tamamlayamadım. Lütfen oda veya seçili öğe için daha net bir komutla tekrar dene.";

    await addProjectMessage(projectId, { role: "assistant", content: reply });
    return NextResponse.json({ error: reply }, { status: 500 });
  }
}
