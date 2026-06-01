import { NextResponse } from "next/server";
import { z } from "zod";
import type { RoomData } from "@/types/room";
import { getProjectScope, readProject, writeProjectRoomData } from "@/lib/server/projectsStore";

export const runtime = "nodejs";

const putSchema = z.object({
  roomData: z.unknown(),
});

export async function GET(request: Request, ctx: RouteContext<"/api/projects/[projectId]/room">) {
  const { projectId } = await ctx.params;
  const project = await readProject(projectId, getProjectScope(request));
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ roomData: project.roomData });
}

export async function PUT(request: Request, ctx: RouteContext<"/api/projects/[projectId]/room">) {
  const { projectId } = await ctx.params;
  const scope = getProjectScope(request);
  const json = await request.json();
  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (!parsed.data.roomData || typeof parsed.data.roomData !== "object") {
    return NextResponse.json({ error: "Invalid roomData" }, { status: 400 });
  }

  const saved = await writeProjectRoomData(projectId, parsed.data.roomData as RoomData, scope);
  if (!saved) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
