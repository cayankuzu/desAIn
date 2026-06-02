import { authController } from "@/server/controllers/authController";

export async function POST(request: Request) {
  return authController.resetPassword(request);
}
