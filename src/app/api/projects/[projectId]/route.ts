import { NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteProject,
  getProjectScope,
  readProject,
  updateProjectMeta,
} from "@/lib/server/projectsStore";

export const runtime = "nodejs";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
});

export async function GET(request: Request, ctx: RouteContext<"/api/projects/[projectId]">) {
  const { projectId } = await ctx.params;
  const project = await readProject(projectId, getProjectScope(request));
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ project });
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/projects/[projectId]">) {
  const { projectId } = await ctx.params;
  const scope = getProjectScope(request);
  const json = await request.json();
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const meta = await updateProjectMeta(projectId, parsed.data, scope);
  if (!meta) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ project: meta });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/projects/[projectId]">) {
  const { projectId } = await ctx.params;
  const scope = getProjectScope(request);

  const existing = await readProject(projectId, scope);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await deleteProject(projectId, scope);
  return NextResponse.json({ ok: true });
}
