"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Languages,
  LoaderCircle,
  Mail,
  UserRound,
} from "lucide-react";
import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from "@/lib/appLimits";
import {
  getAccountCopy,
  localizeApiMessage,
} from "@/lib/i18n/accountTranslations";
import { useLocaleSync } from "@/lib/i18n/useLocaleSync";
import type { ProjectDraftPayload, ProjectSummary, Viewer } from "@/types/project";

type AuthMode = "login" | "register" | "forgot" | "reset";

type AuthSuccessPayload = {
  user?: Viewer | null;
  project?: ProjectSummary | null;
  previewUrl?: string | null;
};

interface AuthFormProps {
  mode: AuthMode;
  redirectTo?: string;
  resetToken?: string | null;
  initialProjectDraft?: ProjectDraftPayload;
  onSuccess?: (payload: AuthSuccessPayload) => void;
  compact?: boolean;
  showHeader?: boolean;
  showModeFooter?: boolean;
  showForgotLink?: boolean;
  onRequestModeChange?: (mode: Exclude<AuthMode, "reset">) => void;
  onResetSuccess?: () => void;
}

const endpointByMode: Record<AuthMode, string> = {
  login: "/api/auth/login",
  register: "/api/auth/register",
  forgot: "/api/auth/forgot-password",
  reset: "/api/auth/reset-password",
};

const pageLinks = {
  login: "/giris",
  register: "/kayit",
  forgot: "/sifremi-unuttum",
};

const inputClassName =
  "w-full rounded-2xl border border-white/10 bg-[#0f1720] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[#4ea8ff]";

