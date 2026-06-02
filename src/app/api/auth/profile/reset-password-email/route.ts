import { NextResponse } from "next/server";
import { getCurrentViewer } from "@/server/auth/session";
import { authController } from "@/server/controllers/authController";

const unauthorized = () =>
  NextResponse.json(
    { ok: false, message: "Bu islem icin giris yapmaniz gerekiyor." },
    { status: 401 },
  );

export async function POST() {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    return unauthorized();
  }

  return authController.sendPasswordResetEmail(viewer.id);
}
