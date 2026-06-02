import { authController } from "@/server/controllers/authController";

export async function POST() {
  return authController.logout();
}
