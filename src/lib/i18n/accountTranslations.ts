import type { Locale } from "@/lib/i18n/translations";

export type AuthCopyMode = "login" | "register" | "forgot" | "reset";
export type AccountWorkspaceTab =
  | "projects"
  | "profile"
  | "login"
  | "register"
  | "forgot"
  | "reset";

export const accountCopy = {
  en: {
    brand: "desAIn",
    workspaceTitle: "Account workspace",
    secureBadge: "Secure project workspace",
    language: "Language",
    turkish: "TR",
    english: "EN",
    authTabs: {
      login: "Sign in",
      register: "Create account",
      forgot: "Forgot password",
    },
    workspaceTabs: {
      projects: "My projects",
      profile: "Profile",
    },
    authTitle: {
      login: "Sign in",
      register: "Create account",
      forgot: "Forgot password",
      reset: "Set a new password",
    },
    authDescription: {
      login: "Securely access your projects, saved rooms, and latest edits.",
      register:
        "Create a professional project archive, save your rooms, and continue anytime.",
      forgot:
        "Enter your email. In local development, the reset link is also shown here.",
      reset: "Choose a new password. Then you can sign in again.",
    },
    username: "Username",
    email: "Email",
    password: "Password",
    usernamePlaceholder: "sample.user",
    emailPlaceholder: "name@example.com",
    passwordPlaceholder: {
      login: "Enter your password",
      register: "At least 8 characters",
      reset: "At least 8 characters",
    },
    showPassword: "Show",
    hidePassword: "Hide",
    forgotPassword: "Forgot password?",
    submit: {
      login: "Sign in",
      register: "Create account",
      forgot: "Create reset link",
      reset: "Update password",
    },
    noAccount: "No account yet?",
    hasAccount: "Already have an account?",
    errorFallback: "The operation could not be completed.",
    networkError: "A connection problem occurred. Please try again.",
    forgotSuccess:
      "If an account exists with this email, a password reset link was created.",
    resetSuccess: "Your password was updated. You can sign in now.",
    localResetLink: "Local development link",
    characterCounter: (current: number, max: number) => `${current} / ${max}`,
    draftSaveNoticeTitle: "Save this room as a project",
    draftSaveNoticeBody:
      "Create an account or sign in to save the room you just designed. After authentication, it will appear in My projects automatically.",
    accountBarEyebrow: "Account and project center",
    accountSignedIn: (username: string) =>
      `${username}, you can safely continue working on your projects.`,
    accountSignedOut:
      "Use your account to save drafts, create project covers, and continue on any device.",
    myProjects: "My projects",
    profile: "Profile",
    logout: "Sign out",
    closeProject: "Close project",
    activeProjectLabel: "Open project",
    activeProjectEmpty: "Draft room",
    saveWindowEyebrow: "Project save window",
    saveWindowCreateTitle: "Turn this room into a project",
    saveWindowUpdateTitle: "Update project",
    saveWindowDescription:
      "Project name, description, and cover are managed here. The cover is always generated from this room viewport.",
    projectName: "Project name",
    projectNamePlaceholder: "Example: Open kitchen layout",
    projectNameLimitHint: (min: number, max: number) =>
      `Use ${min}-${max} characters.`,
    projectDescription: "Description",
    projectDescriptionPlaceholder:
      "What need does this project solve, which room type is it, and which decisions were made?",
    projectDescriptionLimitHint: (max: number) =>
      `Use up to ${max} characters.`,
    createProject: "Create project",
    saveChanges: "Save changes",
    retakeCover: "Retake cover",
    coverTitle: "Cover image",
    coverHelp: "The latest room viewport is used by default.",
    coverAlt: "Project cover image",
    defaultProjectName: "New project",
    coverCaptureTitle: "Capture cover",
    coverCaptureHint:
      "Adjust the camera to the angle you want, then press the icon to create the cover.",
    coverCaptureDetail:
      "Drag the scene to find the right angle. When the frame looks right, capture the cover.",
    coverCaptureResetView: "Reset view",
    back: "Back",
    close: "Close",
    returnToEditor: "Return to editor",
    projectsWelcome: (username: string) => `Welcome, ${username}`,
    projectsTitle: "My projects",
    projectsDescription:
      "Your saved rooms, cover images, and project metadata live here. Open any project to continue where you left off, or start a fresh project from a clean draft room.",
    newProject: "New project",
    noDescription: "No description has been added for this project yet.",
    itemCount: (count: number) => `${count} ${count === 1 ? "item" : "items"}`,
    lastUpdated: "Last updated",
    openProject: "Open project",
    deleteProject: "Delete project",
    updateCover: "Update cover",
    emptyProjectsTitle: "You do not have any saved projects yet",
    emptyProjectsDescription:
      "Design a room in the editor, then use the save flow in the top bar to archive your first project with a name, description, and cover frame.",
    startDesign: "Start designing",
    loadingProjects: "Loading your projects...",
    projectsLoadError: "Projects could not be loaded right now.",
    retryLoad: "Retry",
    flashSaved: "Your project was saved successfully.",
    flashDeleted: "Project deleted.",
    flashCoverUpdated: "Cover image updated.",
    savedToastTitle: "Project saved",
    savedToastDetail: (name: string) =>
      `"${name}" is now available in your project list.`,
    updatedToastTitle: "Project updated",
    updatedToastDetail: (name: string) =>
      `"${name}" was updated in the current project.`,
    firstProjectToastTitle: "Account created and your first project was saved",
    firstProjectToastDetail: (name: string) =>
      `"${name}" is ready in My projects.`,
    projectSaveFailure: "Project could not be saved.",
    projectDeleteFailure: "Project could not be deleted.",
    coverCreateFailure: "Cover image could not be created",
    coverUpdateFailure: "Cover could not be updated.",
    retry: "Please try again.",
    viewportNotReady: "Viewport is not ready. Please try again after the scene loads.",
    saveTooltipSignedIn: "Save this project to your account",
    saveTooltipSignedOut: "Sign in or create an account to save this design",
    updateCurrentProjectTitle: "Save changes to the open project",
    updateCurrentProjectBody: (name: string) =>
      `This action updates "${name}" directly instead of creating a new project.`,
    deleteProjectConfirmTitle: "Delete this project?",
    deleteProjectConfirmBody: (name: string) =>
      `"${name}" will be permanently removed from your project archive.`,
    deleteProjectConfirmAction: "Delete project",
    deletingProject: "Deleting...",
    profileTitle: "Profile",
    profileDescription:
      "Manage your account details and jump back into your project archive from one stable panel.",
    profileUsername: "Username",
    profileEmail: "Email",
    profileProjectCount: "Saved projects",
    profileUsernameHelp: (min: number, max: number) =>
      `Use ${min}-${max} characters.`,
    profileSaveUsername: "Save username",
    profileSavingUsername: "Saving...",
    profileUsernameSavedTitle: "Username updated",
    profileUsernameSavedDetail: "Your account name is now current across the app.",
    profileResetPasswordEmailTitle: "Password reset email",
    profileResetPasswordEmailDescription:
      "Send a password reset link to your email address for account recovery.",
    profileSendResetEmail: "Send reset email",
    profileSendResetEmailSubmitting: "Sending...",
    profileResetEmailConfirmTitle: "Send password reset email?",
    profileResetEmailConfirmBody: (email: string) =>
      `A reset link will be prepared for ${email}.`,
    profileResetEmailConfirmAction: "Send email",
    profileResetEmailSentTitle: "Password reset email prepared",
    profileResetEmailSentDetail:
      "If email delivery is active, the reset link is on its way.",
    profileResetEmailPreviewLabel: "Local preview link",
    unsavedChangesTitle: "Save your changes before leaving?",
    unsavedCloseProjectBody: (projectName: string | null) =>
      projectName
        ? `There are unsaved changes in "${projectName}". Save them before closing this project.`
        : "There are unsaved changes in this draft room. Save them before closing it.",
    unsavedOpenProjectBody: (projectName: string | null) =>
      projectName
        ? `There are unsaved changes in "${projectName}". Save them before opening another project.`
        : "There are unsaved changes in this draft room. Save them before opening another project.",
    unsavedNewProjectBody: (projectName: string | null) =>
      projectName
        ? `There are unsaved changes in "${projectName}". Save them before starting a new project.`
        : "There are unsaved changes in this draft room. Save them before starting a new project.",
    unsavedLogoutBody: (projectName: string | null) =>
      projectName
        ? `There are unsaved changes in "${projectName}". Save them before signing out.`
        : "There are unsaved changes in this draft room. Save them before signing out.",
    unsavedChangesHint:
      "If you continue without saving, the latest room layout and cover frame will be lost.",
    saveAndContinue: "Save and continue",
    saveAndClose: "Save and close",
    signInAndSave: "Sign in and save",
    signInSaveAndClose: "Sign in, save, and close",
    continueWithoutSaving: "Continue without saving",
    closeWithoutSaving: "Close without saving",
    stayHere: "Stay here",
    logoutConfirmTitle: "Sign out?",
    logoutConfirmBody:
      "You will leave your active session on this device. Your saved projects will stay in your account.",
    logoutConfirmAction: "Sign out",
    cancel: "Cancel",
    lockTransformTitle: "Locked selection",
    lockTransformDetail:
      "Unlock the selected item before using move or rotate.",
  },
  tr: {
    brand: "desAIn",
    workspaceTitle: "Hesap alan\u0131",
    secureBadge: "G\u00fcvenli proje alan\u0131",
    language: "Dil",
    turkish: "TR",
    english: "EN",
    authTabs: {
      login: "Giri\u015f yap",
      register: "Hesap olu\u015ftur",
      forgot: "\u015eifremi unuttum",
    },
    workspaceTabs: {
      projects: "Projelerim",
      profile: "Profil",
    },
    authTitle: {
      login: "Giri\u015f yap",
      register: "Hesap olu\u015ftur",
      forgot: "\u015eifremi unuttum",
      reset: "Yeni \u015fifre belirle",
    },
    authDescription: {
      login:
        "Projelerine, kay\u0131tl\u0131 odalar\u0131na ve son d\u00fczenlemelerine g\u00fcvenli \u015fekilde ula\u015f.",
      register:
        "Profesyonel proje ar\u015fivini olu\u015ftur, odalar\u0131n\u0131 kaydet ve istedi\u011fin zaman kald\u0131\u011f\u0131n yerden devam et.",
      forgot:
        "E-posta adresini gir. Geli\u015ftirme modunda \u015fifre s\u0131f\u0131rlama ba\u011flant\u0131s\u0131n\u0131 burada da g\u00f6sterece\u011fiz.",
      reset:
        "Yeni \u015fifreni belirle. Sonras\u0131nda hesab\u0131na tekrar giri\u015f yapabileceksin.",
    },
    username: "Kullan\u0131c\u0131 ad\u0131",
    email: "E-posta",
    password: "\u015eifre",
    usernamePlaceholder: "ornek.kullanici",
    emailPlaceholder: "ad@ornek.com",
    passwordPlaceholder: {
      login: "\u015eifreni gir",
      register: "En az 8 karakter",
      reset: "En az 8 karakter",
    },
    showPassword: "G\u00f6ster",
    hidePassword: "Gizle",
    forgotPassword: "\u015eifremi unuttum",
    submit: {
      login: "Giri\u015f yap",
      register: "Hesab\u0131 olu\u015ftur",
      forgot: "S\u0131f\u0131rlama ba\u011flant\u0131s\u0131 olu\u015ftur",
      reset: "\u015eifreyi g\u00fcncelle",
    },
    noAccount: "Hesab\u0131n yok mu?",
    hasAccount: "Zaten bir hesab\u0131n var m\u0131?",
    errorFallback: "\u0130\u015flem tamamlanamad\u0131.",
    networkError:
      "Ba\u011flant\u0131 kurulurken bir sorun olu\u015ftu. L\u00fctfen tekrar deneyin.",
    forgotSuccess:
      "E\u011fer bu e-posta ile bir hesap varsa \u015fifre s\u0131f\u0131rlama ba\u011flant\u0131s\u0131 olu\u015fturuldu.",
    resetSuccess:
      "\u015eifren g\u00fcncellendi. \u015eimdi hesab\u0131na giri\u015f yapabilirsin.",
    localResetLink: "Yerel geli\u015ftirme ba\u011flant\u0131s\u0131",
    characterCounter: (current: number, max: number) => `${current} / ${max}`,
    draftSaveNoticeTitle: "Bu oday\u0131 proje olarak kaydet",
    draftSaveNoticeBody:
      "Az \u00f6nce tasarlad\u0131\u011f\u0131n oday\u0131 kaydetmek i\u00e7in hesap olu\u015ftur veya giri\u015f yap. Kimlik do\u011frulama tamamlan\u0131nca otomatik olarak Projelerim listene eklenecek.",
    accountBarEyebrow: "Hesap ve proje merkezi",
    accountSignedIn: (username: string) =>
      `${username}, projelerine g\u00fcvenli \u015fekilde devam edebilirsin.`,
    accountSignedOut:
      "Taslak \u00e7al\u0131\u015fman\u0131 kaydetmek, proje kapa\u011f\u0131 olu\u015fturmak ve her cihazda devam etmek i\u00e7in hesab\u0131n\u0131 kullan.",
    myProjects: "Projelerim",
    profile: "Profil",
    logout: "\u00c7\u0131k\u0131\u015f yap",
    closeProject: "Projeyi kapat",
    activeProjectLabel: "A\u00e7\u0131k proje",
    activeProjectEmpty: "Taslak oda",
    saveWindowEyebrow: "Proje kay\u0131t penceresi",
    saveWindowCreateTitle: "Oday\u0131 projeye d\u00f6n\u00fc\u015ft\u00fcr",
    saveWindowUpdateTitle: "Projeyi g\u00fcncelle",
    saveWindowDescription:
      "Kapak g\u00f6rseli, proje ad\u0131 ve a\u00e7\u0131klamas\u0131 burada y\u00f6netilir. Kapak foto\u011fraf\u0131 daima bu odan\u0131n viewport g\u00f6r\u00fcnt\u00fcs\u00fcnden \u00fcretilir.",
    projectName: "Proje ad\u0131",
    projectNamePlaceholder: "\u00d6rnek: A\u00e7\u0131k mutfak yerle\u015fimi",
    projectNameLimitHint: (min: number, max: number) =>
      `${min}-${max} karakter kullan\u0131n.`,
    projectDescription: "A\u00e7\u0131klama",
    projectDescriptionPlaceholder:
      "Bu proje hangi ihtiyac\u0131 \u00e7\u00f6zer, hangi oda t\u00fcr\u00fcne aittir ve hangi kararlar al\u0131nm\u0131\u015ft\u0131r?",
    projectDescriptionLimitHint: (max: number) =>
      `En fazla ${max} karakter kullan\u0131n.`,
    createProject: "Projeyi olu\u015ftur",
    saveChanges: "De\u011fi\u015fiklikleri kaydet",
    retakeCover: "Kapa\u011f\u0131 yeniden \u00e7ek",
    coverTitle: "Kapak foto\u011fraf\u0131",
    coverHelp: "Varsay\u0131lan olarak mevcut odan\u0131n son g\u00f6r\u00fcnt\u00fcs\u00fc kullan\u0131l\u0131r.",
    coverAlt: "Proje kapak g\u00f6rseli",
    defaultProjectName: "Yeni proje",
    coverCaptureTitle: "Kapa\u011f\u0131 \u00e7ek",
    coverCaptureHint:
      "Kameray\u0131 istedi\u011fin a\u00e7\u0131ya getir, sonra ikonla kapa\u011f\u0131 olu\u015ftur.",
    coverCaptureDetail:
      "Sahnede gezip istedi\u011fin a\u00e7\u0131y\u0131 ayarla. Kadraj haz\u0131r olunca kapa\u011f\u0131 \u00e7ek.",
    coverCaptureResetView: "G\u00f6r\u00fcn\u00fcm\u00fc s\u0131f\u0131rla",
    back: "Geri",
    close: "Kapat",
    returnToEditor: "Edit\u00f6re d\u00f6n",
    projectsWelcome: (username: string) => `Ho\u015f geldin, ${username}`,
    projectsTitle: "Projelerim",
    projectsDescription:
      "Kay\u0131tl\u0131 odalar\u0131n, kapak foto\u011fraflar\u0131n ve proje meta verilerin burada. \u0130stedi\u011fin projeye gir, kald\u0131\u011f\u0131n yerden devam et ya da temiz bir taslak odadan yeni proje ba\u015flat.",
    newProject: "Yeni proje",
    noDescription: "Bu proje i\u00e7in hen\u00fcz a\u00e7\u0131klama eklenmemi\u015f.",
    itemCount: (count: number) => `${count} \u00f6\u011fe`,
    lastUpdated: "Son g\u00fcncelleme",
    openProject: "Projeyi a\u00e7",
    deleteProject: "Projeyi sil",
    updateCover: "Kapa\u011f\u0131 g\u00fcncelle",
    emptyProjectsTitle: "Hen\u00fcz kay\u0131tl\u0131 projen yok",
    emptyProjectsDescription:
      "Edit\u00f6rde bir oda d\u00fczenlemesi yap, sonra \u00fcst bardaki kaydet ak\u0131\u015f\u0131ndan proje ad\u0131n\u0131, a\u00e7\u0131klamas\u0131n\u0131 ve kapak karesini belirleyerek ilk projen olarak ar\u015fivle.",
    startDesign: "Tasarlamaya ba\u015fla",
    loadingProjects: "Projelerin y\u00fckleniyor...",
    projectsLoadError: "Projeler \u015fu anda y\u00fcklenemedi.",
    retryLoad: "Tekrar dene",
    flashSaved: "Projen ba\u015far\u0131yla kaydedildi.",
    flashDeleted: "Proje silindi.",
    flashCoverUpdated: "Kapak foto\u011fraf\u0131 g\u00fcncellendi.",
    savedToastTitle: "Proje kaydedildi",
    savedToastDetail: (name: string) =>
      `"${name}" art\u0131k hesab\u0131ndaki projeler listesinde yer al\u0131yor.`,
    updatedToastTitle: "Proje g\u00fcncellendi",
    updatedToastDetail: (name: string) =>
      `"${name}" mevcut proje \u00fczerinde g\u00fcncellendi.`,
    firstProjectToastTitle: "Hesap olu\u015fturuldu ve ilk projen kaydedildi",
    firstProjectToastDetail: (name: string) =>
      `"${name}" art\u0131k Projelerim alan\u0131nda haz\u0131r.`,
    projectSaveFailure: "Proje kaydedilemedi.",
    projectDeleteFailure: "Proje silinemedi.",
    coverCreateFailure: "Kapak g\u00f6rseli olu\u015fturulamad\u0131.",
    coverUpdateFailure: "Kapak g\u00fcncellenemedi.",
    retry: "L\u00fctfen tekrar deneyin.",
    viewportNotReady:
      "Viewport haz\u0131r de\u011fil. L\u00fctfen sahne y\u00fcklenince tekrar deneyin.",
    saveTooltipSignedIn: "Projeyi hesab\u0131na kaydet",
    saveTooltipSignedOut:
      "Bu tasar\u0131m\u0131 kaydetmek i\u00e7in giri\u015f yap veya hesap olu\u015ftur",
    updateCurrentProjectTitle: "A\u00e7\u0131k projeye kaydet",
    updateCurrentProjectBody: (name: string) =>
      `Bu i\u015flem yeni proje olu\u015fturmaz, "${name}" \u00fczerine kaydeder.`,
    deleteProjectConfirmTitle: "Bu proje silinsin mi?",
    deleteProjectConfirmBody: (name: string) =>
      `"${name}" proje ar\u015fivinden kal\u0131c\u0131 olarak silinecek.`,
    deleteProjectConfirmAction: "Projeyi sil",
    deletingProject: "Siliniyor...",
    profileTitle: "Profil",
    profileDescription:
      "Hesap bilgilerini y\u00f6net ve proje ar\u015fivine ayn\u0131 sabit panelden ge\u00e7i\u015f yap.",
    profileUsername: "Kullan\u0131c\u0131 ad\u0131",
    profileEmail: "E-posta",
    profileProjectCount: "Kay\u0131tl\u0131 proje",
    profileUsernameHelp: (min: number, max: number) =>
      `${min}-${max} karakter kullan\u0131n.`,
    profileSaveUsername: "Kullan\u0131c\u0131 ad\u0131n\u0131 kaydet",
    profileSavingUsername: "Kaydediliyor...",
    profileUsernameSavedTitle: "Kullan\u0131c\u0131 ad\u0131 g\u00fcncellendi",
    profileUsernameSavedDetail:
      "Yeni kullan\u0131c\u0131 ad\u0131n uygulaman\u0131n genelinde kullan\u0131lacak.",
    profileResetPasswordEmailTitle: "\u015eifre s\u0131f\u0131rlama maili",
    profileResetPasswordEmailDescription:
      "Hesab\u0131n\u0131 kurtarmak i\u00e7in e-posta adresine \u015fifre s\u0131f\u0131rlama ba\u011flant\u0131s\u0131 haz\u0131rla.",
    profileSendResetEmail: "\u015eifre s\u0131f\u0131rlama maili g\u00f6nder",
    profileSendResetEmailSubmitting: "G\u00f6nderiliyor...",
    profileResetEmailConfirmTitle: "\u015eifre s\u0131f\u0131rlama maili g\u00f6nderilsin mi?",
    profileResetEmailConfirmBody: (email: string) =>
      `${email} adresi i\u00e7in bir \u015fifre s\u0131f\u0131rlama ba\u011flant\u0131s\u0131 haz\u0131rlanacak.`,
    profileResetEmailConfirmAction: "Maili g\u00f6nder",
    profileResetEmailSentTitle: "\u015eifre s\u0131f\u0131rlama maili haz\u0131rland\u0131",
    profileResetEmailSentDetail:
      "Mail g\u00f6nderimi aktifse s\u0131f\u0131rlama ba\u011flant\u0131s\u0131 yola \u00e7\u0131kt\u0131.",
    profileResetEmailPreviewLabel: "Yerel \u00f6nizleme ba\u011flant\u0131s\u0131",
    unsavedChangesTitle: "\u00c7\u0131kmadan \u00f6nce de\u011fi\u015fiklikler kaydedilsin mi?",
    unsavedCloseProjectBody: (projectName: string | null) =>
      projectName
        ? `"${projectName}" i\u00e7inde kaydedilmemi\u015f de\u011fi\u015fiklikler var. Bu projeyi kapatmadan \u00f6nce de\u011fi\u015fiklikleri kaydetmek ister misin?`
        : "Bu taslak odada kaydedilmemi\u015f de\u011fi\u015fiklikler var. Kapatmadan \u00f6nce de\u011fi\u015fiklikleri kaydetmek ister misin?",
    unsavedOpenProjectBody: (projectName: string | null) =>
      projectName
        ? `"${projectName}" i\u00e7inde kaydedilmemi\u015f de\u011fi\u015fiklikler var. Ba\u015fka bir projeye ge\u00e7meden \u00f6nce bunlar\u0131 kaydetmek ister misin?`
        : "Bu taslak odada kaydedilmemi\u015f de\u011fi\u015fiklikler var. Ba\u015fka bir projeye ge\u00e7meden \u00f6nce bunlar\u0131 kaydetmek ister misin?",
    unsavedNewProjectBody: (projectName: string | null) =>
      projectName
        ? `"${projectName}" i\u00e7inde kaydedilmemi\u015f de\u011fi\u015fiklikler var. Yeni bir proje a\u00e7madan \u00f6nce bunlar\u0131 kaydetmek ister misin?`
        : "Bu taslak odada kaydedilmemi\u015f de\u011fi\u015fiklikler var. Yeni bir proje a\u00e7madan \u00f6nce bunlar\u0131 kaydetmek ister misin?",
    unsavedLogoutBody: (projectName: string | null) =>
      projectName
        ? `"${projectName}" i\u00e7inde kaydedilmemi\u015f de\u011fi\u015fiklikler var. \u00c7\u0131k\u0131\u015f yapmadan \u00f6nce bunlar\u0131 kaydetmek ister misin?`
        : "Bu taslak odada kaydedilmemi\u015f de\u011fi\u015fiklikler var. \u00c7\u0131k\u0131\u015f yapmadan \u00f6nce bunlar\u0131 kaydetmek ister misin?",
    unsavedChangesHint:
      "Kaydetmeden devam edersen son oda d\u00fczeni, yerle\u015fim de\u011fi\u015fiklikleri ve kapak karesi kaybolur.",
    saveAndContinue: "Kaydet ve devam et",
    saveAndClose: "Kaydet ve kapat",
    signInAndSave: "Giri\u015f yap ve kaydet",
    signInSaveAndClose: "Giri\u015f yap, kaydet ve kapat",
    continueWithoutSaving: "Kaydetmeden devam et",
    closeWithoutSaving: "Kaydetmeden kapat",
    stayHere: "Burada kal",
    logoutConfirmTitle: "\u00c7\u0131k\u0131\u015f yap\u0131ls\u0131n m\u0131?",
    logoutConfirmBody:
      "Bu cihazdaki aktif oturum kapat\u0131lacak. Kay\u0131tl\u0131 projelerin hesab\u0131nda kalmaya devam edecek.",
    logoutConfirmAction: "\u00c7\u0131k\u0131\u015f yap",
    cancel: "Vazge\u00e7",
    lockTransformTitle: "Kilitli se\u00e7im",
    lockTransformDetail:
      "Ta\u015f\u0131 veya d\u00f6nd\u00fcr kullanmadan \u00f6nce se\u00e7ili \u00f6\u011fenin kilidini a\u00e7.",
  },
} satisfies Record<Locale, Record<string, unknown>>;

