import { NextResponse } from "next/server";
import { roomDraftSchema } from "@/lib/ai/roomDraft";
import { createRoomDataFromDraft } from "@/lib/ai/roomDraftToRoomData";
import { analyzeRoomWithCurrentProvider } from "@/lib/ai/runtime";
import { ANALYSIS_TIMEOUT_MS, PROJECT_PHOTO_COUNT } from "@/lib/project/workflowLimits";
import { curatedInventoryCatalog } from "@/lib/room/inventoryCatalog";
import {
  readProject,
  readProjectUploadBytes,
  updateProjectMeta,
  writeProjectAnalysis,
  writeProjectRoomData,
} from "@/lib/server/projectsStore";

export const runtime = "nodejs";

function withTimeout<T>(promise: Promise<T>, locale: "tr" | "en") {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            locale === "en"
              ? "Analysis timed out before the 5 minute target."
              : "Analiz 5 dakikalık hedef süreyi aştı.",
          ),
        );
      }, ANALYSIS_TIMEOUT_MS);
    }),
  ]);
}

function getAnalysisErrorMessage(error: unknown, locale: "tr" | "en") {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const text = raw.toLowerCase();

  if (text.includes("429") || text.includes("quota") || text.includes("rate limit")) {
    return locale === "en"
      ? "The vision provider quota or rate limit was reached. Try again in a few minutes or switch provider."
      : "Görsel analiz sağlayıcısında kota veya hız sınırına ulaşıldı. Birkaç dakika sonra tekrar dene ya da sağlayıcıyı değiştir.";
  }

  if (text.includes("timed out") || text.includes("süreyi")) {
    return locale === "en"
      ? "Analysis exceeded the 5 minute production limit. Use brighter, clearer photos and retry."
      : "Analiz 5 dakikalık üretim sınırını aştı. Daha aydınlık ve net fotoğraflarla tekrar dene.";
  }

  if (text.includes("api key") || text.includes("missing")) {
    return locale === "en"
      ? "The AI provider is not configured correctly. Check the vision API key."
      : "AI sağlayıcısı doğru yapılandırılmamış. Görsel analiz API anahtarını kontrol et.";
  }

  return locale === "en"
    ? "Analysis failed. Check photo quality and try again."
    : "Analiz başarısız oldu. Fotoğraf kalitesini kontrol edip tekrar dene.";
}

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

  if (project.meta.status === "uploading" || project.meta.status === "analyzing") {
    return NextResponse.json(
      {
        error:
          locale === "en"
            ? "Project is busy. Wait for the current step to finish."
            : "Proje meşgul. Mevcut adımın bitmesini bekle.",
      },
      { status: 409 },
    );
  }

  if (project.uploads.length !== PROJECT_PHOTO_COUNT) {
    return NextResponse.json(
      {
        error:
          locale === "en"
            ? `A project must have exactly ${PROJECT_PHOTO_COUNT} photos before analysis.`
            : `Analiz için projede tam ${PROJECT_PHOTO_COUNT} fotoğraf olmalı.`,
        required: PROJECT_PHOTO_COUNT,
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

    const images = [];
    for (const upload of project.uploads) {
      const bytes = await readProjectUploadBytes(projectId, upload.storedName);
      images.push({
        mimeType: upload.mimeType,
        base64: bytes.toString("base64"),
      });
    }

    const analysis = await withTimeout(
      analyzeRoomWithCurrentProvider({ images, inventory, locale }),
      locale,
    );
    const roomDraft = roomDraftSchema.parse(analysis);
    const roomData = createRoomDataFromDraft(roomDraft);

    await writeProjectAnalysis(projectId, roomDraft);
    await writeProjectRoomData(projectId, roomData);
    await updateProjectMeta(projectId, { analyzedAt: new Date().toISOString() });
    const updated = await readProject(projectId);

    return NextResponse.json({ analysis: roomDraft, roomData, meta: updated?.meta });
  } catch (error) {
    const message = getAnalysisErrorMessage(error, locale);
    await updateProjectMeta(projectId, {
      status: "error",
      lockReason: undefined,
      lastError: message,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
