"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  FolderPlus,
  ImagePlus,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  ShieldAlert,
} from "lucide-react";
import { roomDraftSchema, type RoomDraft } from "@/lib/ai/roomDraft";
import { useRoomStore } from "@/store/roomStore";
import { useUIStore } from "@/store/uiStore";
import type { ProjectMeta, ProjectState } from "@/types/project";

const panelClass =
  "rounded-2xl border border-white/10 bg-[#0d141d] shadow-[0_18px_45px_rgba(0,0,0,0.35)]";

async function jsonFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  let data: unknown = null;
  try {
    data = (await res.json()) as unknown;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

function isMobileWidth() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

function formatStatus(meta: ProjectMeta) {
  if (meta.status === "analyzing") return "Analyzing...";
  if (meta.status === "uploading") return "Uploading...";
  if (meta.status === "error") return "Error";
  if (meta.photoCount >= 6 && meta.status === "draft") return "Ready to analyze";
  return "Draft";
}

function Bubble({ role, children }: { role: "user" | "assistant" | "system"; children: React.ReactNode }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[min(680px,92%)] rounded-2xl px-3 py-2 text-sm leading-6 ${
          isUser
            ? "bg-[#102234] text-[#dbeafe] border border-[#24405a]"
            : role === "system"
              ? "bg-[#25180f] text-[#f5c28b] border border-[#6d4a29]"
              : "bg-[#111924] text-slate-200 border border-white/10"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export function AiWorkspace() {
  const setWorkspaceMode = useUIStore((s) => s.setWorkspaceMode);
  const updateRoomProperties = useRoomStore((s) => s.updateRoomProperties);
  const addObjectFromTemplate = useRoomStore((s) => s.addObjectFromTemplate);
  const updateObjectProperties = useRoomStore((s) => s.updateObjectProperties);
  const roomData = useRoomStore((s) => s.roomData);

  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<ProjectState | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingProject, setLoadingProject] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileProjectPicker, setMobileProjectPicker] = useState(true);

  const [composerText, setComposerText] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [warningOpen, setWarningOpen] = useState(false);
  const [warningText, setWarningText] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const activeMeta = activeProject?.meta ?? null;
  const mobile = isMobileWidth();
  const isLocked =
    activeMeta?.status === "uploading" || activeMeta?.status === "analyzing";

  const canAnalyze = Boolean(activeMeta && activeMeta.photoCount >= 6 && activeMeta.status !== "analyzing");

  const messages = activeProject?.messages ?? [];

  const analysis = activeProject?.analysis;
  const parsedDraft: RoomDraft | null = useMemo(() => {
    if (!analysis) return null;
    const parsed = roomDraftSchema.safeParse(analysis);
    return parsed.success ? parsed.data : null;
  }, [analysis]);

  const loadProject = useCallback(async (projectId: string) => {
    setActiveProjectId(projectId);
    setLoadingProject(true);
    try {
      const data = await jsonFetch<{ project: ProjectState }>(`/api/projects/${projectId}`);
      setActiveProject(data.project);
      setError(null);
    } catch (e) {
      setActiveProject(null);
      setError(e instanceof Error ? e.message : "Failed to load project");
    } finally {
      setLoadingProject(false);
    }

    if (isMobileWidth()) {
      setMobileProjectPicker(false);
    }
  }, []);

  const refreshProjects = async () => {
    setLoadingProjects(true);
    try {
      const data = await jsonFetch<{ projects: ProjectMeta[] }>("/api/projects");
      setProjects(data.projects);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load projects");
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const data = await jsonFetch<{ projects: ProjectMeta[] }>("/api/projects");
        if (cancelled) return;
        setProjects(data.projects);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load projects");
      } finally {
        if (cancelled) return;
        setLoadingProjects(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, loadingProject, busy]);

  const createNewProject = async () => {
    setBusy(true);
    try {
      const data = await jsonFetch<{ project: ProjectMeta }>("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      await refreshProjects();
      await loadProject(data.project.id);
      if (isMobileWidth()) setMobileProjectPicker(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create project");
    } finally {
      setBusy(false);
    }
  };

  const uploadPendingPhotos = async () => {
    if (!activeProjectId) return;
    if (!pendingFiles.length) return;
    setWarningOpen(false);
    setBusy(true);
    setWarningText(null);

    try {
      const form = new FormData();
      for (const file of pendingFiles) form.append("files", file);
      await jsonFetch(`/api/projects/${activeProjectId}/uploads`, {
        method: "POST",
        body: form,
      });
      setPendingFiles([]);

      // Lock the UI with a visible warning and immediately start analysis.
      setWarningText(
        "Fotograflar yuklendi. Analiz baslatiliyor. Analiz bitene kadar bu projede islem yapilamaz.",
      );
      setBusy(true);

      await jsonFetch(`/api/projects/${activeProjectId}/analyze`, { method: "POST" });
      await loadProject(activeProjectId);
    } catch (e) {
      setWarningText(null);
      setError(e instanceof Error ? e.message : "Upload/analyze failed");
      await loadProject(activeProjectId);
    } finally {
      setBusy(false);
    }
  };

  const applyDraftToEditor = (draft: RoomDraft) => {
    // Start from a clean shell.
    updateRoomProperties({ shape: draft.room.shape, purpose: "empty" });
    updateRoomProperties({
      width: draft.room.width,
      depth: draft.room.depth,
      height: draft.room.height,
    });

    for (const item of draft.items) {
      const added = addObjectFromTemplate(item.templateId, { x: item.x, z: item.z });
      const objectId = added?.type === "object" ? added.id : null;
      if (objectId) {
        updateObjectProperties(objectId, {
          rotation: typeof item.rotation === "number" ? item.rotation : undefined,
        });
      }
    }
  };

  const sendChat = async () => {
    if (!activeProjectId) return;
    const message = composerText.trim();
    if (!message) return;
    if (isLocked || busy) return;

    setBusy(true);
    setComposerText("");
    setError(null);

    try {
      const data = await jsonFetch<{ reply: string }>(`/api/projects/${activeProjectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, roomData }),
      });

      await loadProject(activeProjectId);
      void data;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chat failed");
      await loadProject(activeProjectId);
    } finally {
      setBusy(false);
    }
  };

  const leftSidebar = (
    <aside className={`hidden md:flex md:w-80 md:flex-col md:gap-3 ${panelClass} p-3`}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
          Projects
        </div>
        <button
          type="button"
          onClick={createNewProject}
          disabled={busy}
          className="inline-flex h-8 items-center gap-2 rounded-lg border border-[#24405a] bg-[#102234] px-3 text-xs font-semibold text-[#8cb9ff] transition hover:border-[#4ea8ff] hover:text-white disabled:cursor-not-allowed disabled:opacity-55"
        >
          <FolderPlus className="h-4 w-4" />
          New
        </button>
      </div>
      <div className="scroll-area min-h-0 flex-1 overflow-y-auto">
        {loadingProjects ? (
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#111924] p-3 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading projects...
          </div>
        ) : projects.length ? (
          <div className="grid gap-2">
            {projects.map((project) => {
              const active = project.id === activeProjectId;
              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => void loadProject(project.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                    active
                      ? "border-[#4ea8ff] bg-[#102234] text-white"
                      : "border-white/10 bg-[#111924] text-slate-200 hover:border-[#32516c] hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-sm font-semibold">{project.title}</div>
                    <div className="shrink-0 rounded-md border border-white/10 bg-[#0b1016] px-2 py-1 text-[10px] font-semibold text-slate-400">
                      {project.photoCount} photos
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">{formatStatus(project)}</div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-[#111924] p-4 text-sm text-slate-300">
            No projects yet.
          </div>
        )}
      </div>
    </aside>
  );

  const mobileProjectList = (
    <div className={`${panelClass} p-3 md:hidden`}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-white">Projects</div>
        <button
          type="button"
          onClick={createNewProject}
          disabled={busy}
          className="inline-flex h-8 items-center gap-2 rounded-lg border border-[#24405a] bg-[#102234] px-3 text-xs font-semibold text-[#8cb9ff] transition hover:border-[#4ea8ff] hover:text-white disabled:cursor-not-allowed disabled:opacity-55"
        >
          <Plus className="h-4 w-4" />
          New
        </button>
      </div>
      <div className="mt-3 grid gap-2">
        {projects.map((project) => (
          <button
            key={project.id}
            type="button"
            onClick={() => void loadProject(project.id)}
            className={`w-full rounded-xl border px-3 py-2 text-left transition ${
              project.id === activeProjectId
                ? "border-[#4ea8ff] bg-[#102234] text-white"
                : "border-white/10 bg-[#111924] text-slate-200 hover:border-[#32516c] hover:text-white"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="truncate text-sm font-semibold">{project.title}</div>
              <div className="shrink-0 rounded-md border border-white/10 bg-[#0b1016] px-2 py-1 text-[10px] font-semibold text-slate-400">
                {project.photoCount}
              </div>
            </div>
            <div className="mt-1 text-xs text-slate-400">{formatStatus(project)}</div>
          </button>
        ))}
      </div>
    </div>
  );

  const projectHeader = activeMeta ? (
    <div className={`${panelClass} flex items-center justify-between gap-2 px-3 py-2`}>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-white">{activeMeta.title}</div>
        <div className="mt-0.5 text-xs text-slate-400">
          {formatStatus(activeMeta)}
          {activeMeta.lockReason ? ` • ${activeMeta.lockReason}` : ""}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMobileProjectPicker(true)}
          className="md:hidden inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#0d141d] text-slate-300 transition hover:border-[#32516c] hover:text-white"
          aria-label="Back to projects"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="hidden sm:inline-flex h-8 items-center rounded-lg border border-white/10 bg-[#0d141d] px-3 text-xs font-semibold text-slate-300">
          {activeMeta.photoCount} photos
        </div>
      </div>
    </div>
  ) : null;

  return (
    <section className="flex-1 min-h-0">
      <div className="mx-auto flex h-full max-w-[1600px] gap-3 p-3">
        {leftSidebar}

        <div className="flex min-h-0 flex-1 flex-col gap-3">
          {mobileProjectPicker ? mobileProjectList : null}

          {!activeProjectId ? (
            <div className={`${panelClass} flex min-h-[40vh] flex-col items-center justify-center gap-3 p-8 text-center`}>
              <MessageSquare className="h-8 w-8 text-[#8cb9ff]" />
              <div className="text-base font-semibold text-white">AI Workspace</div>
              <div className="max-w-md text-sm text-slate-400">
                Create a project, upload at least 6 photos, then chat to refine the layout.
              </div>
              <button
                type="button"
                onClick={createNewProject}
                disabled={busy}
                className="mt-1 inline-flex h-10 items-center gap-2 rounded-xl border border-[#24405a] bg-[#102234] px-4 text-sm font-semibold text-[#8cb9ff] transition hover:border-[#4ea8ff] hover:text-white disabled:cursor-not-allowed disabled:opacity-55"
              >
                <FolderPlus className="h-4 w-4" />
                New project
              </button>
            </div>
          ) : (
            <>
              {projectHeader}

              <div className={`${panelClass} flex min-h-0 flex-1 flex-col`}>
                <div ref={scrollRef} className="scroll-area min-h-0 flex-1 overflow-y-auto p-3">
                  {loadingProject ? (
                    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#111924] p-3 text-sm text-slate-300">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </div>
                  ) : error ? (
                    <div className="flex items-start gap-2 rounded-xl border border-[#6e2a2a] bg-[#2a1313] p-3 text-sm text-[#ffb1b1]">
                      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>{error}</div>
                    </div>
                  ) : null}

                  {warningText ? (
                    <Bubble role="system">{warningText}</Bubble>
                  ) : null}

                  {messages.length ? (
                    <div className="grid gap-3">
                      {messages.map((m) => (
                        <Bubble key={m.id} role={m.role}>
                          {m.content}
                        </Bubble>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-[#111924] p-4 text-sm text-slate-300">
                      Upload photos to start. This project will lock while analyzing.
                    </div>
                  )}

                  {activeMeta?.status === "error" && activeMeta.lastError ? (
                    <div className="mt-3 rounded-xl border border-[#6e2a2a] bg-[#2a1313] p-3 text-sm text-[#ffb1b1]">
                      <div className="font-semibold">Last error</div>
                      <div className="mt-1 whitespace-pre-wrap text-xs text-[#ffb1b1]/90">
                        {activeMeta.lastError}
                      </div>
                    </div>
                  ) : null}

                  {parsedDraft ? (
                    <div className="mt-4 rounded-xl border border-white/10 bg-[#111924] p-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Draft
                      </div>
                      <div className="mt-2 grid gap-2 text-sm text-slate-200">
                        <div>
                          Room: {parsedDraft.room.width}m x {parsedDraft.room.depth}m x{" "}
                          {parsedDraft.room.height}m
                        </div>
                        <div>Items: {parsedDraft.items.length}</div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            applyDraftToEditor(parsedDraft);
                            setWorkspaceMode("kitchen");
                          }}
                          className="hidden md:inline-flex h-9 items-center gap-2 rounded-xl border border-[#24405a] bg-[#102234] px-3 text-sm font-semibold text-[#8cb9ff] transition hover:border-[#4ea8ff] hover:text-white"
                        >
                          Apply to editor
                        </button>
                        <div className="md:hidden text-xs text-slate-400">
                          Editor is desktop-first. Open this project on a computer to continue.
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="border-t border-white/10 p-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-[#111924] px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-[#32516c] hover:text-white">
                        <ImagePlus className="h-4 w-4 text-[#8cb9ff]" />
                        Photos
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const list = Array.from(e.target.files ?? []);
                            if (!list.length) return;
                            setPendingFiles(list);
                            setWarningOpen(true);
                            e.currentTarget.value = "";
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => void uploadPendingPhotos()}
                        disabled={!pendingFiles.length || busy || isLocked}
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#24405a] bg-[#102234] px-4 text-sm font-semibold text-[#8cb9ff] transition hover:border-[#4ea8ff] hover:text-white disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        {busy && isLocked ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : null}
                        Upload & Analyze
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (!activeProjectId) return;
                          void (async () => {
                            setBusy(true);
                            setError(null);
                            try {
                              await jsonFetch(`/api/projects/${activeProjectId}/analyze`, {
                                method: "POST",
                              });
                              await loadProject(activeProjectId);
                            } catch (e) {
                              setError(e instanceof Error ? e.message : "Analyze failed");
                            } finally {
                              setBusy(false);
                            }
                          })();
                        }}
                        disabled={!canAnalyze || busy || isLocked}
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-[#0d141d] px-4 text-sm font-semibold text-slate-200 transition hover:border-[#32516c] hover:text-white disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        Analyze
                      </button>

                      {pendingFiles.length ? (
                        <div className="text-xs text-slate-400">
                          Selected: {pendingFiles.length}
                        </div>
                      ) : null}
                    </div>

                    {mobile ? (
                      <div className="rounded-xl border border-white/10 bg-[#111924] p-3 text-sm text-slate-200">
                        Mobile Capture Mode: create a project and upload photos. Continue editing on
                        desktop in “Isin Mutfagi”.
                      </div>
                    ) : (
                      <div className="flex items-end gap-2">
                        <textarea
                          value={composerText}
                          onChange={(e) => setComposerText(e.target.value)}
                          placeholder={isLocked ? "Project locked while analyzing..." : "Message..."}
                          disabled={busy || isLocked}
                          rows={2}
                          className="min-h-[44px] w-full resize-none rounded-2xl border border-white/10 bg-[#0b1016] px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-[#32516c] disabled:cursor-not-allowed disabled:opacity-55"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              void sendChat();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => void sendChat()}
                          disabled={!composerText.trim() || busy || isLocked}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#24405a] bg-[#102234] text-[#8cb9ff] transition hover:border-[#4ea8ff] hover:text-white disabled:cursor-not-allowed disabled:opacity-55"
                          aria-label="Send"
                        >
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </button>
                      </div>
                    )}
                    <div className="text-[11px] text-slate-500">
                      Tip: Upload 12+ photos for better wall/object detection.
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {warningOpen ? (
        <div className="fixed inset-0 z-[99] flex items-center justify-center bg-black/65 p-4">
          <div className={`${panelClass} w-full max-w-lg p-4`}>
            <div className="text-sm font-semibold text-white">Before you upload</div>
            <div className="mt-2 text-sm text-slate-300 leading-6">
              This project will be locked while photos are analyzed. Recommended: 12+ photos,
              consistent lighting, and 60% overlap.
            </div>
            <div className="mt-3 rounded-xl border border-white/10 bg-[#111924] p-3 text-sm text-slate-200">
              Selected photos: <span className="font-semibold">{pendingFiles.length}</span>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setWarningOpen(false);
                  setPendingFiles([]);
                }}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-white/10 bg-[#0d141d] px-3 text-sm font-semibold text-slate-200 transition hover:border-[#32516c] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void uploadPendingPhotos()}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-[#24405a] bg-[#102234] px-3 text-sm font-semibold text-[#8cb9ff] transition hover:border-[#4ea8ff] hover:text-white"
              >
                Upload & Analyze
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
