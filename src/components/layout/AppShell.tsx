"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Boxes, Lock, Monitor, RefreshCw, Shuffle, Trash2, Ungroup, Unlock } from "lucide-react";
import {
  getLocalizedRoomLabel,
  t,
} from "@/lib/i18n/translations";
import {
  getAccountCopy,
  localizeApiMessage,
  type AccountWorkspaceTab,
} from "@/lib/i18n/accountTranslations";
import {
  getInventoryTemplateById,
  INVENTORY_DRAG_MIME,
  type InventoryTemplate,
} from "@/lib/room/inventoryCatalog";
import {
  clampObjectPositionToRoom,
  getWallAttachedObjectTransform,
  isWallAttachedObject,
} from "@/lib/room/constraints";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { useRoomStore } from "@/store/roomStore";
import { useUIStore } from "@/store/uiStore";
import { AccountWorkspace } from "@/components/account/AccountWorkspace";
import { EditorHotkeys } from "@/components/layout/EditorHotkeys";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ViewportHud } from "@/components/layout/ViewportHud";
import { MobileRoomViewportPreview } from "@/components/layout/MobileRoomViewportPreview";
import { AccountBar } from "@/components/projects/AccountBar";
import { CoverCaptureOverlay } from "@/components/projects/CoverCaptureOverlay";
import { ProjectSaveDialog } from "@/components/projects/ProjectSaveDialog";
import {
  RoomScene,
  type ViewportRoomPositionResolver,
} from "@/components/room/RoomScene";
import { buildEditorStatusToast, buildStructureToast, type EditorToast } from "@/lib/editor/toasts";
import type { RoomData, RoomObject } from "@/types/room";
import type { EditorProject, ProjectDraftPayload, ProjectSummary, Viewer } from "@/types/project";

type DragPreviewState = {
  templateId: string | null;
  x: number;
  y: number;
  position: RoomObject["position"] | null;
};

const emptyDragPreview: DragPreviewState = {
  templateId: null,
  x: 0,
  y: 0,
  position: null,
};

const toProjectSummary = (project: EditorProject | null): ProjectSummary | null =>
  project
    ? {
        id: project.id,
        name: project.name,
        description: project.description,
        coverImageDataUrl: project.coverImageDataUrl,
        itemCount: project.itemCount,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        lastOpenedAt: project.lastOpenedAt,
      }
    : null;

function getMobileDesktopNoticeCopy(locale: "tr" | "en") {
  return locale === "en"
    ? {
        eyebrow: "Mobile preview",
        title: "Please open on desktop",
        body: "Editing and layout generation are available only on a computer. On mobile, you can only browse the room previews below.",
        note: "This notice cannot be closed.",
      }
    : {
        eyebrow: "Mobil \u00f6nizleme",
        title: "L\u00fctfen bilgisayardan a\u00e7\u0131n\u0131z",
        body: "D\u00fczenleme ve yerle\u015fim olu\u015fturma yaln\u0131zca bilgisayarda a\u00e7\u0131kt\u0131r. Telefondan sadece a\u015fa\u011f\u0131daki oda \u00f6nizlemeleri gezilebilir.",
        note: "Bu uyar\u0131 kapat\u0131lamaz.",
      };
}

const mobilePreviewPurposes = [
  "living",
  "kitchen",
  "bedroom",
  "kids",
  "study",
  "bathroom",
  "dining",
  "laundry",
  "entry",
  "balcony",
  "dressing",
] as const;

function MobileDesktopNotice({ locale }: { locale: "tr" | "en" }) {
  const copy = getMobileDesktopNoticeCopy(locale);

  return (
    <main className="mobile-desktop-gate relative h-dvh overflow-y-auto bg-[#080d12] px-4 pb-8 pt-48 text-white">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40 h-40 bg-gradient-to-b from-[#080d12] via-[#080d12]/92 to-transparent" />
      <section className="fixed left-3 right-3 top-3 z-50 mx-auto max-w-md rounded-[1.35rem] border border-white/14 bg-[#111922]/92 p-3.5 shadow-[0_18px_48px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#ffb36c]/35 bg-[#2a180c] text-[#ffd7a7]">
            <Monitor className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[#ffb36c]">
              {copy.eyebrow}
            </div>
            <h1 className="mt-1 text-lg font-semibold leading-6 tracking-[-0.03em] text-white">
              {copy.title}
            </h1>
            <p className="mt-1.5 text-xs leading-5 text-slate-300">{copy.body}</p>
            <div className="mt-2 inline-flex rounded-full border border-[#ffb36c]/20 bg-[#2a180c]/80 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#ffd7a7]">
              {copy.note}
            </div>
          </div>
        </div>
      </section>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(255,179,108,0.2),transparent_28%),radial-gradient(circle_at_84%_14%,rgba(114,177,255,0.18),transparent_30%),linear-gradient(180deg,rgba(8,13,18,0.2),rgba(8,13,18,0.95))]" />
      <div className="relative z-10 space-y-4">
        {mobilePreviewPurposes.map((purpose) => (
          <MobileRoomViewportPreview key={purpose} locale={locale} purpose={purpose} />
        ))}
      </div>
    </main>
  );
}

const getViewportRoomPosition = (
  roomData: RoomData,
  pointerX: number,
  pointerY: number,
  bounds: DOMRect,
): RoomObject["position"] => {
  const ratioX = Math.min(1, Math.max(0, pointerX / bounds.width));
  const ratioZ = Math.min(1, Math.max(0, pointerY / bounds.height));

  return {
    x: ratioX * roomData.room.width,
    z: ratioZ * roomData.room.depth,
  };
};

