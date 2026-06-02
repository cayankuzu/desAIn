import { NextResponse } from "next/server";
import type { ProjectDraftPayload } from "@/types/project";
import { getControllerErrorMessage } from "@/server/controllers/errorMessages";
import { projectService } from "@/server/services/projectService";

export const projectController = {
  async list(userId: string) {
    const projects = await projectService.listProjects(userId);

    return NextResponse.json({
      ok: true,
      projects,
    });
  },

  async save(userId: string, request: Request, projectId?: string) {
    try {
      const payload = (await request.json()) as ProjectDraftPayload;
      const project = await projectService.saveProject(userId, payload, projectId);

      return NextResponse.json({
        ok: true,
        project: projectService.toSummary(project),
      });
    } catch (error) {
      const message = getControllerErrorMessage(error);
      return NextResponse.json(
        { ok: false, message },
        { status: message === "Guncellenecek proje bulunamadi." ? 404 : 400 },
      );
    }
  },

  async cover(userId: string, projectId: string, request: Request) {
    try {
      const payload = (await request.json()) as { coverImageDataUrl: string };
      const project = await projectService.updateCover(
        userId,
        projectId,
        payload.coverImageDataUrl,
      );

      if (!project) {
        return NextResponse.json(
          { ok: false, message: "Proje bulunamadi." },
          { status: 404 },
        );
      }

      return NextResponse.json({
        ok: true,
        project,
      });
    } catch (error) {
      return NextResponse.json(
        { ok: false, message: getControllerErrorMessage(error) },
        { status: 400 },
      );
    }
  },

  async delete(userId: string, projectId: string) {
    try {
      const deleted = await projectService.deleteProject(userId, projectId);

      if (!deleted) {
        return NextResponse.json(
          { ok: false, message: "Silinecek proje bulunamadi." },
          { status: 404 },
        );
      }

      return NextResponse.json({
        ok: true,
      });
    } catch (error) {
      return NextResponse.json(
        { ok: false, message: getControllerErrorMessage(error) },
        { status: 400 },
      );
    }
  },
};
