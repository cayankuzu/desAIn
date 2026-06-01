import { NextResponse } from "next/server";
import { z } from "zod";
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