const createPreviewObjectFromTemplate = (
  template: InventoryTemplate,
  roomData: RoomData,
  position: RoomObject["position"],
): RoomObject => {
  const structural = Boolean(template.params.structural);
  const mountHeight =
    typeof template.params.mountHeight === "number" ? template.params.mountHeight : 0;
  const height = Math.min(
    template.dimensions.height,
    Math.max(0.05, roomData.room.height - mountHeight),
  );
  const previewObject: RoomObject = {
    id: `preview_${template.id}`,
    label: template.label,
    labelKey: template.labelKey,
    category: template.category,
    generator: template.generator,
    position,
    rotation: template.rotation ?? 0,
    dimensions: {
      ...template.dimensions,
      height,
    },
    color: template.color,
    movable: !structural,
    locked: structural,
    params: { ...template.params },
  };

  if (isWallAttachedObject(previewObject)) {
    const placement = getWallAttachedObjectTransform(
      roomData,
      previewObject,
      previewObject.position,
    );

    return {
      ...previewObject,
      position: placement.position,
      rotation: placement.rotation,
    };
  }

  return {
    ...previewObject,
    position: clampObjectPositionToRoom(
      roomData,
      previewObject,
      previewObject.position,
      previewObject.rotation,
    ),
  };
};

const getRoomDataSignature = (roomData: RoomData) => JSON.stringify(roomData);

interface AppShellProps {
  initialViewer: Viewer | null;
  initialProject: EditorProject | null;
  openCoverCaptureOnLoad?: boolean;
  returnToPath?: string | null;
  startInDraftSession?: boolean;
}

type PendingProjectAction =
  | { kind: "close-project" }
  | { kind: "new-project" }
  | { kind: "open-project"; projectId: string }
  | { kind: "logout" };

