"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  FolderPlus,
  ImagePlus,
  Loader2,
  MessageSquare,
  MoreVertical,
  Pencil,
  Send,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { roomDraftSchema, type RoomDraft } from "@/lib/ai/roomDraft";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import {
  clearRuntimeInventoryTemplates,
  type DiscoveredInventoryInput,
  setRuntimeInventoryTemplates,
} from "@/lib/room/runtimeInventoryCatalog";
import {
  getLocalizedObjectLabel,
  getLocalizedOpeningType,
} from "@/lib/i18n/translations";
import { formatSemanticPosition, getSemanticObjectPosition } from "@/lib/scene/axes";
import { MAX_PROJECT_CHAT_TURNS, PROJECT_PHOTO_COUNT } from "@/lib/project/workflowLimits";
import { useRoomStore } from "@/store/roomStore";
import { useProjectStore, withProjectClientHeaders } from "@/store/projectStore";
import { useUIStore } from "@/store/uiStore";
import type { ProjectMeta } from "@/types/project";
import type { LayoutResponse, RoomData } from "@/types/room";

const panelClass =
  "editor-panel flex h-full min-h-0 flex-col overflow-hidden";

type ChatCopy = {
  loadingProject: string;
  noProject: string;
  noProjectsYet: string;
  photo: string;
  analyze: string;
  projects: string;
  close: string;
  newProject: string;
  createFirstProject: string;
  projectRequiredTitle: string;
  projectRequiredBody: string;
  selectExistingProject: string;
  photoGuide: string;
  photoGuideIntro: string;
  selectionContext: string;
  projectEmpty: string;
  statusLabel: string;
  lastError: string;
  analysisSummary: string;
  roomShape: string;
  dimensions: string;
  itemCount: string;
  discoveredItems: string;
  notes: string;
  warnings: string;
  captureAdvice: string;
  inventoryAdded: string;
  applyToEditor: string;
  mobileMode: string;
  firstBatchHint: string;
  preUploadTitle: string;
  preUploadBody: string;
  captureChecklist: string;
  selectedPhoto: string;
  cancel: string;
  uploadAndAnalyze: string;
  projectActions: string;
  renameProject: string;
  projectNamePlaceholder: string;
  deleteProject: string;
  deleteBody: string;
  save: string;
  send: string;
  uploadNotice: string;
  uploadFailed: string;
  analyzeFailed: string;
  chatFailed: string;
  uploadLocked: string;
  exactBatchError: string;
  chatLimitReached: string;
  chatTurnStatus: string;
  statusAnalyzing: string;
  statusUploading: string;
  statusError: string;
  statusAnalyzeReady: string;
  statusDraft: string;
  fileLimitError: string;
  firstBatchError: string;
  emptyState: string;
  projectOptions: string;
  sendAriaLabel: string;
};

