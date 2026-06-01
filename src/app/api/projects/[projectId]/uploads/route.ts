import { NextResponse } from "next/server";
import { PROJECT_PHOTO_COUNT } from "@/lib/project/workflowLimits";
import {
  getProjectScope,
  readProject,
  saveProjectUpload,
  updateProjectMeta,
} from "@/lib/server/projectsStore";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: RouteContext<"/api/projects/[projectId]/uploads">) {
  const { projectId } = await ctx.params;
  const project = await readProject(projectId, getProjectScope(_req));
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ uploads: project.uploads, meta: project.meta });
}

export async function POST(request: Request, ctx: RouteContext<"/api/projects/[projectId]/uploads">) {
  const { projectId } = await ctx.params;
  const scope = getProjectScope(request);
  const project = await readProject(projectId, scope);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const form = await request.formData();
  const locale: "tr" | "en" = form.get("locale") === "en" ? "en" : "tr";

  if (project.meta.status === "uploading" || project.meta.status === "analyzing") {
    return NextResponse.json(
      {
        error:
          locale === "en"
            ? "Project is busy. Wait for the current step to finish."
            : "Proje meşgul. Mevcut adımın bitmesini bekle.",
        reason: project.meta.lockReason,
      },
      { status: 423 },
    );
  }

  if (project.uploads.length > 0) {
    return NextResponse.json(
      {
        error:
          locale === "en"
            ? `Photos are already uploaded. Each project accepts exactly ${PROJECT_PHOTO_COUNT} photos once.`
            : `Bu proje için fotoğraflar zaten yüklendi. Her proje yalnızca bir kez, tam ${PROJECT_PHOTO_COUNT} fotoğrafla yakalanır.`,
        required: PROJECT_PHOTO_COUNT,
        current: project.uploads.length,
      },
      { status: 409 },
    );
  }
  const files = form.getAll("files").filter((entry): entry is File => entry instanceof File);

  if (files.length !== PROJECT_PHOTO_COUNT) {
    return NextResponse.json(
      {
        error:
          locale === "en"
            ? `Upload exactly ${PROJECT_PHOTO_COUNT} photos for this project.`
            : `Bu proje için tam ${PROJECT_PHOTO_COUNT} fotoğraf yüklemelisin.`,
        required: PROJECT_PHOTO_COUNT,
        current: files.length,
      },
      { status: 400 },
    );
  }

  const invalidFile = files.find((file) => !file.type.startsWith("image/"));
  if (invalidFile) {
    return NextResponse.json(
      {
        error:
          locale === "en"
            ? "Only image files can be uploaded."
            : "Yalnızca görsel dosyaları yüklenebilir.",
        filename: invalidFile.name,
      },
      { status: 400 },
    );
  }

  await updateProjectMeta(
    projectId,
    {
      status: "uploading",
      lockReason: locale === "en" ? "Uploading photos" : "Fotoğraflar yükleniyor",
    },
    scope,
  );

  try {
    const saved = [];
    for (const file of files) {
      const upload = await saveProjectUpload(projectId, file, scope);
      if (upload) saved.push(upload);
    }

    const updated = await readProject(projectId, scope);
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const meta = await updateProjectMeta(
      projectId,
      { status: "draft", lockReason: undefined },
      scope,
    );
    return NextResponse.json({ uploads: updated.uploads, meta: meta ?? updated.meta });
  } catch {
    await updateProjectMeta(
      projectId,
      {
        status: "error",
        lockReason: undefined,
        lastError:
          locale === "en"
            ? "An error occurred while uploading photos. Try again."
            : "Fotoğraf yükleme sırasında bir hata oluştu. Tekrar dene.",
      },
      scope,
    );
    return NextResponse.json(
      {
        error:
          locale === "en"
            ? "An error occurred while uploading photos. Try again."
            : "Fotoğraf yükleme sırasında bir hata oluştu. Tekrar dene.",
      },
      { status: 500 },
    );
  }
}
