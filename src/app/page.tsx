import { AppShell } from "@/components/layout/AppShell";
import { redirect } from "next/navigation";
import { getCurrentViewer } from "@/server/auth/session";
import { projectService } from "@/server/services/projectService";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    projectId?: string;
    captureCover?: string;
    returnTo?: string;
    draft?: string;
  }>;
}) {
  const viewer = await getCurrentViewer();
  const params = await searchParams;
  const projectId = params.projectId;
  const initialProject =
    viewer && projectId
      ? await projectService.getEditorProject(viewer.id, projectId)
      : null;

  if (viewer && !projectId && params.draft !== "1") {
    redirect("/projelerim");
  }

  if (viewer && projectId && !initialProject) {
    redirect("/projelerim");
  }

  return (
    <AppShell
      key={`${viewer?.id ?? "guest"}:${initialProject?.id ?? "draft"}:${params.captureCover ?? "0"}:${params.returnTo ?? ""}:${params.draft ?? "0"}`}
      initialViewer={viewer}
      initialProject={initialProject}
      openCoverCaptureOnLoad={params.captureCover === "1" && Boolean(initialProject)}
      returnToPath={params.returnTo ?? null}
      startInDraftSession={params.draft === "1"}
    />
  );
}