export function AuthForms({
  mode,
  redirectTo = "/projelerim",
  resetToken,
  initialProjectDraft,
  onSuccess,
  compact = false,
  showHeader = true,
  showModeFooter = true,
  showForgotLink = true,
  onRequestModeChange,
  onResetSuccess,
}: AuthFormProps) {
  const router = useRouter();
  const { locale, setLocale } = useLocaleSync();
  const copy = getAccountCopy(locale);
  const currentTitle = copy.authTitle[mode];
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const panelClassName = useMemo(
    () =>
      compact
        ? "rounded-[1.4rem] border border-white/10 bg-[#0c131b] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.42)]"
        : "rounded-[1.8rem] border border-white/10 bg-[#0c131b]/96 p-7 shadow-[0_24px_70px_rgba(0,0,0,0.48)] backdrop-blur-xl",
    [compact],
  );
  const passwordPlaceholder =
    mode === "login"
      ? copy.passwordPlaceholder.login
      : mode === "reset"
        ? copy.passwordPlaceholder.reset
        : copy.passwordPlaceholder.register;
  const submitDisabled =
    submitting ||
    (mode === "register" && username.trim().length < USERNAME_MIN_LENGTH);
  const getModeHref = (targetMode: Exclude<AuthMode, "reset">) => {
    const basePath = pageLinks[targetMode];
    if (targetMode === "forgot") {
      return basePath;
    }

    return `${basePath}?redirect=${encodeURIComponent(redirectTo)}`;
  };

  const handleModeChange = (targetMode: Exclude<AuthMode, "reset">) => {
    if (onRequestModeChange) {
      onRequestModeChange(targetMode);
      return;
    }

    router.push(getModeHref(targetMode), { scroll: false });
  };

  useEffect(() => {
    document.title = `${currentTitle} | desAIn`;
  }, [currentTitle]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setPreviewUrl(null);

    const payload =
      mode === "register"
        ? {
            email,
            username,
            password,
            initialProjectDraft,
          }
        : mode === "login"
          ? {
              email,
              password,
              initialProjectDraft,
            }
          : mode === "forgot"
            ? { email }
            : { token: resetToken, password };

    try {
      const response = await fetch(endpointByMode[mode], {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as {
        ok: boolean;
        message?: string;
        user?: Viewer | null;
        project?: ProjectSummary | null;
        previewUrl?: string | null;
      };

      if (!response.ok || !json.ok) {
        setErrorMessage(
          localizeApiMessage(json.message, locale) ?? copy.errorFallback,
        );
        return;
      }

      if (mode === "forgot") {
        setSuccessMessage(copy.forgotSuccess);
        setPreviewUrl(json.previewUrl ?? null);
        return;
      }

      if (mode === "reset") {
        setSuccessMessage(copy.resetSuccess);
        window.setTimeout(() => {
          if (onResetSuccess) {
            onResetSuccess();
            return;
          }

          router.push(`/giris?redirect=${encodeURIComponent(redirectTo)}`, {
            scroll: false,
          });
        }, 900);
        return;
      }

      if (onSuccess) {
        onSuccess({
          user: json.user ?? null,
          project: json.project ?? null,
        });
      } else {
        router.replace(redirectTo, { scroll: false });
      }
    } catch {
      setErrorMessage(copy.networkError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={panelClassName}>
      {showHeader ? (
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold tracking-[0.18em] text-[#8cb9ff]">
              {copy.brand}
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-[0] text-white">
              {currentTitle}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
              {copy.authDescription[mode]}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
              <span className="hidden items-center gap-1.5 px-2 md:inline-flex">
                <Languages className="h-3 w-3" />
                {copy.language}
              </span>
              <button
                type="button"
                onClick={() => setLocale("tr")}
                aria-pressed={locale === "tr"}
                className={`rounded-full px-2.5 py-1 transition ${
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
                className={`rounded-full px-2.5 py-1 transition ${
                  locale === "en"
                    ? "bg-[#102234] text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {copy.english}
              </button>
            </div>
            {!compact ? (
              <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300 md:block">
                {copy.secureBadge}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {initialProjectDraft && (mode === "register" || mode === "login") ? (
        <div className="mt-5 rounded-2xl border border-[#4ea8ff]/35 bg-[#102234]/78 px-4 py-3 text-sm text-slate-200">
          <div className="font-semibold text-white">{copy.draftSaveNoticeTitle}</div>
          <p className="mt-1 leading-6 text-slate-300">{copy.draftSaveNoticeBody}</p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {mode === "register" ? (
          <label className="block">
            <span className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              <UserRound className="h-3.5 w-3.5" />
              {copy.username}
            </span>
            <input
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              minLength={USERNAME_MIN_LENGTH}
              maxLength={USERNAME_MAX_LENGTH}
              className={inputClassName}
              placeholder={copy.usernamePlaceholder}
            />
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
              <span>{copy.profileUsernameHelp(USERNAME_MIN_LENGTH, USERNAME_MAX_LENGTH)}</span>
              <span>{copy.characterCounter(username.length, USERNAME_MAX_LENGTH)}</span>
            </div>
          </label>
        ) : null}

        {mode !== "reset" ? (
          <label className="block">
            <span className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              <Mail className="h-3.5 w-3.5" />
              {copy.email}
            </span>
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClassName}
              placeholder={copy.emailPlaceholder}
            />
          </label>
        ) : null}

        {mode !== "forgot" ? (
          <label className="block">
            <span className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              <KeyRound className="h-3.5 w-3.5" />
              {copy.password}
            </span>
            <div className="relative">
              <input
                required
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={`${inputClassName} pr-13`}
                placeholder={passwordPlaceholder}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-full border border-white/10 bg-[#121c27] px-2 py-1 text-[11px] font-semibold text-slate-300 transition hover:border-[#32516c] hover:text-white"
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showPassword ? copy.hidePassword : copy.showPassword}
              </button>
            </div>
          </label>
        ) : null}

        {mode === "login" && showForgotLink ? (
          <div className="flex justify-end">
            {onRequestModeChange ? (
              <button
                type="button"
                onClick={() => handleModeChange("forgot")}
                className="text-sm font-medium text-[#8cb9ff] transition hover:text-white"
              >
                {copy.forgotPassword}
              </button>
            ) : (
              <Link
                href={getModeHref("forgot")}
                className="text-sm font-medium text-[#8cb9ff] transition hover:text-white"
              >
                {copy.forgotPassword}
              </Link>
            )}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-2xl border border-[#6e2a2a] bg-[#261313] px-4 py-3 text-sm text-[#ffb2b2]">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-2xl border border-[#245d44] bg-[#102219] px-4 py-3 text-sm text-[#b9f5d0]">
            <div>{successMessage}</div>
            {previewUrl ? (
              <div className="mt-3 rounded-xl border border-white/10 bg-[#0d141d] p-3 text-xs text-slate-300">
                <div className="mb-2 font-semibold uppercase tracking-[0.16em] text-[#8cb9ff]">
                  {copy.localResetLink}
                </div>
                <Link
                  href={previewUrl}
                  className="break-all text-[#8cb9ff] transition hover:text-white"
                >
                  {previewUrl}
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitDisabled}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#4ea8ff] bg-[#102234] px-4 py-3 text-sm font-semibold text-white transition hover:border-[#76beff] hover:bg-[#15304b] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {copy.submit[mode]}
        </button>
      </form>

      {showModeFooter && (mode === "login" || mode === "register") ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-5 text-sm text-slate-400">
          <div>
            {mode === "login" ? copy.noAccount : copy.hasAccount}
          </div>
          <div className="flex items-center gap-3">
            {mode === "login" ? (
              onRequestModeChange ? (
                <button
                  type="button"
                  onClick={() => handleModeChange("register")}
                  className="font-semibold text-[#8cb9ff] transition hover:text-white"
                >
                  {copy.authTabs.register}
                </button>
              ) : (
                <Link
                  href={getModeHref("register")}
                  className="font-semibold text-[#8cb9ff] transition hover:text-white"
                >
                  {copy.authTabs.register}
                </Link>
              )
            ) : (
              onRequestModeChange ? (
                <button
                  type="button"
                  onClick={() => handleModeChange("login")}
                  className="font-semibold text-[#8cb9ff] transition hover:text-white"
                >
                  {copy.authTabs.login}
                </button>
              ) : (
                <Link
                  href={getModeHref("login")}
                  className="font-semibold text-[#8cb9ff] transition hover:text-white"
                >
                  {copy.authTabs.login}
                </Link>
              )
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