function getChatCopy(locale: "tr" | "en"): ChatCopy {
  if (locale === "en") {
    return {
      loadingProject: "Loading...",
      noProject: "No project",
      noProjectsYet: "No projects yet.",
      photo: "Photo",
      analyze: "Analyze",
      projects: "Projects",
      close: "Close",
      newProject: "New project",
      createFirstProject: "Create first project",
      projectRequiredTitle: "Create or select a project first",
      projectRequiredBody:
        "The chat, analysis, and photo tools stay hidden until a project exists. Create a project to start the AI workflow.",
      selectExistingProject: "Select an existing project from the menu if you already created one.",
      photoGuide: "Photo guide",
      photoGuideIntro:
        "Scan from the center of the room. Cover every wall, corner, opening, and floor edge in a single 360-degree pass.",
      selectionContext: "Selection context",
      projectEmpty:
        `Create a project, upload exactly ${PROJECT_PHOTO_COUNT} photos once, then the digital twin is generated automatically.`,
      statusLabel: "Status",
      lastError: "Last error",
      analysisSummary: "Analysis summary",
      roomShape: "Room shape",
      dimensions: "Dimensions",
      itemCount: "Item count",
      discoveredItems: "Discovered items",
      notes: "Notes",
      warnings: "Warnings",
      captureAdvice: "Capture advice",
      inventoryAdded: "New inventory items added from analysis",
      applyToEditor: "Apply to editor",
      mobileMode: `Mobile mode: create a project, upload exactly ${PROJECT_PHOTO_COUNT} photos, and watch analysis status. Continue editing and chatting on desktop.`,
      firstBatchHint: `Each project accepts one capture set: exactly ${PROJECT_PHOTO_COUNT} well-lit, wide-angle room photos.`,
      preUploadTitle: "Before upload",
      preUploadBody:
        "Analysis starts after the photos are uploaded, and this project will be locked until it finishes.",
      captureChecklist: "Capture checklist",
      selectedPhoto: "Selected photos",
      cancel: "Cancel",
      uploadAndAnalyze: "Upload and analyze",
      projectActions: "Project actions",
      renameProject: "Rename project",
      projectNamePlaceholder: "Project name",
      deleteProject: "Delete project?",
      deleteBody: "This project will be permanently deleted.",
      save: "Save",
      send: "Send",
      uploadNotice:
        "Photos uploaded. Analysis is starting. This project will be locked until it finishes.",
      uploadFailed: "Upload/analyze failed",
      analyzeFailed: "Analyze failed",
      chatFailed: "Chat failed",
      uploadLocked: `Photos are already uploaded. Each project accepts exactly ${PROJECT_PHOTO_COUNT} photos once.`,
      exactBatchError: `Select exactly ${PROJECT_PHOTO_COUNT} photos for this project.`,
      chatLimitReached: `This project reached the ${MAX_PROJECT_CHAT_TURNS} message limit. Create a new project for more chat.`,
      chatTurnStatus: "Chat usage",
      statusAnalyzing: "Analyzing...",
      statusUploading: "Uploading...",
      statusError: "Error",
      statusAnalyzeReady: "Ready to analyze",
      statusDraft: "Draft",
      fileLimitError: `Select exactly ${PROJECT_PHOTO_COUNT} photos.`,
      firstBatchError: `For this project, select exactly ${PROJECT_PHOTO_COUNT} photos.`,
      emptyState: "Project not found",
      projectOptions: "Project options",
      sendAriaLabel: "Send",
    };
  }

  return {
    loadingProject: "Yükleniyor...",
    noProject: "Proje yok",
    noProjectsYet: "Henüz proje yok.",
    photo: "Fotoğraf",
    analyze: "Analiz",
    projects: "Projeler",
    close: "Kapat",
    newProject: "Yeni proje",
    createFirstProject: "İlk projeyi oluştur",
    projectRequiredTitle: "Önce bir proje oluştur veya seç",
    projectRequiredBody:
      "Bir proje oluşmadan sohbet, analiz ve fotoğraf araçları görünmez. AI akışını başlatmak için önce proje oluştur.",
    selectExistingProject: "Daha önce oluşturduğun bir proje varsa menüden seçebilirsin.",
    photoGuide: "Fotoğraf rehberi",
    photoGuideIntro:
      "Odanın merkezinden tara. Her kare arasında yaklaşık 90 derece dön ve duvarları, açıklıkları, zemin kenarını tek turda kapat.",
    selectionContext: "Seçim bağlamı",
    projectEmpty: `Proje oluştur, tam ${PROJECT_PHOTO_COUNT} fotoğrafı bir kez yükle; dijital ikiz otomatik oluşturulsun.`,
    statusLabel: "Durum",
    lastError: "Son hata",
    analysisSummary: "Analiz özeti",
    roomShape: "Oda şekli",
    dimensions: "Ölçüler",
    itemCount: "Eşya sayısı",
    discoveredItems: "Keşfedilen öğeler",
    notes: "Notlar",
    warnings: "Uyarılar",
    captureAdvice: "Çekim önerileri",
    inventoryAdded: "Envantere eklenen yeni öğeler",
    applyToEditor: "Editöre uygula",
    mobileMode: `Mobil mod: proje oluştur, tam ${PROJECT_PHOTO_COUNT} fotoğraf yükle ve analiz durumunu takip et. Düzenleme ve sohbet için masaüstünden devam et.`,
    firstBatchHint: `Her proje tek çekim seti kabul eder: tam ${PROJECT_PHOTO_COUNT} aydınlık, geniş açılı oda fotoğrafı.`,
    preUploadTitle: "Yükleme öncesi",
    preUploadBody:
      "Fotoğraf yüklendikten sonra analiz başlar ve analiz bitene kadar bu projede işlem yapılamaz.",
    captureChecklist: "Çekim kontrol listesi",
    selectedPhoto: "Seçilen fotoğraflar",
    cancel: "İptal",
    uploadAndAnalyze: "Yükle ve analiz et",
    projectActions: "Proje işlemleri",
    renameProject: "Proje adını değiştir",
    projectNamePlaceholder: "Proje adı",
    deleteProject: "Projeyi sil?",
    deleteBody: "Bu proje kalıcı olarak silinecek.",
    save: "Kaydet",
    send: "Gönder",
    uploadNotice:
      "Fotoğraflar yüklendi. Analiz başlatılıyor. Analiz bitene kadar bu projede işlem yapılamaz.",
    uploadFailed: "Yükleme/analiz başarısız",
    analyzeFailed: "Analiz başarısız",
    chatFailed: "Sohbet başarısız",
    uploadLocked: `Fotoğraflar zaten yüklendi. Her proje yalnızca bir kez, tam ${PROJECT_PHOTO_COUNT} fotoğraf kabul eder.`,
    exactBatchError: `Bu proje için tam ${PROJECT_PHOTO_COUNT} fotoğraf seçmelisin.`,
    chatLimitReached: `Bu proje ${MAX_PROJECT_CHAT_TURNS} sohbet hakkına ulaştı. Daha fazla sohbet için yeni proje oluştur.`,
    chatTurnStatus: "Sohbet kullanımı",
    statusAnalyzing: "Analiz...",
    statusUploading: "Yükleniyor...",
    statusError: "Hata",
    statusAnalyzeReady: "Analize hazır",
    statusDraft: "Taslak",
    fileLimitError: `Tam ${PROJECT_PHOTO_COUNT} fotoğraf seçmelisin.`,
    firstBatchError: `Bu proje için tam ${PROJECT_PHOTO_COUNT} fotoğraf seçmelisin.`,
    emptyState: "Proje bulunamadı",
    projectOptions: "Proje seçenekleri",
    sendAriaLabel: "Gönder",
  };
}

