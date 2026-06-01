import { NextResponse } from "next/server";
import { z } from "zod";
import { MAX_ACTIVE_PROJECTS } from "@/lib/project/workflowLimits";
import { createProject, getProjectScope, listProjects } from "@/lib/server/projectsStore";

export const runtime = "nodejs";

const createSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
});

export async function GET(request: Request) {
  const projects = await listProjects(getProjectScope(request));
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const scope = getProjectScope(request);
  const projects = await listProjects(scope);
  if (projects.length >= MAX_ACTIVE_PROJECTS) {
    return NextResponse.json(
      {
        error: `Aynı anda en fazla ${MAX_ACTIVE_PROJECTS} sohbet oluşturabilirsin. Yeni sohbet açmak için önce bir sohbet sil.`,
        max: MAX_ACTIVE_PROJECTS,
        current: projects.length,
      },
      { status: 409 },
    );
  }

  try {
    const json = await request.json();
    const parsed = createSchema.safeParse(json ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const meta = await createProject(parsed.data.title, scope);
    return NextResponse.json({ project: meta }, { status: 201 });
  } catch {
    const meta = await createProject(undefined, scope);
    return NextResponse.json({ project: meta }, { status: 201 });
  }
}
