import { authController } from "@/server/controllers/authController";

export async function GET() {
  return authController.session();
}