async function jsonFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: withProjectClientHeaders(init?.headers),
  });
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

function formatStatus(meta: ProjectMeta, locale: "tr" | "en") {
  const copy = getChatCopy(locale);
  if (meta.status === "analyzing") return copy.statusAnalyzing;
  if (meta.status === "uploading") return copy.statusUploading;
  if (meta.status === "error") return copy.statusError;
  if (meta.photoCount === PROJECT_PHOTO_COUNT && meta.status === "draft") return copy.statusAnalyzeReady;
  return copy.statusDraft;
}

function summarizeSystemWarnings(warnings: string[]) {
  const filtered = warnings
    .map((warning) => warning.trim())
    .filter(Boolean)
    .filter((warning) => !/^raw:/i.test(warning) && !/^ham:/i.test(warning));

  if (!filtered.length) {
    return null;
  }

  return filtered.slice(0, 2).join(" | ").slice(0, 320);
}

function Bubble({
  role,
  children,
}: {
  role: "user" | "assistant" | "system";
  children: React.ReactNode;
}) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`${
          role === "system" ? "max-w-full" : "max-w-[min(520px,92%)]"
        } rounded-2xl px-3 py-2 text-sm leading-6 break-words whitespace-pre-wrap ${
          isUser
            ? "bg-[#102234] text-[#dbeafe] border border-[#24405a]"
            : role === "system"
              ? "bg-[#25180f] text-[#f5c28b] border border-[#6d4a29] shadow-[0_0_0_1px_rgba(245,194,139,0.06)]"
              : "bg-[#111924] text-slate-200 border border-white/10"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function getPhotoCaptureTips(locale: "tr" | "en") {
  return locale === "en"
    ? [
        `Upload exactly ${PROJECT_PHOTO_COUNT} photos for this project.`,
        "Start in the center and capture a full 360-degree sweep.",
        "Use bright, even lighting and wide angle if available.",
        "Capture every wall, corner, opening, and floor edge.",
        "Add wall-side support shots for large furniture and wall-mounted items.",
      ]
    : [
        `Bu proje için tam ${PROJECT_PHOTO_COUNT} fotoğraf yükle.`,
        "Odanın merkezinden başla ve 360 derece tam tur çek.",
        "Ortamı iyi aydınlat; varsa geniş açı kullan.",
        "Tüm duvarları, köşeleri, açıklıkları ve zemin kenarını görünür çek.",
        "Büyük mobilyalar ve duvar öğeleri için duvar tarafından destek kareleri ekle.",
      ];
}

function buildSelectionSummary(
  locale: "tr" | "en",
  roomData: RoomData,
  selectedObjectId: string | null,
  selectedObjectIds: string[],
  selectedGroupId: string | null,
  selectedStructure: { type: "wall" | "opening"; id: string } | null,
) {
  const parts: string[] = [];
  const selectedObject =
    selectedObjectId
      ? roomData.objects.find((object) => object.id === selectedObjectId) ?? null
      : null;
  const selectedGroup =
    selectedGroupId
      ? roomData.groups?.find((group) => group.id === selectedGroupId) ?? null
      : null;
  const selectedOpening =
    selectedStructure?.type === "opening"
      ? roomData.room.openings.find((opening) => opening.id === selectedStructure.id) ?? null
      : null;

  if (selectedObject) {
    const semanticPosition = getSemanticObjectPosition(selectedObject);
    parts.push(
      `${locale === "en" ? "Selected object" : "Seçili nesne"}: ${getLocalizedObjectLabel(locale, selectedObject)}.`,
    );
    parts.push(
      `${locale === "en" ? "Position" : "Konum"}: ${formatSemanticPosition(semanticPosition)}, rot=${Math.round(selectedObject.rotation)}.`,
    );
  }

  if (selectedObjectIds.length > 1) {
    parts.push(
      `${locale === "en" ? "Selected items" : "Seçili öğeler"}: ${selectedObjectIds.length}.`,
    );
  }

  if (selectedGroup) {
    parts.push(
      `${locale === "en" ? "Selected group" : "Seçili grup"}: ${selectedGroup.label}.`,
    );
  }

  if (selectedStructure?.type === "wall") {
    const wallIndex = roomData.room.walls.findIndex((wall) => wall.id === selectedStructure.id);
    parts.push(
      `${locale === "en" ? "Selected structure" : "Seçili yapı"}: ${
        wallIndex >= 0 ? `${locale === "en" ? "Wall" : "Duvar"} ${wallIndex + 1}` : selectedStructure.id
      }.`,
    );
  } else if (selectedOpening) {
    parts.push(
      `${locale === "en" ? "Selected structure" : "Seçili yapı"}: ${getLocalizedOpeningType(locale, selectedOpening.type)}.`,
    );
  }

  return parts.join(" ");
}

export function AiChatPanel() {
  const setWorkspaceMode = useUIStore((s) => s.setWorkspaceMode);
  const locale = useUIStore((s) => s.locale);
  const selectedStructure = useUIStore((s) => s.selectedStructure);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const roomData = useRoomStore((s) => s.roomData);
  const selectedObjectId = useRoomStore((s) => s.selectedObjectId);
  const selectedObjectIds = useRoomStore((s) => s.selectedObjectIds);
  const selectedGroupId = useRoomStore((s) => s.selectedGroupId);
  const updateRoomProperties = useRoomStore((s) => s.updateRoomProperties);
  const addObjectFromTemplate = useRoomStore((s) => s.addObjectFromTemplate);
  const updateObjectProperties = useRoomStore((s) => s.updateObjectProperties);
  const applyLayoutResponse = useRoomStore((s) => s.applyLayoutResponse);
  const loadRoomData = useRoomStore((s) => s.loadRoomData);

  const initProjects = useProjectStore((s) => s.init);
  const projects = useProjectStore((s) => s.projects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const activeProject = useProjectStore((s) => s.activeProject);
  const projectsLoading = useProjectStore((s) => s.loading);
  const projectsBusy = useProjectStore((s) => s.busy);
  const storeError = useProjectStore((s) => s.error);
  const loadProjectById = useProjectStore((s) => s.loadProjectById);
  const createProject = useProjectStore((s) => s.createProject);
  const renameProject = useProjectStore((s) => s.renameProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);

  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [warningOpen, setWarningOpen] = useState(false);
  const [systemNotice, setSystemNotice] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [actionProjectId, setActionProjectId] = useState<string | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [composerText, setComposerText] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const meta = activeProject?.meta ?? null;
  const hasActiveProject = Boolean(activeProjectId && meta);
  const locked = meta?.status === "uploading" || meta?.status === "analyzing";
  const photosAlreadyUploaded = (meta?.photoCount ?? 0) > 0;
  const canAnalyze = Boolean(
    meta &&
      meta.photoCount === PROJECT_PHOTO_COUNT &&
      meta.status !== "uploading" &&
      meta.status !== "analyzing",
  );
  const chatTurnCount = activeProject?.messages.filter((message) => message.role === "user").length ?? 0;
  const chatLimitReached = chatTurnCount >= MAX_PROJECT_CHAT_TURNS;
  const loading = projectsLoading;
  const error = localError ?? storeError;
  const anyBusy = busy || projectsBusy;
  const uploadDisabled = photosAlreadyUploaded || anyBusy || locked;
  const copy = useMemo(() => getChatCopy(locale), [locale]);

  const analysis = activeProject?.analysis;
  const parsedDraft: RoomDraft | null = useMemo(() => {
    if (!analysis) return null;
    const parsed = roomDraftSchema.safeParse(analysis);
    return parsed.success ? parsed.data : null;
  }, [analysis]);

  const selectedObject = useMemo(
    () =>
      selectedObjectId
        ? roomData.objects.find((object) => object.id === selectedObjectId) ?? null
        : null,
    [roomData.objects, selectedObjectId],
  );

  const selectionSummary = useMemo(
    () =>
      buildSelectionSummary(
        locale,
        roomData,
        selectedObjectId,
        selectedObjectIds,
        selectedGroupId,
        selectedStructure,
      ),
    [locale, roomData, selectedGroupId, selectedObjectId, selectedObjectIds, selectedStructure],
  );

  const captureTips = useMemo(() => getPhotoCaptureTips(locale), [locale]);
  const selectedObjectLabel = selectedObject
    ? getLocalizedObjectLabel(locale, selectedObject)
    : null;
  const selectionPayload = useMemo(
    () => ({
      objectId: selectedObjectId,
      objectIds: selectedObjectIds,
      groupId: selectedGroupId,
      structure: selectedStructure,
    }),
    [selectedGroupId, selectedObjectId, selectedObjectIds, selectedStructure],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [activeProject?.messages.length, busy, loading]);

  useEffect(() => {
    void initProjects();
  }, [initProjects]);

  useEffect(() => {
    if (parsedDraft?.discoveredInventory?.length) {
      setRuntimeInventoryTemplates(parsedDraft.discoveredInventory as DiscoveredInventoryInput[]);
      return;
    }

    clearRuntimeInventoryTemplates();
    return () => {
      clearRuntimeInventoryTemplates();
    };
  }, [parsedDraft?.discoveredInventory]);

  const uploadAndAnalyze = async () => {
    if (!activeProjectId) return;
    if (!pendingFiles.length) return;
    if (photosAlreadyUploaded) {
      setLocalError(copy.uploadLocked);
      return;
    }

    if (pendingFiles.length !== PROJECT_PHOTO_COUNT) {
      setLocalError(copy.exactBatchError);
      return;
    }

    setWarningOpen(false);
    setSystemNotice(null);
    setLocalError(null);
    setBusy(true);

    try {
      const form = new FormData();
      for (const file of pendingFiles) form.append("files", file);
      form.append("locale", locale);

      await jsonFetch(`/api/projects/${activeProjectId}/uploads`, {
        method: "POST",
        body: form,
      });
      setPendingFiles([]);

      setSystemNotice(copy.uploadNotice);

      await jsonFetch(`/api/projects/${activeProjectId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      await loadProjectById(activeProjectId);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : copy.uploadFailed);
      await loadProjectById(activeProjectId);
    } finally {
      setBusy(false);
    }
  };

  const analyzeOnly = async () => {
    if (!activeProjectId) return;
    if (!canAnalyze) return;
    setLocalError(null);
    setBusy(true);
    try {
      await jsonFetch(`/api/projects/${activeProjectId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      await loadProjectById(activeProjectId);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : copy.analyzeFailed);
    } finally {
      setBusy(false);
    }
  };

  const applyDraftToEditor = (draft: RoomDraft) => {
    if (activeProject?.roomData) {
      loadRoomData(activeProject.roomData);
      return;
    }

    updateRoomProperties({ shape: draft.room.shape, purpose: "empty" });
    updateRoomProperties({
      width: draft.room.width,
      depth: draft.room.depth,
      height: draft.room.height,
    });

    for (const item of draft.items) {
      const added = addObjectFromTemplate(item.templateId, { x: item.x, z: item.z });
      const objectId = added?.type === "object" ? added.id : null;
      if (!objectId) continue;
      if (typeof item.rotation === "number") {
        updateObjectProperties(objectId, { rotation: item.rotation });
      }
    }
  };

  const sendChat = async () => {
    if (!activeProjectId) return;
    const message = composerText.trim();
    if (!message) return;
    if (locked || anyBusy) return;
    if (chatLimitReached) {
      setLocalError(copy.chatLimitReached);
      return;
    }

    setComposerText("");
    setLocalError(null);
    setBusy(true);

    try {
      const result = await jsonFetch<{ reply: string; layout: LayoutResponse }>(
        `/api/projects/${activeProjectId}/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            roomData,
            locale,
            selection: selectionPayload,
          }),
        },
      );

      if (result?.layout && (result.layout.objects.length || result.layout.room)) {
        applyLayoutResponse(result.layout);
      }
      if (result?.layout?.warnings?.length) {
        setSystemNotice(summarizeSystemWarnings(result.layout.warnings));
      }
      await loadProjectById(activeProjectId);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : copy.chatFailed);
      await loadProjectById(activeProjectId);
    } finally {
      setBusy(false);
    }
  };

  const actionProject: ProjectMeta | null = useMemo(() => {
    if (!actionProjectId) return null;
    return projects.find((p) => p.id === actionProjectId) ?? null;
  }, [actionProjectId, projects]);

  const closeProjectActions = () => {
    setActionProjectId(null);
    setRenameOpen(false);
    setDeleteOpen(false);
    setRenameValue("");
  };

  const header = (
    <div className="relative flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className="inline-flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-[#111924] px-3 py-2 text-left text-sm font-semibold text-slate-200 transition hover:border-[#32516c] hover:text-white"
      >
        <span className="truncate">
          {meta ? meta.title : loading ? copy.loadingProject : copy.noProject}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {hasActiveProject ? (
        <>
          <label
            className={`inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-[#0d141d] px-3 text-sm font-semibold text-slate-200 transition ${
              uploadDisabled
                ? "cursor-not-allowed opacity-55"
                : "cursor-pointer hover:border-[#32516c] hover:text-white"
            }`}
          >
            <ImagePlus className="h-4 w-4 text-[#8cb9ff]" />
            <span className="hidden sm:inline">{copy.photo}</span>
            <input
              type="file"
              multiple
              accept="image/*"
              disabled={uploadDisabled}
              className="hidden"
              onChange={(e) => {
                const list = Array.from(e.target.files ?? []);
                if (!list.length) return;

                if (uploadDisabled) {
                  setLocalError(photosAlreadyUploaded ? copy.uploadLocked : copy.uploadFailed);
                  e.currentTarget.value = "";
                  return;
                }

                if (list.length !== PROJECT_PHOTO_COUNT) {
                  setLocalError(copy.exactBatchError);
                  e.currentTarget.value = "";
                  return;
                }

                setPendingFiles(list);
                setWarningOpen(true);
                e.currentTarget.value = "";
              }}
            />
          </label>

          <button
            type="button"
            onClick={() => void analyzeOnly()}
            disabled={!canAnalyze || anyBusy || locked}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#24405a] bg-[#102234] px-3 text-sm font-semibold text-[#8cb9ff] transition hover:border-[#4ea8ff] hover:text-white disabled:cursor-not-allowed disabled:opacity-55"
          >
            {anyBusy && locked ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {copy.analyze}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => void createProject()}
          disabled={anyBusy}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#24405a] bg-[#102234] px-3 text-sm font-semibold text-[#8cb9ff] transition hover:border-[#4ea8ff] hover:text-white disabled:cursor-not-allowed disabled:opacity-55"
        >
          <FolderPlus className="h-4 w-4" />
          <span className="hidden sm:inline">{copy.newProject}</span>
        </button>
      )}

      {menuOpen ? (
        <div className="absolute left-3 top-[calc(100%+0.5rem)] z-[80] w-[min(520px,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-[#0d141d]/98 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.42)] backdrop-blur">
          <div className="flex items-center justify-between gap-2 px-2 py-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              {copy.projects}
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#111924] text-slate-200 transition hover:border-[#32516c] hover:text-white"
              aria-label={copy.close}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="scroll-area max-h-[45vh] overflow-y-auto p-1">
            {projects.length ? (
              <div className="grid gap-2">
                {projects.map((p) => {
                  const active = p.id === activeProjectId;
                  return (
                    <div
                      key={p.id}
                      className={`relative w-full rounded-xl border transition ${
                        active
                          ? "border-[#4ea8ff] bg-[#102234] text-white"
                          : "border-white/10 bg-[#111924] text-slate-200 hover:border-[#32516c] hover:text-white"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          void loadProjectById(p.id);
                        }}
                        className="w-full rounded-xl px-3 py-2 text-left"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate pr-10 text-sm font-semibold">{p.title}</div>
                          <div className="shrink-0 rounded-md border border-white/10 bg-[#0b1016] px-2 py-1 text-[10px] font-semibold text-slate-400">
                            {p.photoCount}
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-slate-400">{formatStatus(p, locale)}</div>
                      </button>

                      {!isMobile ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setActionProjectId(p.id);
                          }}
                          title={copy.projectOptions}
                          className={`absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                            active
                              ? "border-white/15 bg-[#0b1016]/30 text-white hover:border-white/30"
                              : "border-white/10 bg-[#0b1016] text-slate-200 hover:border-[#32516c] hover:text-white"
                          }`}
                          aria-label={copy.projectOptions}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-[#111924] px-3 py-4 text-sm text-slate-300">
                {copy.noProjectsYet}
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/10 px-2 pt-2">
            <button
              type="button"
              onClick={() => void createProject()}
              disabled={anyBusy}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#24405a] bg-[#102234] px-3 text-sm font-semibold text-[#8cb9ff] transition hover:border-[#4ea8ff] hover:text-white disabled:cursor-not-allowed disabled:opacity-55"
            >
              <FolderPlus className="h-4 w-4" />
              {copy.newProject}
            </button>
            {meta ? <div className="text-xs text-slate-500">{meta.photoCount} {locale === "en" ? "photos" : "foto"}</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );

  const selectionBanner = hasActiveProject && selectionSummary ? (
    <section className="rounded-xl border border-[#6d4a29] bg-[#25180f] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f5c28b]">
          {copy.selectionContext}
        </div>
        {selectedObjectLabel ? (
          <div className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f5c28b]">
            {selectedObjectLabel}
          </div>
        ) : null}
      </div>
      <div className="mt-2 whitespace-pre-line text-sm leading-6 text-[#f8dec0]">
        {selectionSummary}
      </div>
    </section>
  ) : null;

  return (
    <aside className={panelClass}>
      {header}

      {!hasActiveProject ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-4">
          <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-white/10 bg-[#111924] p-6 text-center">
            {loading ? (
              <div className="flex items-center justify-center gap-2 text-sm text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                {copy.loadingProject}
              </div>
            ) : (
              <>
                {error ? (
                  <div className="flex items-start gap-2 rounded-xl border border-[#6e2a2a] bg-[#2a1313] p-3 text-left text-sm text-[#ffb1b1]">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>{error}</div>
                  </div>
                ) : null}
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#24405a] bg-[#102234] text-[#8cb9ff]">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <div className="text-base font-semibold text-white">{copy.projectRequiredTitle}</div>
                  <div className="text-sm leading-6 text-slate-300">{copy.projectRequiredBody}</div>
                  <div className="text-xs leading-5 text-slate-500">
                    {projects.length ? copy.selectExistingProject : copy.noProjectsYet}
                  </div>
                </div>
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => void createProject()}
                    disabled={anyBusy}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#24405a] bg-[#102234] px-4 text-sm font-semibold text-[#8cb9ff] transition hover:border-[#4ea8ff] hover:text-white disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    <FolderPlus className="h-4 w-4" />
                    {copy.createFirstProject}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="shrink-0 border-b border-white/10 bg-[#0d141d]/96 p-3 backdrop-blur">
            <div className="flex flex-col gap-3">
              {selectionBanner}
              {loading ? (
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#111924] p-3 text-sm text-slate-300">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {copy.loadingProject}
                </div>
              ) : error ? (
                <div className="flex items-start gap-2 rounded-xl border border-[#6e2a2a] bg-[#2a1313] p-3 text-sm text-[#ffb1b1]">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>{error}</div>
                </div>
              ) : null}
              {meta ? (
                <div className="rounded-xl border border-white/10 bg-[#111924] px-3 py-2 text-xs text-slate-400">
                  {copy.statusLabel}: <span className="font-semibold text-slate-200">{formatStatus(meta, locale)}</span>
                  {meta.lockReason ? <span className="text-slate-500">{` - ${meta.lockReason}`}</span> : null}
                </div>
              ) : null}
              {systemNotice ? <Bubble role="system">{systemNotice}</Bubble> : null}
            </div>
          </div>

          <div ref={scrollRef} className="scroll-area flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 pb-6">
            {meta ? (
          <section className="rounded-xl border border-[#24405a] bg-[#102234] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8cb9ff]">
              {copy.photoGuide}
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-200">
              {copy.photoGuideIntro}
            </div>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-300">
              {captureTips.map((tip) => (
                <li key={tip} className="rounded-lg border border-white/10 bg-[#0d141d] px-3 py-2">
                  {tip}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {activeProject?.messages?.length ? (
          <div className="grid gap-3">
            {activeProject.messages.map((m) => (
              <Bubble key={m.id} role={m.role}>
                {m.content}
              </Bubble>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-[#111924] p-4 text-sm text-slate-300">
            {copy.projectEmpty}
          </div>
        )}

        {meta?.status === "error" && meta.lastError ? (
          <div className="rounded-xl border border-[#6e2a2a] bg-[#2a1313] p-3 text-sm text-[#ffb1b1]">
            <div className="font-semibold">{copy.lastError}</div>
            <div className="mt-1 whitespace-pre-wrap text-xs text-[#ffb1b1]/90">
              {meta.lastError}
            </div>
          </div>
        ) : null}

        {parsedDraft ? (
          <div className="rounded-xl border border-white/10 bg-[#111924] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  {copy.analysisSummary}
                </div>
                <div className="mt-1 text-sm text-slate-300">
                  {copy.roomShape}:{" "}
                  <span className="font-semibold text-white">
                    {parsedDraft.room.shape === "rectangle"
                      ? locale === "en"
                        ? "Rectangle"
                        : "Dikdörtgen"
                      : parsedDraft.room.shape === "square"
                        ? locale === "en"
                          ? "Square"
                          : "Kare"
                        : locale === "en"
                          ? "L-shape"
                          : "L şeklinde"}
                  </span>
                </div>
              </div>
              <div className="rounded-full border border-[#24405a] bg-[#102234] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8cb9ff]">
                {parsedDraft.confidence}
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-[#0d141d] px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  {copy.dimensions}
                </div>
                <div className="mt-1 text-sm font-semibold text-white">
                  {parsedDraft.room.width.toFixed(1)} x {parsedDraft.room.depth.toFixed(1)} x{" "}
                  {parsedDraft.room.height.toFixed(1)} m
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#0d141d] px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  {copy.itemCount}
                </div>
                <div className="mt-1 text-sm font-semibold text-white">{parsedDraft.items.length}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#0d141d] px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  {copy.discoveredItems}
                </div>
                <div className="mt-1 text-sm font-semibold text-white">
                  {parsedDraft.discoveredInventory.length}
                </div>
              </div>
            </div>

            {parsedDraft.notes.length ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-[#0d141d] p-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {copy.notes}
                </div>
                <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-300">
                  {parsedDraft.notes.slice(0, 4).map((note) => (
                    <li key={note} className="rounded-lg border border-white/8 bg-white/4 px-3 py-2">
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {parsedDraft.warnings.length ? (
              <div className="mt-4 rounded-xl border border-[#6d4a29] bg-[#25180f] p-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f5c28b]">
                  {copy.warnings}
                </div>
                <ul className="mt-2 space-y-2 text-sm leading-6 text-[#f8dec0]">
                  {parsedDraft.warnings.slice(0, 4).map((warning) => (
                    <li key={warning} className="rounded-lg border border-white/10 bg-black/10 px-3 py-2">
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {parsedDraft.captureAdvice.length ? (
              <div className="mt-4 rounded-xl border border-[#24405a] bg-[#102234] p-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8cb9ff]">
                  {copy.captureAdvice}
                </div>
                <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-200">
                  {parsedDraft.captureAdvice.slice(0, 4).map((advice) => (
                    <li key={advice} className="rounded-lg border border-white/10 bg-[#0d141d] px-3 py-2">
                      {advice}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {parsedDraft.discoveredInventory.length ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-[#0d141d] p-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {copy.inventoryAdded}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {parsedDraft.discoveredInventory.slice(0, 8).map((item) => (
                    <span
                      key={item.id}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-slate-200"
                    >
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {!isMobile ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    applyDraftToEditor(parsedDraft);
                    setWorkspaceMode("kitchen");
                  }}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#24405a] bg-[#102234] px-3 text-sm font-semibold text-[#8cb9ff] transition hover:border-[#4ea8ff] hover:text-white"
                >
                  {copy.applyToEditor}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-white/10 bg-[#0d141d]/96 p-3 backdrop-blur">
        {!isMobile ? (
          <div className="mb-3 grid gap-2">
            <div className="rounded-xl border border-[#24405a] bg-[#102234] px-3 py-2 text-[11px] leading-5 text-[#8cb9ff]">
              {copy.firstBatchHint}
            </div>
            <div
              className={`rounded-xl border px-3 py-2 text-[11px] leading-5 ${
                chatLimitReached
                  ? "border-[#6e2a2a] bg-[#2a1313] text-[#ffb1b1]"
                  : "border-white/10 bg-[#111924] text-slate-400"
              }`}
            >
              {copy.chatTurnStatus}:{" "}
              <span className="font-semibold text-slate-200">
                {chatTurnCount}/{MAX_PROJECT_CHAT_TURNS}
              </span>
            </div>
          </div>
        ) : null}
        {!isMobile ? (
          <div className="flex items-end gap-2">
            <textarea
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
              placeholder={
                chatLimitReached
                  ? copy.chatLimitReached
                  : locked
                  ? locale === "en"
                    ? "Project is analyzing, chat is locked..."
                    : "Proje analizde, sohbet kilitli..."
                  : locale === "en"
                    ? "Message..."
                    : "Mesaj..."
              }
              disabled={anyBusy || locked || chatLimitReached}
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
              disabled={!composerText.trim() || anyBusy || locked || chatLimitReached}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#24405a] bg-[#102234] text-[#8cb9ff] transition hover:border-[#4ea8ff] hover:text-white disabled:cursor-not-allowed disabled:opacity-55"
              aria-label={copy.sendAriaLabel}
            >
              {anyBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-[#111924] p-3 text-sm text-slate-200">
            {copy.mobileMode}
          </div>
        )}
      </div>
        </>
      )}

      {warningOpen ? (
        <div className="fixed inset-0 z-[99] flex items-center justify-center bg-black/65 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d141d] p-4 shadow-[0_26px_80px_rgba(0,0,0,0.38)]">
            <div className="text-sm font-semibold text-white">{copy.preUploadTitle}</div>
            <div className="mt-2 text-sm leading-6 text-slate-300">
              {copy.preUploadBody}
            </div>
            <div className="mt-4 rounded-xl border border-white/10 bg-[#111924] p-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {copy.captureChecklist}
              </div>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-300">
                {captureTips.map((tip) => (
                  <li key={tip} className="rounded-lg border border-white/10 bg-[#0d141d] px-3 py-2">
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-3 rounded-xl border border-white/10 bg-[#111924] p-3 text-sm text-slate-200">
              {copy.selectedPhoto}: <span className="font-semibold">{pendingFiles.length}</span>
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
                {copy.cancel}
              </button>
              <button
                type="button"
                onClick={() => void uploadAndAnalyze()}
                disabled={pendingFiles.length !== PROJECT_PHOTO_COUNT || uploadDisabled}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-[#24405a] bg-[#102234] px-3 text-sm font-semibold text-[#8cb9ff] transition hover:border-[#4ea8ff] hover:text-white disabled:cursor-not-allowed disabled:opacity-55"
              >
                {copy.uploadAndAnalyze}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!isMobile && actionProjectId && actionProject && !renameOpen && !deleteOpen ? (
        <div
          className="fixed inset-0 z-[99] flex items-center justify-center bg-black/65 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeProjectActions();
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d141d] p-4 shadow-[0_26px_80px_rgba(0,0,0,0.38)]">
            <div className="text-sm font-semibold text-white">{copy.projectActions}</div>
            <div className="mt-1 truncate text-xs text-slate-400">{actionProject.title}</div>

            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={() => {
                  setRenameValue(actionProject.title);
                  setRenameOpen(true);
                }}
                className="inline-flex h-10 items-center justify-between rounded-xl border border-white/10 bg-[#111924] px-3 text-sm font-semibold text-slate-200 transition hover:border-[#32516c] hover:text-white"
              >
                <span>{copy.renameProject}</span>
                <Pencil className="h-4 w-4 text-slate-400" />
              </button>
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="inline-flex h-10 items-center justify-between rounded-xl border border-[#6e2a2a] bg-[#2a1313] px-3 text-sm font-semibold text-[#ffb1b1] transition hover:border-[#ff6b6b]"
              >
                <span>{locale === "en" ? "Delete" : "Sil"}</span>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeProjectActions}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-white/10 bg-[#0d141d] px-3 text-sm font-semibold text-slate-200 transition hover:border-[#32516c] hover:text-white"
              >
                {copy.close}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!isMobile && renameOpen && actionProjectId && actionProject ? (
        <div
          className="fixed inset-0 z-[99] flex items-center justify-center bg-black/65 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeProjectActions();
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d141d] p-4 shadow-[0_26px_80px_rgba(0,0,0,0.38)]">
            <div className="text-sm font-semibold text-white">{copy.renameProject}</div>
            <div className="mt-3">
              <input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                autoFocus
                className="h-11 w-full rounded-xl border border-white/10 bg-[#0b1016] px-3 text-sm text-slate-200 outline-none transition focus:border-[#32516c]"
                placeholder={copy.projectNamePlaceholder}
              />
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeProjectActions}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-white/10 bg-[#0d141d] px-3 text-sm font-semibold text-slate-200 transition hover:border-[#32516c] hover:text-white"
              >
                {copy.cancel}
              </button>
              <button
                type="button"
                disabled={!renameValue.trim() || anyBusy}
                onClick={() => {
                  void renameProject(actionProjectId, renameValue);
                  closeProjectActions();
                }}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-[#24405a] bg-[#102234] px-3 text-sm font-semibold text-[#8cb9ff] transition hover:border-[#4ea8ff] hover:text-white disabled:cursor-not-allowed disabled:opacity-55"
              >
                {copy.save}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!isMobile && deleteOpen && actionProjectId && actionProject ? (
        <div
          className="fixed inset-0 z-[99] flex items-center justify-center bg-black/65 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeProjectActions();
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d141d] p-4 shadow-[0_26px_80px_rgba(0,0,0,0.38)]">
            <div className="text-sm font-semibold text-white">{copy.deleteProject}</div>
            <div className="mt-2 text-sm text-slate-300">
              <span className="font-semibold text-slate-200">{actionProject.title}</span>{" "}
              {copy.deleteBody}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeProjectActions}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-white/10 bg-[#0d141d] px-3 text-sm font-semibold text-slate-200 transition hover:border-[#32516c] hover:text-white"
              >
                {copy.cancel}
              </button>
              <button
                type="button"
                disabled={anyBusy}
                onClick={() => {
                  void deleteProject(actionProjectId);
                  closeProjectActions();
                }}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-[#6e2a2a] bg-[#2a1313] px-3 text-sm font-semibold text-[#ffb1b1] transition hover:border-[#ff6b6b] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {locale === "en" ? "Delete" : "Sil"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
