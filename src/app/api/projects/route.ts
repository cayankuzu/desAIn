import { NextResponse } from "next/server";
import { getCurrentViewer } from "@/server/auth/session";
import { projectController } from "@/server/controllers/projectController";

const unauthorized = () =>
  NextResponse.json(
    { ok: false, message: "Bu islem icin giris yapmaniz gerekiyor." },
    { status: 401 },
  );

export async function GET() {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    return unauthorized();
  }

  return projectController.list(viewer.id);
}

export async function POST(request: Request) {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    return unauthorized();
  }

  return projectController.save(viewer.id, request);
}
