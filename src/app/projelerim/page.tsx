import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountWorkspace } from "@/components/account/AccountWorkspace";
import { getCurrentViewer } from "@/server/auth/session";
import { projectService } from "@/server/services/projectService";

export const metadata: Metadata = {
  title: "Projelerim | desAIn",
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ flash?: string }>;
}) {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    redirect("/giris?redirect=%2Fprojelerim");
  }

  const params = await searchParams;
  const projects = await projectService.listProjects(viewer.id);

  return (
    <AccountWorkspace
      key={`${viewer.id}:${params.flash ?? "default"}`}
      initialViewer={viewer}
      initialProjects={projects}
      initialTab="projects"
      flashCode={params.flash ?? null}
    />
  );
}