export function AppShell({
  initialViewer,
  initialProject,
  openCoverCaptureOnLoad = false,
  returnToPath = null,
  startInDraftSession = false,
}: AppShellProps) {
  const router = useRouter();
  const locale = useUIStore((state) => state.locale);
  const accountCopy = getAccountCopy(locale);
  const setLocale = useUIStore((state) => state.setLocale);
  const selectedStructure = useUIStore((state) => state.selectedStructure);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const setActiveSidebarTab = useUIStore((state) => state.setActiveSidebarTab);
  const setSelectedStructure = useUIStore((state) => state.setSelectedStructure);
  const multiSelectMenu = useUIStore((state) => state.multiSelectMenu);
  const setMultiSelectMenu = useUIStore((state) => state.setMultiSelectMenu);
  const roomData = useRoomStore((state) => state.roomData);
  const loadRoomData = useRoomStore((state) => state.loadRoomData);
  const resetRoom = useRoomStore((state) => state.resetRoom);
  const saveRoomSnapshot = useRoomStore((state) => state.saveRoomSnapshot);
  const selectedObjectId = useRoomStore((state) => state.selectedObjectId);
  const selectedObjectIds = useRoomStore((state) => state.selectedObjectIds);
  const selectedGroupId = useRoomStore((state) => state.selectedGroupId);
  const addObjectFromTemplate = useRoomStore((state) => state.addObjectFromTemplate);
  const lastEditorStatus = useRoomStore((state) => state.lastEditorStatus);
  const groupSelectedObjects = useRoomStore((state) => state.groupSelectedObjects);
  const ungroupSelectedObjects = useRoomStore((state) => state.ungroupSelectedObjects);
  const randomizeSelectedObjects = useRoomStore((state) => state.randomizeSelectedObjects);
  const deleteSelectedObjects = useRoomStore((state) => state.deleteSelectedObjects);
  const toggleSelectedObjectsLock = useRoomStore((state) => state.toggleSelectedObjectsLock);
  const initialProjectSummary = useMemo(
    () => toProjectSummary(initialProject),
    [initialProject],
  );

  const [panelsHidden, setPanelsHidden] = useState(false);
  const [viewerOverride, setViewerOverride] = useState<Viewer | null | undefined>(
    undefined,
  );
  const [activeProject, setActiveProject] = useState<ProjectSummary | null | undefined>(
    undefined,
  );
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [accountWorkspaceOpen, setAccountWorkspaceOpen] = useState(false);
  const [accountWorkspaceTab, setAccountWorkspaceTab] =
    useState<AccountWorkspaceTab>("register");
  const [accountWorkspaceDraft, setAccountWorkspaceDraft] =
    useState<ProjectDraftPayload | null>(null);
  const [accountWorkspaceProjects, setAccountWorkspaceProjects] = useState<
    ProjectSummary[] | undefined
  >(undefined);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [logoutSubmitting, setLogoutSubmitting] = useState(false);
  const [coverCaptureMode, setCoverCaptureMode] = useState(openCoverCaptureOnLoad);
  const [coverCaptureContext, setCoverCaptureContext] = useState<
    "save-dialog" | "project-route" | null
  >(openCoverCaptureOnLoad ? "project-route" : null);
  const [coverCaptureResetToken, setCoverCaptureResetToken] = useState(0);
  const [coverSelection, setCoverSelection] = useState<{
    ownerKey: string;
    value: string | null;
  }>({
    ownerKey: initialProject?.id ?? "__draft__",
    value: initialProject?.coverImageDataUrl ?? null,
  });
  const [toast, setToast] = useState<{
    id: number;
    title: string;
    detail?: string;
    tone?: EditorToast["tone"];
  } | null>(null);
  const [savedRoomSignature, setSavedRoomSignature] = useState(() =>
    getRoomDataSignature(initialProject?.roomData ?? roomData),
  );
  const [savedCoverImageDataUrl, setSavedCoverImageDataUrl] = useState<string | null>(
    initialProject?.coverImageDataUrl ?? null,
  );
  const [unsavedAction, setUnsavedAction] = useState<PendingProjectAction | null>(null);
  const [postSaveAction, setPostSaveAction] = useState<PendingProjectAction | null>(null);
  const roomDataRef = useRef(roomData);
  const loadedProjectIdRef = useRef<string | null>(initialProject?.id ?? null);
  const toastTimeoutRef = useRef<number | null>(null);
  const activeInventoryDragTemplateIdRef = useRef<string | null>(null);
  const viewportRoomPositionResolverRef =
    useRef<ViewportRoomPositionResolver | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreviewState>(emptyDragPreview);
  const roomDataSignature = useMemo(() => getRoomDataSignature(roomData), [roomData]);
  const selectedIdsSet = useMemo(
    () => new Set(selectedObjectIds),
    [selectedObjectIds],
  );
  const currentProjectSummary =
    activeProject === undefined ? initialProjectSummary : activeProject;
  const currentProject = useMemo<EditorProject | null>(() => {
    if (currentProjectSummary) {
      return {
        ...currentProjectSummary,
        roomData,
      };
    }

    return null;
  }, [currentProjectSummary, roomData]);
  const activeProjectId = currentProject?.id ?? null;
  const activeProjectKey = activeProjectId ?? "__draft__";
  const selectedWholeGroup = useMemo(
    () =>
      roomData.groups?.find(
        (group) =>
          group.objectIds.length === selectedObjectIds.length &&
          group.objectIds.every((objectId) => selectedIdsSet.has(objectId)),
      ) ?? null,
    [roomData.groups, selectedIdsSet, selectedObjectIds.length],
  );
  const selectedObjects = useMemo(
    () =>
      roomData.objects.filter((object) => selectedObjectIds.includes(object.id)),
    [roomData.objects, selectedObjectIds],
  );
  const allSelectedObjectsLocked =
    selectedObjects.length > 0 && selectedObjects.every((object) => object.locked);
  const selectionLockLabel = allSelectedObjectsLocked
    ? t(locale, "unlockSelection")
    : t(locale, "lockSelection");
  const SelectionLockIcon = allSelectedObjectsLocked ? Unlock : Lock;
  const shouldShowUngroup = Boolean(selectedGroupId || selectedWholeGroup);
  const shouldShowGroup =
    selectedObjectIds.length > 1 && !selectedWholeGroup;
  const dragPreviewObject = useMemo(() => {
    if (!dragPreview.templateId || !dragPreview.position) {
      return null;
    }

    const template = getInventoryTemplateById(dragPreview.templateId);

    if (!template) {
      return null;
    }

    return createPreviewObjectFromTemplate(template, roomData, dragPreview.position);
  }, [dragPreview.position, dragPreview.templateId, roomData]);

  useEffect(() => {
    document.documentElement.lang = locale;
    if (!accountWorkspaceOpen) {
      document.title = t(locale, "appTitle");
    }
  }, [accountWorkspaceOpen, locale]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedLocale = window.localStorage.getItem("desain-locale");
    if (storedLocale === "tr" || storedLocale === "en") {
      setLocale(storedLocale);
    }
  }, [setLocale]);

  useEffect(() => {
    roomDataRef.current = roomData;
  }, [roomData]);

  const setViewportRoomPositionResolver = useCallback(
    (resolver: ViewportRoomPositionResolver | null) => {
      viewportRoomPositionResolverRef.current = resolver;
    },
    [],
  );

  const resolveViewportRoomPosition = useCallback(
    (clientX: number, clientY: number, bounds: DOMRect) =>
      viewportRoomPositionResolverRef.current?.(clientX, clientY, bounds) ??
      getViewportRoomPosition(
        roomData,
        clientX - bounds.left,
        clientY - bounds.top,
        bounds,
      ),
    [roomData],
  );

  useEffect(() => {
    if (initialProject) {
      loadRoomData(initialProject.roomData);
      loadedProjectIdRef.current = initialProject.id;
      return;
    }

    if (loadedProjectIdRef.current) {
      resetRoom("default");
      loadedProjectIdRef.current = null;
    }
  }, [initialProject, loadRoomData, resetRoom]);

  useEffect(() => {
    if (selectedObjectIds.length < 2) {
      setMultiSelectMenu(null);
    }
  }, [selectedObjectIds.length, setMultiSelectMenu]);

  useEffect(() => {
    const handleDragStart = (event: Event) => {
      activeInventoryDragTemplateIdRef.current =
        (event as CustomEvent<string>).detail ?? null;
    };
    const handleDragEnd = () => {
      activeInventoryDragTemplateIdRef.current = null;
      setDragPreview(emptyDragPreview);
    };

    window.addEventListener("desain:inventory-drag-start", handleDragStart);
    window.addEventListener("desain:inventory-drag-end", handleDragEnd);

    return () => {
      window.removeEventListener("desain:inventory-drag-start", handleDragStart);
      window.removeEventListener("desain:inventory-drag-end", handleDragEnd);
    };
  }, []);

  const showToast = useCallback((nextToast: {
    title: string;
    detail?: string;
    tone?: EditorToast["tone"];
  }) => {
    const id = Date.now();

    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }

    setToast({ id, ...nextToast });
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
      toastTimeoutRef.current = null;
    }, 2800);
  }, []);

  useEffect(() => {
    if (lastEditorStatus.key === "selectionUpdated" && selectedStructure) {
      return;
    }

    const nextToast = buildEditorStatusToast({
      locale,
      status: lastEditorStatus,
      roomData: roomDataRef.current,
      selectedObjectId,
      selectedObjectIds,
      selectedGroupId,
      selectedStructure,
    });

    if (!nextToast) {
      return;
    }

    showToast(nextToast);
  }, [
    lastEditorStatus,
    locale,
    selectedObjectId,
    selectedObjectIds,
    selectedGroupId,
    selectedStructure,
    showToast,
  ]);

  useEffect(() => {
    const nextToast = buildStructureToast({
      locale,
      roomData: roomDataRef.current,
      selectedStructure,
    });

    if (!nextToast) {
      return;
    }

    showToast(nextToast);
  }, [locale, selectedStructure, showToast]);

  const captureScreenshot = () => {
    const canvas = document.querySelector<HTMLCanvasElement>(".room-canvas canvas");

    if (!canvas) {
      return;
    }

    const link = document.createElement("a");
    link.download = `desain-room-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    showToast({ title: t(locale, "captureScreenshot"), tone: "success" });
  };

  const captureViewportImageDataUrl = useCallback(() => {
    const canvas = document.querySelector<HTMLCanvasElement>(".room-canvas canvas");

    if (!canvas) {
      throw new Error(accountCopy.viewportNotReady);
    }

    return canvas.toDataURL("image/png");
  }, [accountCopy.viewportNotReady]);

  const buildDefaultProjectName = useCallback(() => {
    const roomLabel = getLocalizedRoomLabel(locale, roomDataRef.current.room);
    return `${roomLabel} ${locale === "en" ? "Project" : "Projesi"}`;
  }, [locale]);

  const buildProjectDraft = useCallback(
    (coverImageDataUrl: string | null) => ({
      name: currentProject?.name ?? buildDefaultProjectName(),
      description: currentProject?.description ?? "",
      coverImageDataUrl,
      roomData: roomDataRef.current,
    }),
    [buildDefaultProjectName, currentProject],
  );
  const effectiveCoverImageDataUrl =
    coverSelection.ownerKey === activeProjectKey
      ? coverSelection.value
      : currentProject?.coverImageDataUrl ?? null;
  const viewer = viewerOverride === undefined ? initialViewer : viewerOverride;
  const projectSessionActive = Boolean(currentProject || startInDraftSession);
  const hasUnsavedChanges =
    roomDataSignature !== savedRoomSignature ||
    effectiveCoverImageDataUrl !== savedCoverImageDataUrl;

  useEffect(() => {
    if (typeof window === "undefined" || !hasUnsavedChanges) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const navigateToEditor = useCallback(
    (href: string, options?: { replace?: boolean }) => {
      setAccountWorkspaceOpen(false);
      setAccountWorkspaceDraft(null);
      setAccountWorkspaceProjects(undefined);
      setPostSaveAction(null);
      setUnsavedAction(null);

      if (typeof window !== "undefined") {
        if (options?.replace) {
          window.location.replace(href);
          return;
        }

        window.location.assign(href);
        return;
      }

      if (options?.replace) {
        router.replace(href, { scroll: false });
        return;
      }

      router.push(href, { scroll: false });
    },
    [router],
  );

  const closeActiveProjectSession = useCallback(() => {
    setActiveProject(null);
    setSaveDialogOpen(false);
    setCoverCaptureMode(false);
    setCoverCaptureContext(null);
    setCoverSelection({
      ownerKey: "__draft__",
      value: null,
    });
    setSavedCoverImageDataUrl(null);
    setPanelsHidden(false);
    loadedProjectIdRef.current = null;
    setSelectedStructure(null);
    resetRoom("default");
    setSavedRoomSignature(getRoomDataSignature(useRoomStore.getState().roomData));
  }, [resetRoom, setSelectedStructure]);

  const performLogout = useCallback(async () => {
    setLogoutSubmitting(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });
      const json = (await response.json()) as { ok: boolean; message?: string };

      if (!response.ok || !json.ok) {
        throw new Error(
          localizeApiMessage(json.message, locale) ?? accountCopy.networkError,
        );
      }

      setViewerOverride(null);
      setActiveProject(null);
      setLogoutConfirmOpen(false);
      setAccountWorkspaceOpen(false);
      setAccountWorkspaceDraft(null);
      setAccountWorkspaceProjects(undefined);
      setCoverCaptureMode(false);
      setCoverCaptureContext(null);
      setCoverSelection({
        ownerKey: "__draft__",
        value: null,
      });
      loadedProjectIdRef.current = null;
      setPanelsHidden(false);
      resetRoom("default");

      if (typeof window !== "undefined") {
        window.location.replace("/");
        return;
      }

      router.replace("/", { scroll: false });
    } catch (error) {
      showToast({
        title: accountCopy.logout,
        detail:
          error instanceof Error
            ? localizeApiMessage(error.message, locale) ?? error.message
            : accountCopy.networkError,
        tone: "warning",
      });
    } finally {
      setLogoutSubmitting(false);
    }
  }, [accountCopy.logout, accountCopy.networkError, locale, resetRoom, router, showToast]);

  const executePendingProjectAction = useCallback(
    (action: PendingProjectAction) => {
      setUnsavedAction(null);
      setPostSaveAction(null);

      if (action.kind === "open-project") {
        navigateToEditor(`/?projectId=${encodeURIComponent(action.projectId)}`);
        return;
      }

      if (action.kind === "new-project") {
        navigateToEditor("/?draft=1");
        return;
      }

      if (action.kind === "close-project") {
        closeActiveProjectSession();
        navigateToEditor(viewer ? "/projelerim" : "/", { replace: true });
        return;
      }

      void performLogout();
    },
    [closeActiveProjectSession, navigateToEditor, performLogout, viewer],
  );

  const handleSaveProjectRequest = useCallback(() => {
    let nextCover = effectiveCoverImageDataUrl;

    if (!nextCover) {
      try {
        nextCover = currentProject?.coverImageDataUrl ?? captureViewportImageDataUrl();
      } catch {
        nextCover = currentProject?.coverImageDataUrl ?? null;
      }
    }

    setCoverSelection({
      ownerKey: activeProjectKey,
      value: nextCover,
    });

    if (!viewer) {
      setAccountWorkspaceDraft(buildProjectDraft(nextCover));
      setAccountWorkspaceTab("register");
      setAccountWorkspaceProjects(undefined);
      setAccountWorkspaceOpen(true);
      return;
    }

    setSaveDialogOpen(true);
  }, [
    activeProjectKey,
    buildProjectDraft,
    captureViewportImageDataUrl,
    effectiveCoverImageDataUrl,
    currentProject,
    viewer,
  ]);

  const saveProjectToDatabase = useCallback(
    async ({
      name,
      description,
      coverImageDataUrl,
    }: {
      name: string;
      description: string;
      coverImageDataUrl: string | null;
    }) => {
      const currentProjectId = currentProject?.id;
      const isUpdatingExistingProject = Boolean(currentProjectId);
      const response = await fetch(
        currentProjectId ? `/api/projects/${currentProjectId}` : "/api/projects",
        {
          method: currentProjectId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            description,
            coverImageDataUrl,
            roomData: roomDataRef.current,
          }),
        },
      );
      const json = (await response.json()) as {
        ok: boolean;
        message?: string;
        project?: ProjectSummary;
      };

      if (!response.ok || !json.ok || !json.project) {
        throw new Error(
          localizeApiMessage(json.message, locale) ?? accountCopy.projectSaveFailure,
        );
      }

      saveRoomSnapshot();
      setSaveDialogOpen(false);
      setActiveProject(json.project);
      setSavedRoomSignature(getRoomDataSignature(roomDataRef.current));
      setSavedCoverImageDataUrl(json.project.coverImageDataUrl);
      setCoverSelection({
        ownerKey: json.project.id,
        value: json.project.coverImageDataUrl,
      });
      showToast({
        title: isUpdatingExistingProject
          ? accountCopy.updatedToastTitle
          : accountCopy.savedToastTitle,
        detail: isUpdatingExistingProject
          ? accountCopy.updatedToastDetail(json.project.name)
          : accountCopy.savedToastDetail(json.project.name),
        tone: "success",
      });

      if (postSaveAction) {
        executePendingProjectAction(postSaveAction);
        return;
      }

      if (!currentProjectId || currentProjectId !== json.project.id) {
        router.replace(`/?projectId=${json.project.id}`, { scroll: false });
      }
    },
    [
      accountCopy,
      currentProject,
      executePendingProjectAction,
      locale,
      postSaveAction,
      router,
      saveRoomSnapshot,
      showToast,
    ],
  );

  const handleAccountWorkspaceAuthSuccess = useCallback(
    (payload: { user: Viewer | null; project: ProjectSummary | null }) => {
      setViewerOverride(payload.user);
      setAccountWorkspaceDraft(null);

      if (payload.project) {
        const projectUrl = `/?projectId=${payload.project.id}`;
        setAccountWorkspaceOpen(false);
        setAccountWorkspaceProjects(undefined);
        setActiveProject(payload.project);
        setSavedRoomSignature(getRoomDataSignature(roomDataRef.current));
        setSavedCoverImageDataUrl(payload.project.coverImageDataUrl);
        setCoverSelection({
          ownerKey: payload.project.id,
          value: payload.project.coverImageDataUrl,
        });

        if (postSaveAction) {
          executePendingProjectAction(postSaveAction);
          return;
        }

        showToast({
          title: accountCopy.firstProjectToastTitle,
          detail: accountCopy.firstProjectToastDetail(payload.project.name),
          tone: "success",
        });

        if (typeof window !== "undefined") {
          window.location.replace(projectUrl);
          return;
        }

        router.replace(projectUrl, { scroll: false });
        return;
      }

      if (payload.user) {
        setAccountWorkspaceOpen(false);
        setAccountWorkspaceProjects(undefined);
        navigateToEditor("/projelerim", { replace: true });
      }
    },
    [
      accountCopy,
      executePendingProjectAction,
      navigateToEditor,
      postSaveAction,
      router,
      showToast,
    ],
  );

  const handleStartCoverCaptureFromSaveDialog = useCallback(() => {
    setSaveDialogOpen(false);
    setCoverCaptureContext("save-dialog");
    setCoverCaptureMode(true);
  }, []);

  const handleCoverCapture = useCallback(async () => {
    const dataUrl = captureViewportImageDataUrl();
    const projectRouteReturnPath = `${returnToPath ?? "/projelerim"}?flash=cover-updated`;

    if (coverCaptureContext === "save-dialog") {
      setCoverSelection({
        ownerKey: activeProjectKey,
        value: dataUrl,
      });
      setCoverCaptureMode(false);
      setCoverCaptureContext(null);
      setSaveDialogOpen(true);
      return;
    }

    if (coverCaptureContext === "project-route" && activeProjectId) {
      const response = await fetch(`/api/projects/${activeProjectId}/cover`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coverImageDataUrl: dataUrl,
        }),
      });
      const json = (await response.json()) as {
        ok: boolean;
        message?: string;
        project?: ProjectSummary;
      };

      if (!response.ok || !json.ok) {
        throw new Error(
          localizeApiMessage(json.message, locale) ?? accountCopy.coverUpdateFailure,
        );
      }

      if (json.project) {
        setActiveProject(json.project);
      }

      setCoverCaptureMode(false);
      setCoverCaptureContext(null);
      if (typeof window !== "undefined") {
        window.location.replace(projectRouteReturnPath);
        return;
      }

      router.replace(projectRouteReturnPath, { scroll: false });
      return;
    }

    setCoverCaptureMode(false);
    setCoverCaptureContext(null);
  }, [
    activeProjectKey,
    activeProjectId,
    captureViewportImageDataUrl,
    coverCaptureContext,
    accountCopy.coverUpdateFailure,
    locale,
    returnToPath,
    router,
  ]);

  const togglePanels = () => {
    setPanelsHidden((current) => {
      const next = !current;
      showToast({
        title: t(locale, next ? "hidePanels" : "showPanels"),
        tone: "info",
      });
      return next;
    });
  };

  const openAccountWorkspace = useCallback(
    async (tab: AccountWorkspaceTab, draft: ProjectDraftPayload | null = null) => {
      setAccountWorkspaceDraft(draft);
      setAccountWorkspaceTab(tab);

      if (viewer && (tab === "projects" || tab === "profile")) {
        try {
          const response = await fetch("/api/projects", {
            method: "GET",
            headers: {
              "Cache-Control": "no-store",
            },
          });
          const json = (await response.json()) as {
            ok: boolean;
            message?: string;
            projects?: ProjectSummary[];
          };

          if (!response.ok || !json.ok) {
            throw new Error(
              localizeApiMessage(json.message, locale) ?? accountCopy.projectsLoadError,
            );
          }

          setAccountWorkspaceProjects(json.projects ?? []);
        } catch (error) {
          setAccountWorkspaceProjects([]);
          showToast({
            title: accountCopy.projectsLoadError,
            detail:
              error instanceof Error
                ? localizeApiMessage(error.message, locale) ?? error.message
                : accountCopy.retry,
            tone: "warning",
          });
        }
      } else {
        setAccountWorkspaceProjects(undefined);
      }

      setAccountWorkspaceOpen(true);
    },
    [accountCopy.projectsLoadError, accountCopy.retry, locale, showToast, viewer],
  );

  const closeAccountWorkspace = useCallback(() => {
    setAccountWorkspaceOpen(false);
    setPostSaveAction(null);
    if (!viewer) {
      setAccountWorkspaceDraft(null);
    }
  }, [viewer]);

  const requestEditorAction = useCallback(
    (action: PendingProjectAction) => {
      if (hasUnsavedChanges) {
        setUnsavedAction(action);
        return;
      }

      executePendingProjectAction(action);
    },
    [executePendingProjectAction, hasUnsavedChanges],
  );

  const handleProjectActivated = useCallback(
    (projectId: string) => {
      requestEditorAction({ kind: "open-project", projectId });
    },
    [requestEditorAction],
  );

  const handleCreateProject = useCallback(() => {
    requestEditorAction({ kind: "new-project" });
  }, [requestEditorAction]);

  const handleCloseProject = useCallback(() => {
    requestEditorAction({ kind: "close-project" });
  }, [requestEditorAction]);

  const handleLogoutRequest = useCallback(() => {
    if (hasUnsavedChanges) {
      setUnsavedAction({ kind: "logout" });
      return;
    }

    setLogoutConfirmOpen(true);
  }, [hasUnsavedChanges]);

  if (isMobile) {
    return <MobileDesktopNotice locale={locale} />;
  }

  const effectivePanelsHidden = panelsHidden || coverCaptureMode;
  const currentProjectName = currentProject?.name ?? null;
  const saveActionLabel = currentProject ? accountCopy.saveChanges : accountCopy.createProject;
  const unsavedActionBody =
    unsavedAction?.kind === "close-project"
      ? accountCopy.unsavedCloseProjectBody(currentProjectName)
      : unsavedAction?.kind === "open-project"
        ? accountCopy.unsavedOpenProjectBody(currentProjectName)
        : unsavedAction?.kind === "new-project"
        ? accountCopy.unsavedNewProjectBody(currentProjectName)
        : unsavedAction?.kind === "logout"
          ? accountCopy.unsavedLogoutBody(currentProjectName)
          : null;
  const unsavedDiscardLabel =
    unsavedAction?.kind === "close-project"
      ? accountCopy.closeWithoutSaving
      : accountCopy.continueWithoutSaving;
  const unsavedSaveLabel =
    unsavedAction?.kind === "close-project"
      ? viewer
        ? accountCopy.saveAndClose
        : accountCopy.signInSaveAndClose
      : viewer
        ? accountCopy.saveAndContinue
        : accountCopy.signInAndSave;

  return (
    <main className="h-dvh overflow-hidden px-3 py-3 md:px-4 md:py-4">
      <EditorHotkeys />
      {accountWorkspaceOpen ? (
        <AccountWorkspace
          variant="overlay"
          initialViewer={viewer}
          initialProjects={accountWorkspaceProjects}
          initialTab={accountWorkspaceTab}
          currentProjectName={currentProjectName}
          currentProjectId={activeProjectId}
          draftProject={accountWorkspaceDraft}
          onClose={closeAccountWorkspace}
          onViewerChange={(nextViewer) => setViewerOverride(nextViewer)}
          onAuthSuccess={handleAccountWorkspaceAuthSuccess}
          onProjectActivated={handleProjectActivated}
          onCreateProject={handleCreateProject}
        />
      ) : null}
      <ProjectSaveDialog
        key={`${activeProjectKey}:${saveDialogOpen ? "open" : "closed"}`}
        open={saveDialogOpen}
        currentProject={currentProject}
        initialCoverImageDataUrl={effectiveCoverImageDataUrl}
        onClose={() => {
          setSaveDialogOpen(false);
          setPostSaveAction(null);
        }}
        onCaptureCover={handleStartCoverCaptureFromSaveDialog}
        onSave={saveProjectToDatabase}
      />
      <CoverCaptureOverlay
        open={coverCaptureMode}
        onResetView={() => setCoverCaptureResetToken((current) => current + 1)}
        onCapture={() => {
          void handleCoverCapture().catch((error: unknown) => {
            showToast({
              title: accountCopy.coverCreateFailure,
              detail:
                error instanceof Error
                  ? localizeApiMessage(error.message, locale) ?? error.message
                  : accountCopy.retry,
              tone: "warning",
            });
          });
        }}
        onClose={() => {
          setCoverCaptureMode(false);
          const nextContext = coverCaptureContext;
          setCoverCaptureContext(null);
          if (nextContext === "save-dialog") {
            setSaveDialogOpen(true);
            return;
          }
          if (nextContext === "project-route" && activeProjectId) {
            if (typeof window !== "undefined") {
              window.location.replace(returnToPath ?? "/projelerim");
              return;
            }

            router.replace(returnToPath ?? "/projelerim", { scroll: false });
          }
        }}
      />
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1820px] flex-col gap-3 md:gap-4">
        {coverCaptureMode ? null : (
          <AccountBar
            viewer={viewer}
            currentProjectName={currentProjectName}
            projectSessionActive={projectSessionActive}
            onOpenProjects={() => openAccountWorkspace("projects")}
            onOpenProfile={() => openAccountWorkspace("profile")}
            onOpenLogin={() => openAccountWorkspace("login")}
            onOpenRegister={() => openAccountWorkspace("register")}
            onRequestLogout={handleLogoutRequest}
            onRequestCloseProject={handleCloseProject}
          />
        )}
        {coverCaptureMode ? null : (
          <Topbar
            panelsHidden={panelsHidden}
            onTogglePanels={togglePanels}
            onCaptureScreenshot={captureScreenshot}
            onRequestSaveProject={handleSaveProjectRequest}
            canSaveProject={Boolean(viewer)}
            saveActionLabel={saveActionLabel}
          />
        )}

        <section
          className={`grid min-h-0 flex-1 gap-4 ${
            effectivePanelsHidden
              ? "grid-cols-1"
              : "grid-rows-[minmax(320px,44vh)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1fr)_560px] xl:grid-rows-none"
          }`}
        >
          <div
              className="editor-panel room-canvas relative h-full min-h-0 overflow-hidden p-0"
              onDragOver={(event) => {
                const templateId =
                  activeInventoryDragTemplateIdRef.current ||
                  event.dataTransfer.getData(INVENTORY_DRAG_MIME) ||
                  event.dataTransfer.getData("text/plain");

                if (!templateId) {
                  return;
                }

                const bounds = event.currentTarget.getBoundingClientRect();
                const pointerX = event.clientX - bounds.left;
                const pointerY = event.clientY - bounds.top;
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
                setDragPreview({
                  templateId,
                  x: pointerX,
                  y: pointerY,
                  position: resolveViewportRoomPosition(
                    event.clientX,
                    event.clientY,
                    bounds,
                  ),
                });
              }}
              onDragLeave={(event) => {
                const bounds = event.currentTarget.getBoundingClientRect();
                const outside =
                  event.clientX <= bounds.left ||
                  event.clientX >= bounds.right ||
                  event.clientY <= bounds.top ||
                  event.clientY >= bounds.bottom;

                if (outside) {
                  setDragPreview(emptyDragPreview);
                }
              }}
              onDrop={(event) => {
                const templateId =
                  activeInventoryDragTemplateIdRef.current ||
                  event.dataTransfer.getData(INVENTORY_DRAG_MIME) ||
                  event.dataTransfer.getData("text/plain");

                if (!templateId) {
                  return;
                }

                event.preventDefault();

                const bounds = event.currentTarget.getBoundingClientRect();
                const position = resolveViewportRoomPosition(
                  event.clientX,
                  event.clientY,
                  bounds,
                );
                activeInventoryDragTemplateIdRef.current = null;
                setDragPreview(emptyDragPreview);

                const added = addObjectFromTemplate(templateId, position);

                if (added?.type === "wall") {
                  setSelectedStructure({ type: "wall", id: added.id });
                } else {
                  setSelectedStructure(null);
                }

                setActiveSidebarTab("details");
              }}
            >
            <div className="viewport-grid absolute inset-0 opacity-55" />
            {!coverCaptureMode && multiSelectMenu && selectedObjectIds.length > 1 ? (
              <div
                className="fixed z-50 w-56 rounded-xl border border-white/10 bg-[#0d141d]/96 p-2 text-xs font-semibold text-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.42)] backdrop-blur"
                style={{
                  left: Math.min(multiSelectMenu.x, window.innerWidth - 260),
                  top: Math.min(multiSelectMenu.y, window.innerHeight - 260),
                }}
              >
                <div className="px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8cb9ff]">
                  {`${selectedObjectIds.length} ${t(locale, "selectedItems")}`}
                </div>
                {shouldShowGroup ? (
                  <button
                    type="button"
                    onClick={() => {
                      groupSelectedObjects();
                      setMultiSelectMenu(null);
                      setActiveSidebarTab("outliner");
                    }}
                    className="flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-left transition hover:bg-white/8 hover:text-white"
                  >
                    <Boxes className="h-3.5 w-3.5 text-[#8cb9ff]" />
                    {t(locale, "groupSelection")}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    randomizeSelectedObjects();
                    setMultiSelectMenu(null);
                  }}
                  className="flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-left transition hover:bg-white/8 hover:text-white"
                >
                  <Shuffle className="h-3.5 w-3.5 text-[#8cb9ff]" />
                  {t(locale, "randomizeSelection")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    toggleSelectedObjectsLock();
                    setMultiSelectMenu(null);
                  }}
                  className="flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-left transition hover:bg-white/8 hover:text-white"
                >
                  <SelectionLockIcon className="h-3.5 w-3.5 text-[#8cb9ff]" />
                  {selectionLockLabel}
                </button>
                {shouldShowUngroup ? (
                  <button
                    type="button"
                    onClick={() => {
                      ungroupSelectedObjects();
                      setMultiSelectMenu(null);
                    }}
                    className="flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-left transition hover:bg-white/8 hover:text-white"
                  >
                    <Ungroup className="h-3.5 w-3.5 text-[#8cb9ff]" />
                    {t(locale, "ungroup")}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    deleteSelectedObjects();
                    setMultiSelectMenu(null);
                  }}
                  className="flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-left text-[#ff9b9b] transition hover:bg-[#2a1313] hover:text-white"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t(locale, "deleteSelection")}
                </button>
              </div>
            ) : null}
            {coverCaptureMode ? null : <ViewportHud />}
            <div className="h-full">
              <RoomScene
                previewObject={dragPreviewObject}
                presentationMode={coverCaptureMode}
                cameraResetToken={coverCaptureResetToken}
                onViewportRoomPositionResolverChange={setViewportRoomPositionResolver}
              />
            </div>
          </div>

          {effectivePanelsHidden ? null : <Sidebar />}
        </section>
      </div>
      {toast ? (
        <div
          className={`fixed bottom-4 right-4 z-50 w-[min(420px,calc(100vw-2rem))] rounded-2xl border px-4 py-3 shadow-[0_18px_45px_rgba(0,0,0,0.38)] backdrop-blur ${
            toast.tone === "success"
              ? "border-[#1f6b45] bg-[#102416]/96 text-[#d7f7e6]"
              : toast.tone === "warning"
                ? "border-[#6d4a29] bg-[#25180f]/96 text-[#f5c28b]"
                : "border-[#24405a] bg-[#102234]/96 text-[#dbeafe]"
          }`}
        >
          <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/60">
            desAIn
          </div>
          <div className="mt-1 text-sm font-semibold text-white">{toast.title}</div>
          {toast.detail ? (
            <div className="mt-1 text-sm leading-6 text-white/80">{toast.detail}</div>
          ) : null}
        </div>
      ) : null}
      {unsavedAction && unsavedActionBody ? (
        <div className="fixed inset-0 z-[168] flex items-center justify-center bg-[#03070bcc] px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[1.6rem] border border-white/10 bg-[#0c131b] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.5)]">
            <h3 className="text-xl font-semibold text-white">
              {accountCopy.unsavedChangesTitle}
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {unsavedActionBody}
            </p>
            <div className="mt-3 rounded-2xl border border-[#6d4a29] bg-[#25180f] px-4 py-3 text-sm leading-6 text-[#f5c28b]">
              {accountCopy.unsavedChangesHint}
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setUnsavedAction(null)}
                className="inline-flex h-11 items-center rounded-full border border-white/10 bg-[#0f1720] px-4 text-sm font-semibold text-slate-300 transition hover:border-[#32516c] hover:text-white"
              >
                {accountCopy.stayHere}
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextAction = unsavedAction;
                  if (!nextAction) {
                    return;
                  }

                  executePendingProjectAction(nextAction);
                }}
                className="inline-flex h-11 items-center rounded-full border border-white/10 bg-[#151d28] px-4 text-sm font-semibold text-slate-200 transition hover:border-[#32516c] hover:text-white"
              >
                {unsavedDiscardLabel}
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextAction = unsavedAction;
                  if (!nextAction) {
                    return;
                  }

                  setPostSaveAction(nextAction);
                  setUnsavedAction(null);
                  handleSaveProjectRequest();
                }}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-[#4ea8ff] bg-[#102234] px-4 text-sm font-semibold text-white transition hover:border-[#76beff]"
              >
                {unsavedSaveLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {logoutConfirmOpen ? (
        <div className="fixed inset-0 z-[170] flex items-center justify-center bg-[#03070bcc] px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.6rem] border border-white/10 bg-[#0c131b] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.5)]">
            <h3 className="text-xl font-semibold text-white">
              {accountCopy.logoutConfirmTitle}
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {accountCopy.logoutConfirmBody}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setLogoutConfirmOpen(false)}
                className="inline-flex h-11 items-center rounded-full border border-white/10 bg-[#0f1720] px-4 text-sm font-semibold text-slate-300 transition hover:border-[#32516c] hover:text-white"
              >
                {accountCopy.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  void performLogout();
                }}
                disabled={logoutSubmitting}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-[#4ea8ff] bg-[#102234] px-4 text-sm font-semibold text-white transition hover:border-[#76beff] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {logoutSubmitting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : null}
                {accountCopy.logoutConfirmAction}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
