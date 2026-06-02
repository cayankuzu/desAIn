import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountWorkspace } from "@/components/account/AccountWorkspace";
import { getCurrentViewer } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Giris yap | desAIn",
};

export default async function LoginPage() {
  const viewer = await getCurrentViewer();

  if (viewer) {
    redirect("/projelerim");
  }

  return <AccountWorkspace initialViewer={null} initialTab="login" />;
}