const turkishServerMessages: Record<string, string> = {
  "Beklenmeyen bir hata olustu.": "Beklenmeyen bir hata olu\u015ftu.",
  "Gecerli bir e-posta adresi giriniz.": "Ge\u00e7erli bir e-posta adresi giriniz.",
  "Kullanici adi en az 3 karakter olmali.":
    "Kullan\u0131c\u0131 ad\u0131 en az 3 karakter olmal\u0131.",
  "Kullanici adi 24 karakterden uzun olamaz.":
    "Kullan\u0131c\u0131 ad\u0131 24 karakterden uzun olamaz.",
  "Bu kullanici adi zaten kullanimda.":
    "Bu kullan\u0131c\u0131 ad\u0131 zaten kullan\u0131mda.",
  "Kullanici bulunamadi.": "Kullan\u0131c\u0131 bulunamad\u0131.",
  "Bu e-posta adresi ile olusturulmus bir hesap zaten var.":
    "Bu e-posta adresi ile olu\u015fturulmu\u015f bir hesap zaten var.",
  "Sifre en az 8 karakter olmali.": "\u015eifre en az 8 karakter olmal\u0131.",
  "Sifre en az bir harf ve bir rakam icermeli.":
    "\u015eifre en az bir harf ve bir rakam i\u00e7ermeli.",
  "Sifre alani bos birakilamaz.": "\u015eifre alan\u0131 bo\u015f b\u0131rak\u0131lamaz.",
  "E-posta veya sifre hatali.": "E-posta veya \u015fifre hatal\u0131.",
  "Gecersiz sifirlama baglantisi.":
    "Ge\u00e7ersiz s\u0131f\u0131rlama ba\u011flant\u0131s\u0131.",
  "Sifre sifirlama baglantisi gecersiz veya suresi dolmus.":
    "\u015eifre s\u0131f\u0131rlama ba\u011flant\u0131s\u0131 ge\u00e7ersiz veya s\u00fcresi dolmu\u015f.",
  "Bu islem icin giris yapmaniz gerekiyor.":
    "Bu i\u015flem i\u00e7in giri\u015f yapman\u0131z gerekiyor.",
  "Proje adi en az 3 karakter olmali.": "Proje ad\u0131 en az 3 karakter olmal\u0131.",
  "Proje adi 80 karakterden uzun olamaz.":
    "Proje ad\u0131 80 karakterden uzun olamaz.",
  "Proje aciklamasi 280 karakterden uzun olamaz.":
    "Proje a\u00e7\u0131klamas\u0131 280 karakterden uzun olamaz.",
  "Kapak gorseli yalnizca proje viewport goruntusu olabilir.":
    "Kapak g\u00f6rseli yaln\u0131zca proje viewport g\u00f6r\u00fcnt\u00fcs\u00fc olabilir.",
  "Kapak gorseli cok buyuk. Lutfen yeni bir kare alin.":
    "Kapak g\u00f6rseli \u00e7ok b\u00fcy\u00fck. L\u00fctfen yeni bir kare al\u0131n.",
  "Kaydedilecek proje sahnesi eksik.":
    "Kaydedilecek proje sahnesi eksik.",
  "Proje bulunamadi.": "Proje bulunamad\u0131.",
  "Silinecek proje bulunamadi.": "Silinecek proje bulunamad\u0131.",
  "Sunucu veri depolama alani hazir degil. Lutfen tekrar deneyin.":
    "Sunucu veri depolama alan\u0131 haz\u0131r de\u011fil. L\u00fctfen tekrar deneyin.",
};

