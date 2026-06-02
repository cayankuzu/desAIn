"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { FolderOpen, Languages, LayoutTemplate, Sparkles } from "lucide-react";
import { getAccountCopy } from "@/lib/i18n/accountTranslations";
import { useLocaleSync } from "@/lib/i18n/useLocaleSync";
import type { ProjectSummary, Viewer } from "@/types/project";

interface ProjectsOverviewProps {
  viewer: Viewer;
  projects: ProjectSummary[];
  flashCode?: string | null;
}

export function ProjectsOverview({
  viewer,
  projects,
  flashCode,
}: ProjectsOverviewProps) {
  const { locale, setLocale } = useLocaleSync();
  const copy = getAccountCopy(locale);
  const flash =
    flashCode === "saved"
      ? copy.flashSaved
      : flashCode === "cover-updated"
        ? copy.flashCoverUpdated
        : null;

  useEffect(() => {
    document.title = `${copy.projectsTitle} | desAIn`;
  }, [copy.projectsTitle]);

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_18%_10%,rgba(78,168,255,0.12),transparent_24%),radial-gradient(circle_at_82%_8%,rgba(255,179,108,0.12),transparent_22%),linear-gradient(180deg,#070b10,#0b1016)] px-4 py-6 md:px-6">
      <div className="mx-auto max-w-[1360px]">
        <section className="rounded-[1.8rem] border border-white/10 bg-[#0d141d]/92 px-6 py-6 shadow-[0_24px_70px_rgba(0,0,0,0.38)] backdrop-blur-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#24405a] bg-[#102234] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8cb9ff]">
                <Sparkles className="h-3.5 w-3.5" />
                {copy.projectsWelcome(viewer.username)}
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-[0] text-white md:text-4xl">
                {copy.projectsTitle}
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-400 md:text-base">
                {copy.projectsDescription}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex h-12 items-center gap-1 rounded-full border border-white/10 bg-[#0f1720] p-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                <span className="hidden items-center gap-1.5 px-2 md:inline-flex">
                  <Languages className="h-3 w-3" />
                  {copy.language}
                </span>
                <button
                  type="button"
                  onClick={() => setLocale("tr")}
                  aria-pressed={locale === "tr"}
                  className={`h-9 rounded-full px-3 transition ${
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
                  className={`h-9 rounded-full px-3 transition ${
                    locale === "en"
                      ? "bg-[#102234] text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {copy.english}
                </button>
              </div>
              <Link
                href="/?draft=1"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#4ea8ff] bg-[#102234] px-5 text-sm font-semibold text-white transition hover:border-[#76beff]"
              >
                <LayoutTemplate className="h-4 w-4" />
                {copy.newProject}
              </Link>
            </div>
          </div>

          {flash ? (
            <div className="mt-5 rounded-2xl border border-[#245d44] bg-[#102219] px-4 py-3 text-sm text-[#b9f5d0]">
              {flash}
            </div>
          ) : null}
        </section>

        {projects.length ? (
          <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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
                    <div>
                      <h2 className="text-xl font-semibold text-white">{project.name}</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        {project.description || copy.noDescription}
                      </p>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                      {copy.itemCount(project.itemCount)}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>
                      {copy.lastUpdated}:{" "}
                      {new Date(project.updatedAt).toLocaleString(
                        locale === "en" ? "en-US" : "tr-TR",
                      )}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href={`/?projectId=${project.id}`}
                      className="inline-flex h-11 items-center gap-2 rounded-full border border-[#4ea8ff] bg-[#102234] px-4 text-sm font-semibold text-white transition hover:border-[#76beff]"
                    >
                      <FolderOpen className="h-4 w-4" />
                      {copy.openProject}
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="mt-6 rounded-[1.6rem] border border-dashed border-white/12 bg-[#0d141d]/84 px-6 py-12 text-center">
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
              <Link
                href="/?draft=1"
                className="mt-6 inline-flex h-12 items-center gap-2 rounded-full border border-[#4ea8ff] bg-[#102234] px-5 text-sm font-semibold text-white transition hover:border-[#76beff]"
              >
                {copy.startDesign}
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
