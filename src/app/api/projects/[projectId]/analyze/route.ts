import { NextResponse } from "next/server";
import { curatedInventoryCatalog } from "@/lib/room/inventoryCatalog";
import {
  readProject,
  readProjectUploadBytes,
  updateProjectMeta,
  writeProjectAnalysis,
} from "@/lib/server/projectsStore";
import { analyzeRoomWithCurrentProvider } from "@/lib/ai/runtime";

export const runtime = "nodejs";

export async function POST(request: Request, ctx: RouteContext<"/api/projects/[projectId]/analyze">) {
  const { projectId } = await ctx.params;
  const project = await readProject(projectId);

  let locale: "tr" | "en" = "tr";
  try {
    const body = (await request.json()) as { locale?: "tr" | "en" } | null;
    if (body?.locale === "en") {
      locale = "en";
    }
  } catch {
    // Fall back to Turkish if the request has no JSON body.
  }

  if (!project) {
    return NextResponse.json(
      { error: locale === "en" ? "Not found" : "Bulunamadı" },
      { status: 404 },
    );
  }

  if (project.meta.status === "analyzing") {
    return NextResponse.json(
      { error: locale === "en" ? "Already analyzing" : "Zaten analiz ediliyor" },
      { status: 409 },
    );
  }

  if (project.uploads.length < 6) {
    return NextResponse.json(
      {
        error: locale === "en" ? "Not enough photos" : "Yeterli fotoğraf yok",
        min: 6,
        current: project.uploads.length,
      },
      { status: 400 },
    );
  }

  await updateProjectMeta(projectId, {
    status: "analyzing",
    lockReason: locale === "en" ? "Analyzing photos" : "Fotoğraflar analiz ediliyor",
    lastError: undefined,
  });

  try {
    const inventory = curatedInventoryCatalog.map((item) => ({
      id: item.id,
      label: item.label,
      category: item.category,
      width: item.dimensions.width,
      depth: item.dimensions.depth,
      height: item.dimensions.height,
      tags: item.tags,
    }));

    // Analyze the most recent batch for best alignment with what the user just uploaded.
    const uploads = project.uploads.slice(-9);
    const images = [];
    for (const upload of uploads) {
      const bytes = await readProjectUploadBytes(projectId, upload.storedName);
      images.push({
        mimeType: upload.mimeType,
        base64: bytes.toString("base64"),
      });
    }

    const analysis = await analyzeRoomWithCurrentProvider({ images, inventory, locale });

    await writeProjectAnalysis(projectId, analysis);
    const updated = await readProject(projectId);

    return NextResponse.json({ analysis, meta: updated?.meta });
  } catch (error) {
    await updateProjectMeta(projectId, {
      status: "error",
      lockReason: undefined,
      lastError: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: locale === "en" ? "Analysis failed" : "Analiz başarısız" },
      { status: 500 },
    );
  }
}
