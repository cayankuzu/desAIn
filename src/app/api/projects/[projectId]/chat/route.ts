import { NextResponse } from "next/server";
import { layoutChatRequestSchema, layoutResponseSchema } from "@/lib/ai/schemas";
import { planLayoutWithCurrentProvider } from "@/lib/ai/runtime";
import { addProjectMessage, getProjectScope, readProject } from "@/lib/server/projectsStore";
import type { RoomData } from "@/types/room";

export const runtime = "nodejs";

export async function POST(request: Request, ctx: RouteContext<"/api/projects/[projectId]/chat">) {
  const { projectId } = await ctx.params;
  const scope = getProjectScope(request);
  const project = await readProject(projectId, scope);
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

  await addProjectMessage(projectId, { role: "user", content: parsed.data.message }, scope);

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

      await addProjectMessage(projectId, { role: "assistant", content: reply }, scope);
      return NextResponse.json({ error: reply }, { status: 500 });
    }

    await addProjectMessage(projectId, { role: "assistant", content: result.reply }, scope);

    return NextResponse.json({
      reply: result.reply,
      layout: layoutValidation.data,
    });
  } catch {
    const reply =
      locale === "en"
        ? "I could not complete that request. Please try again with a more specific room or object instruction."
        : "Bu isteği tamamlayamadım. Lütfen oda veya seçili öğe için daha net bir komutla tekrar dene.";

    await addProjectMessage(projectId, { role: "assistant", content: reply }, scope);
    return NextResponse.json({ error: reply }, { status: 500 });
  }
}
