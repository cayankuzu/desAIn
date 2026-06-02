"use client";

import Image from "next/image";
import { useState } from "react";
import {
  ArrowLeft,
  Camera,
  FolderPlus,
  Languages,
  LoaderCircle,
  Save,
} from "lucide-react";
import {
  PROJECT_DESCRIPTION_MAX_LENGTH,
  PROJECT_NAME_MAX_LENGTH,
  PROJECT_NAME_MIN_LENGTH,
} from "@/lib/appLimits";
import {
  getAccountCopy,
  localizeApiMessage,
} from "@/lib/i18n/accountTranslations";
import { useLocaleSync } from "@/lib/i18n/useLocaleSync";
import type { EditorProject } from "@/types/project";

interface ProjectSaveDialogProps {
  open: boolean;
  currentProject: EditorProject | null;
  initialCoverImageDataUrl: string | null;
  onClose: () => void;
  onCaptureCover: () => void;
  onSave: (payload: {
    name: string;
    description: string;
    coverImageDataUrl: string | null;
  }) => Promise<void>;
}

export function ProjectSaveDialog({
  open,
  currentProject,
  initialCoverImageDataUrl,
  onClose,
  onCaptureCover,
  onSave,
}: ProjectSaveDialogProps) {
  const { locale, setLocale } = useLocaleSync();
  const copy = getAccountCopy(locale);
  const [name, setName] = useState(currentProject?.name ?? copy.defaultProjectName);
  const [description, setDescription] = useState(currentProject?.description ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  const trimmedName = name.trim();
  const saveDisabled =
    submitting || trimmedName.length < PROJECT_NAME_MIN_LENGTH;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#03070bcc] px-4 py-6 backdrop-blur-md">
      <div className="relative w-full max-w-3xl rounded-[1.8rem] border border-white/10 bg-[#0c131b]/96 p-6 shadow-[0_28px_80px_rgba(0,0,0,0.52)]">
        <div className="mb-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-[#0f1720] px-4 text-sm font-semibold text-slate-300 transition hover:border-[#32516c] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {copy.back}
          </button>

          <div className="flex items-center gap-2">
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
          </div>
        </div>

        <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#8cb9ff]">
          {copy.saveWindowEyebrow}
        </div>
        <h2 className="mt-2 text-2xl font-semibold text-white">
          {currentProject ? copy.saveWindowUpdateTitle : copy.saveWindowCreateTitle}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          {copy.saveWindowDescription}
        </p>
        {currentProject ? (
          <div className="mt-4 rounded-[1.2rem] border border-[#24405a] bg-[#102234]/72 px-4 py-3 text-sm text-slate-200">
            <div className="font-semibold text-white">{copy.updateCurrentProjectTitle}</div>
            <div className="mt-1 leading-6 text-slate-300">
              {copy.updateCurrentProjectBody(currentProject.name)}
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {copy.projectName}
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={PROJECT_NAME_MAX_LENGTH}
                className="w-full rounded-2xl border border-white/10 bg-[#0f1720] px-4 py-3 text-sm text-white outline-none transition focus:border-[#4ea8ff]"
                placeholder={copy.projectNamePlaceholder}
              />
              <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                <span>{copy.projectNameLimitHint(PROJECT_NAME_MIN_LENGTH, PROJECT_NAME_MAX_LENGTH)}</span>
                <span>{copy.characterCounter(name.length, PROJECT_NAME_MAX_LENGTH)}</span>
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {copy.projectDescription}
              </span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={PROJECT_DESCRIPTION_MAX_LENGTH}
                rows={5}
                className="w-full rounded-2xl border border-white/10 bg-[#0f1720] px-4 py-3 text-sm text-white outline-none transition focus:border-[#4ea8ff]"
                placeholder={copy.projectDescriptionPlaceholder}
              />
              <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                <span>{copy.projectDescriptionLimitHint(PROJECT_DESCRIPTION_MAX_LENGTH)}</span>
                <span>{copy.characterCounter(description.length, PROJECT_DESCRIPTION_MAX_LENGTH)}</span>
              </div>
            </label>

            {errorMessage ? (
              <div className="rounded-2xl border border-[#6e2a2a] bg-[#261313] px-4 py-3 text-sm text-[#ffb2b2]">
                {errorMessage}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={async () => {
                  setSubmitting(true);
                  setErrorMessage(null);

                  try {
                    await onSave({
                      name,
                      description,
                      coverImageDataUrl: initialCoverImageDataUrl,
                    });
                  } catch (error) {
                    setErrorMessage(
                      error instanceof Error
                        ? localizeApiMessage(error.message, locale) ?? copy.projectSaveFailure
                        : copy.projectSaveFailure,
                    );
                  } finally {
                    setSubmitting(false);
                  }
                }}
                disabled={saveDisabled}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-[#4ea8ff] bg-[#102234] px-5 text-sm font-semibold text-white transition hover:border-[#76beff] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {currentProject ? copy.saveChanges : copy.createProject}
              </button>
              <button
                type="button"
                onClick={onCaptureCover}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-[#0f1720] px-5 text-sm font-semibold text-slate-300 transition hover:border-[#32516c] hover:text-white"
              >
                <Camera className="h-4 w-4" />
                {copy.retakeCover}
              </button>
            </div>
          </div>

          <div className="rounded-[1.55rem] border border-white/10 bg-[#0f1720] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8cb9ff]">
                  {copy.coverTitle}
                </div>
                <div className="mt-1 text-sm text-slate-400">
                  {copy.coverHelp}
                </div>
              </div>
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#24405a] bg-[#102234] text-[#8cb9ff]">
                <FolderPlus className="h-4 w-4" />
              </div>
            </div>

            <div className="overflow-hidden rounded-[1.2rem] border border-white/10 bg-[#0a1017]">
              {initialCoverImageDataUrl ? (
                <Image
                  src={initialCoverImageDataUrl}
                  alt={copy.coverAlt}
                  width={1200}
                  height={900}
                  unoptimized
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="aspect-[4/3] w-full bg-[radial-gradient(circle_at_18%_16%,rgba(255,179,108,0.18),transparent_28%),radial-gradient(circle_at_82%_14%,rgba(78,168,255,0.18),transparent_26%),linear-gradient(180deg,#0b1016,#0e1620)]" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
