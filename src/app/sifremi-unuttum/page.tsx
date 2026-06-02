import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountWorkspace } from "@/components/account/AccountWorkspace";
import { getCurrentViewer } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Sifremi unuttum | desAIn",
};

export default async function ForgotPasswordPage() {
  const viewer = await getCurrentViewer();

  if (viewer) {
    redirect("/projelerim");
  }

  return <AccountWorkspace initialViewer={null} initialTab="forgot" />;
}
