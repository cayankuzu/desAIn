const fallbackMessage = "Beklenmeyen bir hata olustu.";
const storageMessage =
  "Sunucu veri depolama alani hazir degil. Lutfen tekrar deneyin.";

const internalStoragePatterns = [
  "enoent",
  "eacces",
  "eperm",
  "/var/task",
  "blob",
  "database disk image",
  "file is not a database",
];

export const getControllerErrorMessage = (error: unknown) => {
  if (!(error instanceof Error)) {
    return fallbackMessage;
  }

  const rawMessage = error.message || fallbackMessage;
  const lowerMessage = rawMessage.toLowerCase();

  if (internalStoragePatterns.some((pattern) => lowerMessage.includes(pattern))) {
    console.error(error);
    return storageMessage;
  }

  return rawMessage;
};
