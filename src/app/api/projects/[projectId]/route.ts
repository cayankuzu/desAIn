import { NextResponse } from "next/server";
import { getCurrentViewer } from "@/server/auth/session";
import { projectController } from "@/server/controllers/projectController";

const unauthorized = () =>
  NextResponse.json(
    { ok: false, message: "Bu islem icin giris yapmaniz gerekiyor." },
    { status: 401 },
  );

export async function PUT(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    return unauthorized();
  }

  const { projectId } = await context.params;
  return projectController.save(viewer.id, request, projectId);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    return unauthorized();
  }

  const { projectId } = await context.params;
  return projectController.delete(viewer.id, projectId);
}
