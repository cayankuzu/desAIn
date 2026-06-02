import type { Metadata } from "next";
import { AccountWorkspace } from "@/components/account/AccountWorkspace";

export const metadata: Metadata = {
  title: "Yeni sifre belirle | desAIn",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;

  return (
    <AccountWorkspace
      initialViewer={null}
      initialTab="reset"
      resetToken={params.token ?? null}
    />
  );
}