const englishServerMessages: Record<string, string> = {
  "Beklenmeyen bir hata olustu.": "An unexpected error occurred.",
  "Gecerli bir e-posta adresi giriniz.": "Enter a valid email address.",
  "Kullanici adi en az 3 karakter olmali.": "Username must be at least 3 characters.",
  "Kullanici adi 24 karakterden uzun olamaz.": "Username cannot be longer than 24 characters.",
  "Bu kullanici adi zaten kullanimda.": "This username is already in use.",
  "Kullanici bulunamadi.": "User not found.",
  "Bu e-posta adresi ile olusturulmus bir hesap zaten var.":
    "An account already exists with this email address.",
  "Sifre en az 8 karakter olmali.": "Password must be at least 8 characters.",
  "Sifre en az bir harf ve bir rakam icermeli.":
    "Password must include at least one letter and one number.",
  "Sifre alani bos birakilamaz.": "Password cannot be empty.",
  "E-posta veya sifre hatali.": "Email or password is incorrect.",
  "Gecersiz sifirlama baglantisi.": "Invalid reset link.",
  "Sifre sifirlama baglantisi gecersiz veya suresi dolmus.":
    "The password reset link is invalid or expired.",
  "Bu islem icin giris yapmaniz gerekiyor.":
    "You need to sign in to perform this action.",
  "Proje adi en az 3 karakter olmali.": "Project name must be at least 3 characters.",
  "Proje adi 80 karakterden uzun olamaz.":
    "Project name cannot be longer than 80 characters.",
  "Proje aciklamasi 280 karakterden uzun olamaz.":
    "Project description cannot be longer than 280 characters.",
  "Kapak gorseli yalnizca proje viewport goruntusu olabilir.":
    "Cover image can only be generated from the project viewport.",
  "Kapak gorseli cok buyuk. Lutfen yeni bir kare alin.":
    "Cover image is too large. Please capture a new frame.",
  "Kaydedilecek proje sahnesi eksik.": "The project scene to save is missing.",
  "Proje bulunamadi.": "Project not found.",
  "Silinecek proje bulunamadi.": "Project to delete was not found.",
  "Sunucu veri depolama alani hazir degil. Lutfen tekrar deneyin.":
    "Server data storage is not ready. Please try again.",
};

export const getAccountCopy = (locale: Locale) => accountCopy[locale];

export const localizeApiMessage = (
  message: string | undefined,
  locale: Locale,
) => {
  if (!message) {
    return undefined;
  }

  if (locale === "tr") {
    return turkishServerMessages[message] ?? message;
  }

  return englishServerMessages[message] ?? message;
};
