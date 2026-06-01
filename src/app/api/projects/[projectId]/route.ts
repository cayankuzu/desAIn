import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteProject, readProject, updateProjectMeta } from "@/lib/server/projectsStore";

export const runtime = "nodejs";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
});

export async function GET(_req: Request, ctx: RouteContext<"/api/projects/[projectId]">) {
  const { projectId } = await ctx.params;
  const project = await readProject(projectId);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ project });
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/projects/[projectId]">) {
  const { projectId } = await ctx.params;
  const json = await request.json();
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const meta = await updateProjectMeta(projectId, parsed.data);
  if (!meta) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ project: meta });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/projects/[projectId]">) {
  const { projectId } = await ctx.params;

  const existing = await readProject(projectId);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await deleteProject(projectId);
  return NextResponse.json({ ok: true });
}
