import { NextResponse } from "next/server";
import { readProject, saveProjectUpload, updateProjectMeta } from "@/lib/server/projectsStore";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: RouteContext<"/api/projects/[projectId]/uploads">) {
  const { projectId } = await ctx.params;
  const project = await readProject(projectId);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ uploads: project.uploads, meta: project.meta });
}

export async function POST(request: Request, ctx: RouteContext<"/api/projects/[projectId]/uploads">) {
  const { projectId } = await ctx.params;
  const project = await readProject(projectId);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (project.meta.status === "analyzing") {
    return NextResponse.json(
      { error: "Project locked", reason: project.meta.lockReason ?? "Analyzing" },
      { status: 423 },
    );
  }

  const form = await request.formData();
  const files = form.getAll("files").filter((entry): entry is File => entry instanceof File);

  if (!files.length) {
    return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  }

  if (files.length > 9) {
    return NextResponse.json(
      { error: "Bir seferde en fazla 9 fotograf yukleyebilirsin.", max: 9, current: files.length },
      { status: 400 },
    );
  }

  if (project.uploads.length === 0 && files.length < 6) {
    return NextResponse.json(
      { error: "Ilk yukleme 6-9 fotograf olmali.", min: 6, max: 9, current: files.length },
      { status: 400 },
    );
  }

  await updateProjectMeta(projectId, { status: "uploading", lockReason: "Uploading photos" });

  const saved = [];
  for (const file of files) {
    const upload = await saveProjectUpload(projectId, file);
    if (upload) saved.push(upload);
  }

  const updated = await readProject(projectId);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const meta = await updateProjectMeta(projectId, { status: "draft", lockReason: undefined });
  return NextResponse.json({ uploads: updated.uploads, meta: meta ?? updated.meta });
}
