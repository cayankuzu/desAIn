"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  FolderKanban,
  FolderOpen,
  Languages,
  LoaderCircle,
  LogOut,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from "@/lib/appLimits";
import { AuthForms } from "@/components/auth/AuthForms";
import { BrandCredit } from "@/components/layout/BrandCredit";
import {
  getAccountCopy,
  localizeApiMessage,
  type AccountWorkspaceTab,
} from "@/lib/i18n/accountTranslations";
import { useLocaleSync } from "@/lib/i18n/useLocaleSync";
import type { ProjectDraftPayload, ProjectSummary, Viewer } from "@/types/project";

type WorkspaceBanner = {
  tone: "success" | "warning";
  title: string;
  detail?: string;
  linkHref?: string | null;
  linkLabel?: string | null;
  dismissAfterMs?: number;
};

type AuthSuccessPayload = {
  user?: Viewer | null;
  project?: ProjectSummary | null;
};

interface AccountWorkspaceProps {
  initialViewer: Viewer | null;
  initialProjects?: ProjectSummary[];
  initialTab: AccountWorkspaceTab;
  variant?: "overlay" | "page";
  currentProjectName?: string | null;
  currentProjectId?: string | null;
  draftProject?: ProjectDraftPayload | null;
  flashCode?: string | null;
  resetToken?: string | null;
  onClose?: () => void;
  onViewerChange?: (viewer: Viewer | null) => void;
  onAuthSuccess?: (payload: { user: Viewer | null; project: ProjectSummary | null }) => void;
  onProjectActivated?: (projectId: string) => void;
  onCreateProject?: () => void;
}

const authTabs: Array<"login" | "register" | "forgot"> = [
  "login",
  "register",
  "forgot",
];

const authPagePathByTab: Record<"login" | "register" | "forgot", string> = {
  login: "/giris",
  register: "/kayit",
  forgot: "/sifremi-unuttum",
};

const getFlashBanner = (
  flashCode: string | null | undefined,
  copy: ReturnType<typeof getAccountCopy>,
): WorkspaceBanner | null => {
  if (flashCode === "saved") {
    return {
      tone: "success",
      title: copy.flashSaved,
      dismissAfterMs: 4200,
    };
  }

  if (flashCode === "cover-updated") {
    return {
      tone: "success",
      title: copy.flashCoverUpdated,
      dismissAfterMs: 4200,
    };
  }

  return null;
};

const isAuthTab = (tab: AccountWorkspaceTab): tab is "login" | "register" | "forgot" | "reset" =>
  tab === "login" || tab === "register" || tab === "forgot" || tab === "reset";

