import { NextResponse } from "next/server";
import { z } from "zod";
import { createProject, listProjects } from "@/lib/server/projectsStore";

export const runtime = "nodejs";

const createSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
});

export async function GET() {
  const projects = await listProjects();
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = createSchema.safeParse(json ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const meta = await createProject(parsed.data.title);
    return NextResponse.json({ project: meta }, { status: 201 });
  } catch {
    const meta = await createProject();
    return NextResponse.json({ project: meta }, { status: 201 });
  }
}

