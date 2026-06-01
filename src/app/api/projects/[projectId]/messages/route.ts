import { NextResponse } from "next/server";
import { z } from "zod";
import { addProjectMessage, getProjectScope, readProject } from "@/lib/server/projectsStore";

export const runtime = "nodejs";

const postSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().trim().min(1).max(6000),
});

export async function GET(request: Request, ctx: RouteContext<"/api/projects/[projectId]/messages">) {
  const { projectId } = await ctx.params;
  const project = await readProject(projectId, getProjectScope(request));
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ messages: project.messages });
}

export async function POST(request: Request, ctx: RouteContext<"/api/projects/[projectId]/messages">) {
  const { projectId } = await ctx.params;
  const scope = getProjectScope(request);
  const json = await request.json();
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const message = await addProjectMessage(projectId, parsed.data, scope);
  if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ message }, { status: 201 });
}