export function AccountWorkspace({
  initialViewer,
  initialProjects,
  initialTab,
  variant = "page",
  currentProjectName = null,
  currentProjectId = null,
  draftProject = null,
  flashCode = null,
  resetToken = null,
  onClose,
  onViewerChange,
  onAuthSuccess,
  onProjectActivated,
  onCreateProject,
}: AccountWorkspaceProps) {
  const router = useRouter();
  const { locale, setLocale } = useLocaleSync();
  const copy = getAccountCopy(locale);
  const [viewer, setViewer] = useState<Viewer | null>(initialViewer);
  const [projects, setProjects] = useState<ProjectSummary[]>(initialProjects ?? []);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [localBanner, setLocalBanner] = useState<WorkspaceBanner | null>(null);
  const [dismissedFlashCode, setDismissedFlashCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AccountWorkspaceTab>(initialTab);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [logoutSubmitting, setLogoutSubmitting] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState(initialViewer?.username ?? "");
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileErrorMessage, setProfileErrorMessage] = useState<string | null>(null);
  const [resetEmailConfirmOpen, setResetEmailConfirmOpen] = useState(false);
  const [resetEmailSubmitting, setResetEmailSubmitting] = useState(false);
  const [projectPendingDelete, setProjectPendingDelete] = useState<ProjectSummary | null>(null);
  const [projectDeletingId, setProjectDeletingId] = useState<string | null>(null);
  const flashBanner = getFlashBanner(flashCode, copy);
  const banner =
    localBanner ??
    (flashBanner && flashCode !== dismissedFlashCode ? flashBanner : null);
  const displayedTab = viewer
    ? activeTab === "login" || activeTab === "register" || activeTab === "forgot"
      ? "projects"
      : activeTab
    : activeTab === "projects" || activeTab === "profile"
      ? initialTab === "register"
        ? "register"
        : "login"
      : activeTab;

  useEffect(() => {
    const currentTitle = isAuthTab(displayedTab)
      ? copy.authTitle[displayedTab]
      : displayedTab === "profile"
        ? copy.profileTitle
        : copy.projectsTitle;

    document.title = `${currentTitle} | ${copy.brand}`;
  }, [copy, displayedTab]);

  const dismissBanner = () => {
    if (localBanner) {
      setLocalBanner(null);
      return;
    }

    if (flashBanner && flashCode) {
      setDismissedFlashCode(flashCode);

      if (variant === "page") {
        router.replace("/projelerim", { scroll: false });
      }
    }
  };

  useEffect(() => {
    if (!banner?.dismissAfterMs) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (localBanner) {
        setLocalBanner(null);
        return;
      }

      if (flashBanner && flashCode) {
        setDismissedFlashCode(flashCode);

        if (variant === "page") {
          router.replace("/projelerim", { scroll: false });
        }
      }
    }, banner.dismissAfterMs);

    return () => window.clearTimeout(timeoutId);
  }, [
    banner?.dismissAfterMs,
    banner?.detail,
    banner?.title,
    flashBanner,
    flashCode,
    localBanner,
    router,
    variant,
  ]);

  const activeProjectLabel =
    currentProjectName || (variant === "overlay" ? copy.activeProjectEmpty : null);

  const fetchProjects = async (viewerToLoad: Viewer | null) => {
    if (!viewerToLoad) {
      return;
    }

    setProjectsLoading(true);
    setProjectsError(null);

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
        setProjectsError(
          localizeApiMessage(json.message, locale) ?? copy.projectsLoadError,
        );
        return;
      }

      setProjects(json.projects ?? []);
    } catch {
      setProjectsError(copy.networkError);
    } finally {
      setProjectsLoading(false);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
      return;
    }

    router.push("/", { scroll: false });
  };

  const handleAuthTabChange = (tab: "login" | "register" | "forgot") => {
    if (variant === "page") {
      router.push(authPagePathByTab[tab], { scroll: false });
      return;
    }

    setActiveTab(tab);
  };

  const handleAuthSuccess = async (payload: AuthSuccessPayload) => {
    const nextViewer = payload.user ?? null;
    const createdProject = payload.project ?? null;

    setViewer(nextViewer);
    setUsernameDraft(nextViewer?.username ?? "");
    onViewerChange?.(nextViewer);

    if (createdProject) {
      setProjects((current) => [
        createdProject,
        ...current.filter((project) => project.id !== createdProject.id),
      ]);
      setLocalBanner({
        tone: "success",
        title: copy.firstProjectToastTitle,
        detail: copy.firstProjectToastDetail(createdProject.name),
        dismissAfterMs: 4200,
      });
    } else {
      setLocalBanner(null);
    }

    setActiveTab("projects");
    onAuthSuccess?.({
      user: nextViewer,
      project: createdProject,
    });

    if (variant === "page" && nextViewer) {
      router.replace("/projelerim", { scroll: false });
      return;
    }

    await fetchProjects(nextViewer);
  };

  const handleOpenProject = (projectId: string) => {
    if (onProjectActivated) {
      onProjectActivated(projectId);
      return;
    }

    router.push(`/?projectId=${projectId}`, { scroll: false });
  };

  const handleDeleteProject = async () => {
    if (!projectPendingDelete) {
      return;
    }

    setProjectDeletingId(projectPendingDelete.id);

    try {
      const response = await fetch(`/api/projects/${projectPendingDelete.id}`, {
        method: "DELETE",
      });
      const json = (await response.json()) as { ok: boolean; message?: string };

      if (!response.ok || !json.ok) {
        throw new Error(localizeApiMessage(json.message, locale) ?? copy.projectDeleteFailure);
      }

      setProjects((current) =>
        current.filter((project) => project.id !== projectPendingDelete.id),
      );
      setProjectPendingDelete(null);
      setLocalBanner({
        tone: "success",
        title: copy.flashDeleted,
        detail: projectPendingDelete.name,
        dismissAfterMs: 4200,
      });
    } catch (error) {
      setLocalBanner({
        tone: "warning",
        title: copy.projectDeleteFailure,
        detail:
          error instanceof Error
            ? localizeApiMessage(error.message, locale) ?? error.message
            : copy.retry,
        dismissAfterMs: 4200,
      });
    } finally {
      setProjectDeletingId(null);
    }
  };

  const handleProfileSave = async () => {
    setProfileSubmitting(true);
    setProfileErrorMessage(null);

    try {
      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: usernameDraft,
        }),
      });
      const json = (await response.json()) as {
        ok: boolean;
        message?: string;
        user?: Viewer | null;
      };

      if (!response.ok || !json.ok || !json.user) {
        throw new Error(localizeApiMessage(json.message, locale) ?? copy.networkError);
      }

      setViewer(json.user);
      setUsernameDraft(json.user.username);
      onViewerChange?.(json.user);
      setLocalBanner({
        tone: "success",
        title: copy.profileUsernameSavedTitle,
        detail: copy.profileUsernameSavedDetail,
        dismissAfterMs: 4200,
      });
    } catch (error) {
      setProfileErrorMessage(
        error instanceof Error ? error.message : copy.networkError,
      );
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handlePasswordResetEmailRequest = async () => {
    setResetEmailSubmitting(true);

    try {
      const response = await fetch("/api/auth/profile/reset-password-email", {
        method: "POST",
      });
      const json = (await response.json()) as {
        ok: boolean;
        message?: string;
        previewUrl?: string | null;
      };

      if (!response.ok || !json.ok) {
        throw new Error(localizeApiMessage(json.message, locale) ?? copy.networkError);
      }

      setResetEmailConfirmOpen(false);
      setLocalBanner({
        tone: "success",
        title: copy.profileResetEmailSentTitle,
        detail: copy.profileResetEmailSentDetail,
        linkHref: json.previewUrl ?? null,
        linkLabel: json.previewUrl ? copy.profileResetEmailPreviewLabel : null,
      });
    } catch (error) {
      setLocalBanner({
        tone: "warning",
        title:
          error instanceof Error
            ? error.message
            : copy.networkError,
        dismissAfterMs: 5200,
      });
    } finally {
      setResetEmailSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setLogoutSubmitting(true);
    setProjectsError(null);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });
      const json = (await response.json()) as { ok: boolean; message?: string };

      if (!response.ok || !json.ok) {
        setProjectsError(
          localizeApiMessage(json.message, locale) ?? copy.networkError,
        );
        return;
      }

      setViewer(null);
      setProjects([]);
      setProjectsLoading(false);
      setLocalBanner(null);
      setLogoutConfirmOpen(false);
      setActiveTab("login");
      setUsernameDraft("");
      onViewerChange?.(null);

      if (typeof window !== "undefined") {
        window.location.replace("/");
        return;
      }

      router.replace("/", { scroll: false });
    } catch {
      setProjectsError(copy.networkError);
    } finally {
      setLogoutSubmitting(false);
    }
  };

  const projectCountLabel = useMemo(() => {
    if (!viewer) {
      return "0";
    }

    if (projectsLoading && !projects.length) {
      return "...";
    }

    return `${projects.length}`;
  }, [projects.length, projectsLoading, viewer]);
  const trimmedUsernameDraft = usernameDraft.trim();
  const usernameUnchanged = trimmedUsernameDraft === (viewer?.username ?? "");

  const containerClassName =
    variant === "overlay"
      ? "fixed inset-0 z-[160] bg-[#03070bd9] px-3 py-3 backdrop-blur-md md:px-5 md:py-5"
      : "h-dvh overflow-hidden bg-[radial-gradient(circle_at_18%_10%,rgba(78,168,255,0.12),transparent_24%),radial-gradient(circle_at_82%_8%,rgba(255,179,108,0.12),transparent_22%),linear-gradient(180deg,#070b10,#0b1016)] px-4 py-4 md:px-6 md:py-6";

  const shellClassName =
    variant === "overlay"
      ? "mx-auto flex h-full w-full max-w-[1380px] flex-col overflow-hidden rounded-[1.9rem] border border-white/10 bg-[#0c131b]/97 shadow-[0_30px_90px_rgba(0,0,0,0.5)]"
      : "mx-auto flex h-full w-full max-w-[1380px] flex-col overflow-hidden rounded-[1.9rem] border border-white/10 bg-[#0c131b]/94 shadow-[0_26px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl";

  const renderProjects = () => {
    if (!viewer) {
      return null;
    }

    if (projectsLoading && !projects.length) {
      return (
        <div className="flex min-h-[320px] items-center justify-center rounded-[1.5rem] border border-white/10 bg-[#0f1720]/72">
          <div className="inline-flex items-center gap-3 text-sm font-semibold text-slate-300">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            {copy.loadingProjects}
          </div>
        </div>
      );
    }

    if (projectsError && !projects.length) {
      return (
        <div className="rounded-[1.5rem] border border-[#6e2a2a] bg-[#261313] px-5 py-5">
          <div className="text-sm font-semibold text-[#ffb2b2]">{projectsError}</div>
          <button
            type="button"
            onClick={() => {
              void fetchProjects(viewer);
            }}
            className="mt-4 inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-[#0f1720] px-4 text-sm font-semibold text-slate-200 transition hover:border-[#32516c] hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
            {copy.retryLoad}
          </button>
        </div>
      );
    }

    if (!projects.length) {
      return (
        <section className="rounded-[1.6rem] border border-dashed border-white/12 bg-[#0d141d]/84 px-6 py-12 text-center">
          <div className="mx-auto max-w-xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-[#24405a] bg-[#102234] text-[#8cb9ff]">
              <FolderOpen className="h-7 w-7" />
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-white">
              {copy.emptyProjectsTitle}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-400">
              {copy.emptyProjectsDescription}
            </p>
            {variant === "page" ? (
              <Link
                href="/?draft=1"
                className="mt-6 inline-flex h-12 items-center rounded-full border border-[#4ea8ff] bg-[#102234] px-5 text-sm font-semibold text-white transition hover:border-[#76beff]"
              >
                {copy.startDesign}
              </Link>
            ) : onCreateProject ? (
              <button
                type="button"
                onClick={onCreateProject}
                className="mt-6 inline-flex h-12 items-center rounded-full border border-[#4ea8ff] bg-[#102234] px-5 text-sm font-semibold text-white transition hover:border-[#76beff]"
              >
                {copy.startDesign}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleClose}
                className="mt-6 inline-flex h-12 items-center rounded-full border border-[#4ea8ff] bg-[#102234] px-5 text-sm font-semibold text-white transition hover:border-[#76beff]"
              >
                {copy.startDesign}
              </button>
            )}
          </div>
        </section>
      );
    }

    return (
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <article
            key={project.id}
            className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0d141d]/94 shadow-[0_18px_45px_rgba(0,0,0,0.28)]"
          >
            <div className="aspect-[4/3] overflow-hidden bg-[#0b1016]">
              {project.coverImageDataUrl ? (
                <Image
                  src={project.coverImageDataUrl}
                  alt={project.name}
                  width={1200}
                  height={900}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-[radial-gradient(circle_at_18%_18%,rgba(255,179,108,0.18),transparent_26%),radial-gradient(circle_at_82%_16%,rgba(78,168,255,0.18),transparent_24%),linear-gradient(180deg,#0b1016,#121b27)]" />
              )}
            </div>

            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-semibold text-white">
                    {project.name}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {project.description || copy.noDescription}
                  </p>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                  {copy.itemCount(project.itemCount)}
                </div>
              </div>

              <div className="mt-5 text-xs text-slate-500">
                {copy.lastUpdated}:{" "}
                {new Date(project.updatedAt).toLocaleString(
                  locale === "en" ? "en-US" : "tr-TR",
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {variant === "page" && !onProjectActivated ? (
                  <Link
                    href={`/?projectId=${project.id}`}
                    className="inline-flex h-11 items-center gap-2 rounded-full border border-[#4ea8ff] bg-[#102234] px-4 text-sm font-semibold text-white transition hover:border-[#76beff]"
                  >
                    <FolderOpen className="h-4 w-4" />
                    {copy.openProject}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenProject(project.id)}
                    className="inline-flex h-11 items-center gap-2 rounded-full border border-[#4ea8ff] bg-[#102234] px-4 text-sm font-semibold text-white transition hover:border-[#76beff]"
                  >
                    <FolderOpen className="h-4 w-4" />
                    {copy.openProject}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setProjectPendingDelete(project)}
                  disabled={projectDeletingId === project.id || currentProjectId === project.id}
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-[#6e2424] bg-[#2a1313] px-4 text-sm font-semibold text-[#ffb3b3] transition hover:border-[#ff8f8f] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Trash2 className="h-4 w-4" />
                  {projectDeletingId === project.id ? copy.deletingProject : copy.deleteProject}
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>
    );
  };

  const renderProfile = () => {
    if (!viewer) {
      return null;
    }

    return (
      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.55rem] border border-white/10 bg-[#0f1720]/78 p-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#24405a] bg-[#102234] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8cb9ff]">
            <ShieldCheck className="h-3.5 w-3.5" />
            {copy.profileTitle}
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-white">
            {viewer.username}
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            {copy.profileDescription}
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[1.3rem] border border-white/10 bg-[#0c131b] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                {copy.profileUsername}
              </div>
              <input
                value={usernameDraft}
                onChange={(event) => {
                  setUsernameDraft(event.target.value);
                  setProfileErrorMessage(null);
                }}
                maxLength={USERNAME_MAX_LENGTH}
                className="mt-3 w-full rounded-2xl border border-white/10 bg-[#111924] px-4 py-3 text-sm text-white outline-none transition focus:border-[#4ea8ff]"
                placeholder={copy.usernamePlaceholder}
              />
              <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                <span>{copy.profileUsernameHelp(USERNAME_MIN_LENGTH, USERNAME_MAX_LENGTH)}</span>
                <span>{copy.characterCounter(usernameDraft.length, USERNAME_MAX_LENGTH)}</span>
              </div>
              {profileErrorMessage ? (
                <div className="mt-3 rounded-2xl border border-[#6e2a2a] bg-[#261313] px-4 py-3 text-sm text-[#ffb2b2]">
                  {profileErrorMessage}
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  void handleProfileSave();
                }}
                disabled={
                  profileSubmitting ||
                  usernameUnchanged ||
                  trimmedUsernameDraft.length < USERNAME_MIN_LENGTH
                }
                className="mt-4 inline-flex h-11 items-center gap-2 rounded-full border border-[#4ea8ff] bg-[#102234] px-4 text-sm font-semibold text-white transition hover:border-[#76beff] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {profileSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : null}
                {profileSubmitting ? copy.profileSavingUsername : copy.profileSaveUsername}
              </button>
            </div>

            <div className="rounded-[1.3rem] border border-white/10 bg-[#0c131b] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                {copy.profileEmail}
              </div>
              <div className="mt-3 break-all rounded-2xl border border-white/10 bg-[#111924] px-4 py-3 text-sm font-semibold text-white">
                {viewer.email}
              </div>
              <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                {copy.profileResetPasswordEmailTitle}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {copy.profileResetPasswordEmailDescription}
              </p>
              <button
                type="button"
                onClick={() => setResetEmailConfirmOpen(true)}
                className="mt-4 inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-[#111924] px-4 text-sm font-semibold text-slate-200 transition hover:border-[#32516c] hover:text-white"
              >
                <Mail className="h-4 w-4" />
                {copy.profileSendResetEmail}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-[1.55rem] border border-white/10 bg-[#0f1720]/78 p-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            {copy.profileProjectCount}
          </div>
          <div className="mt-2 text-4xl font-semibold tracking-[0] text-white">
            {projectCountLabel}
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-400">
            {copy.projectsDescription}
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveTab("projects");
              void fetchProjects(viewer);
            }}
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-full border border-[#4ea8ff] bg-[#102234] px-4 text-sm font-semibold text-white transition hover:border-[#76beff]"
          >
            <FolderKanban className="h-4 w-4" />
            {copy.myProjects}
          </button>
        </div>
      </section>
    );
  };

  const renderContent = () => {
    if (!viewer || isAuthTab(displayedTab)) {
      return (
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#24405a] bg-[#102234] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8cb9ff]">
              <Sparkles className="h-3.5 w-3.5" />
              {copy.authTitle[displayedTab as "login" | "register" | "forgot" | "reset"]}
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-[0] text-white">
              {copy.authTitle[displayedTab as "login" | "register" | "forgot" | "reset"]}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-400">
              {copy.authDescription[displayedTab as "login" | "register" | "forgot" | "reset"]}
            </p>
          </div>

          <AuthForms
            compact
            mode={displayedTab as "login" | "register" | "forgot" | "reset"}
            redirectTo="/projelerim"
            resetToken={resetToken}
            initialProjectDraft={draftProject ?? undefined}
            showHeader={false}
            showModeFooter={false}
            onRequestModeChange={variant === "overlay" ? handleAuthTabChange : undefined}
            onResetSuccess={
              variant === "overlay" ? () => setActiveTab("login") : undefined
            }
            onSuccess={handleAuthSuccess}
          />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <section className="rounded-[1.6rem] border border-white/10 bg-[#0f1720]/78 px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#24405a] bg-[#102234] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8cb9ff]">
                <Sparkles className="h-3.5 w-3.5" />
                {copy.projectsWelcome(viewer.username)}
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[0] text-white">
                {displayedTab === "profile" ? copy.profileTitle : copy.projectsTitle}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                {displayedTab === "profile"
                  ? copy.profileDescription
                  : copy.projectsDescription}
              </p>
            </div>
            {displayedTab === "projects"
              ? variant === "page"
                ? (
                    <Link
                      href="/?draft=1"
                      className="inline-flex h-12 items-center justify-center rounded-full border border-[#4ea8ff] bg-[#102234] px-5 text-sm font-semibold text-white transition hover:border-[#76beff]"
                    >
                      {copy.newProject}
                    </Link>
                  )
                : onCreateProject
                  ? (
                      <button
                        type="button"
                        onClick={onCreateProject}
                        className="inline-flex h-12 items-center justify-center rounded-full border border-[#4ea8ff] bg-[#102234] px-5 text-sm font-semibold text-white transition hover:border-[#76beff]"
                      >
                        {copy.newProject}
                      </button>
                    )
                  : null
              : null}
          </div>
        </section>

        {displayedTab === "profile" ? renderProfile() : renderProjects()}
      </div>
    );
  };

  return (
    <div className={containerClassName}>
      <div className={shellClassName}>
        <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0c131b]/96 px-4 py-4 backdrop-blur-xl md:px-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <BrandCredit className="shrink-0" />
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#24405a] bg-[#102234] px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-[#8cb9ff]">
                  <Sparkles className="h-3.5 w-3.5" />
                  {copy.brand}
                </div>
                <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#0f1720] p-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                  <span className="hidden items-center gap-1.5 px-2 md:inline-flex">
                    <Languages className="h-3 w-3" />
                    {copy.language}
                  </span>
                  <button
                    type="button"
                    onClick={() => setLocale("tr")}
                    aria-pressed={locale === "tr"}
                    className={`h-8 rounded-full px-3 transition ${
                      locale === "tr"
                        ? "bg-[#102234] text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {copy.turkish}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocale("en")}
                    aria-pressed={locale === "en"}
                    className={`h-8 rounded-full px-3 transition ${
                      locale === "en"
                        ? "bg-[#102234] text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {copy.english}
                  </button>
                </div>
                {variant === "overlay" ? (
                  <button
                    type="button"
                    onClick={handleClose}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#0f1720] text-slate-300 transition hover:border-[#32516c] hover:text-white"
                    aria-label={copy.close}
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  {viewer ? copy.accountBarEyebrow : copy.secureBadge}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <div className="text-xl font-semibold text-white">
                    {viewer
                      ? copy.accountSignedIn(viewer.username)
                      : copy.accountSignedOut}
                  </div>
                  {activeProjectLabel ? (
                    <div className="inline-flex min-h-10 items-center rounded-full border border-white/10 bg-white/5 px-4 text-sm font-semibold text-slate-200">
                      {copy.activeProjectLabel}: {activeProjectLabel}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {viewer ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveTab("projects")}
                      aria-pressed={activeTab === "projects"}
                      className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition ${
                        activeTab === "projects"
                          ? "border-[#4ea8ff] bg-[#102234] text-white"
                          : "border-white/10 bg-[#0f1720] text-slate-300 hover:border-[#32516c] hover:text-white"
                      }`}
                    >
                      <FolderKanban className="h-4 w-4" />
                      {copy.myProjects}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("profile")}
                      aria-pressed={activeTab === "profile"}
                      className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition ${
                        activeTab === "profile"
                          ? "border-[#4ea8ff] bg-[#102234] text-white"
                          : "border-white/10 bg-[#0f1720] text-slate-300 hover:border-[#32516c] hover:text-white"
                      }`}
                    >
                      <UserRound className="h-4 w-4" />
                      {copy.profile}
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogoutConfirmOpen(true)}
                      className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-[#0f1720] px-4 text-sm font-semibold text-slate-300 transition hover:border-[#32516c] hover:text-white"
                    >
                      <LogOut className="h-4 w-4" />
                      {copy.logout}
                    </button>
                  </>
                ) : (
                  authTabs.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => handleAuthTabChange(tab)}
                      aria-pressed={displayedTab === tab}
                      className={`inline-flex h-11 items-center rounded-full border px-4 text-sm font-semibold transition ${
                        displayedTab === tab
                          ? "border-[#4ea8ff] bg-[#102234] text-white"
                          : "border-white/10 bg-[#0f1720] text-slate-300 hover:border-[#32516c] hover:text-white"
                      }`}
                    >
                      {copy.authTabs[tab]}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-6 md:py-6">
          {banner ? (
            <div
              className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${
                banner.tone === "success"
                  ? "border-[#245d44] bg-[#102219] text-[#b9f5d0]"
                  : "border-[#6d4a29] bg-[#25180f] text-[#f5c28b]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold">{banner.title}</div>
                  {banner.detail ? <div className="mt-1">{banner.detail}</div> : null}
                  {banner.linkHref && banner.linkLabel ? (
                    <Link
                      href={banner.linkHref}
                      className="mt-3 inline-flex text-sm font-semibold text-white underline underline-offset-4"
                    >
                      {banner.linkLabel}
                    </Link>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={dismissBanner}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/10 text-current transition hover:border-white/30"
                  aria-label={copy.close}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}

          {projectsError && projects.length ? (
            <div className="mb-5 rounded-2xl border border-[#6d4a29] bg-[#25180f] px-4 py-3 text-sm text-[#f5c28b]">
              {projectsError}
            </div>
          ) : null}

          {renderContent()}
        </div>
      </div>

      {projectPendingDelete ? (
        <div className="fixed inset-0 z-[168] flex items-center justify-center bg-[#03070bcc] px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.6rem] border border-white/10 bg-[#0c131b] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.5)]">
            <h3 className="text-xl font-semibold text-white">
              {copy.deleteProjectConfirmTitle}
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {copy.deleteProjectConfirmBody(projectPendingDelete.name)}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setProjectPendingDelete(null)}
                disabled={projectDeletingId === projectPendingDelete.id}
                className="inline-flex h-11 items-center rounded-full border border-white/10 bg-[#0f1720] px-4 text-sm font-semibold text-slate-300 transition hover:border-[#32516c] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {copy.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleDeleteProject();
                }}
                disabled={projectDeletingId === projectPendingDelete.id}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-[#6e2424] bg-[#2a1313] px-4 text-sm font-semibold text-[#ffb3b3] transition hover:border-[#ff8f8f] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {projectDeletingId === projectPendingDelete.id ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {projectDeletingId === projectPendingDelete.id
                  ? copy.deletingProject
                  : copy.deleteProjectConfirmAction}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {resetEmailConfirmOpen && viewer ? (
        <div className="fixed inset-0 z-[169] flex items-center justify-center bg-[#03070bcc] px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.6rem] border border-white/10 bg-[#0c131b] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.5)]">
            <h3 className="text-xl font-semibold text-white">
              {copy.profileResetEmailConfirmTitle}
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {copy.profileResetEmailConfirmBody(viewer.email)}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setResetEmailConfirmOpen(false)}
                className="inline-flex h-11 items-center rounded-full border border-white/10 bg-[#0f1720] px-4 text-sm font-semibold text-slate-300 transition hover:border-[#32516c] hover:text-white"
              >
                {copy.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  void handlePasswordResetEmailRequest();
                }}
                disabled={resetEmailSubmitting}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-[#4ea8ff] bg-[#102234] px-4 text-sm font-semibold text-white transition hover:border-[#76beff] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resetEmailSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : null}
                {resetEmailSubmitting
                  ? copy.profileSendResetEmailSubmitting
                  : copy.profileResetEmailConfirmAction}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {logoutConfirmOpen ? (
        <div className="fixed inset-0 z-[170] flex items-center justify-center bg-[#03070bcc] px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.6rem] border border-white/10 bg-[#0c131b] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.5)]">
            <h3 className="text-xl font-semibold text-white">{copy.logoutConfirmTitle}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {copy.logoutConfirmBody}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setLogoutConfirmOpen(false)}
                className="inline-flex h-11 items-center rounded-full border border-white/10 bg-[#0f1720] px-4 text-sm font-semibold text-slate-300 transition hover:border-[#32516c] hover:text-white"
              >
                {copy.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleLogout();
                }}
                disabled={logoutSubmitting}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-[#4ea8ff] bg-[#102234] px-4 text-sm font-semibold text-white transition hover:border-[#76beff] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {logoutSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                {copy.logoutConfirmAction}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
