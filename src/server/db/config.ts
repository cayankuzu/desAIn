import os from "node:os";
import path from "node:path";
import type { DatabaseConfig, RuntimeEnvironment } from "@/server/types/database";

const normalizeRuntimeEnvironment = (
  value: string | undefined,
): RuntimeEnvironment => {
  return value === "production" ? "production" : "local";
};

const getRuntimeEnvironment = (): RuntimeEnvironment => {
  if (process.env.DESAIN_RUNTIME_ENV) {
    return normalizeRuntimeEnvironment(process.env.DESAIN_RUNTIME_ENV);
  }

  return process.env.VERCEL ? "production" : "local";
};

const hasBlobCredentials = () =>
  Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN),
  );

export const getDatabaseConfig = (): DatabaseConfig => {
  const runtimeEnvironment = getRuntimeEnvironment();
  const driver = "sqlite" as const;
  const fileName =
    runtimeEnvironment === "production"
      ? "desain.production.sqlite"
      : "desain.local.sqlite";
  const isVercel = Boolean(process.env.VERCEL);
  const storage =
    runtimeEnvironment === "production" && hasBlobCredentials()
      ? "vercel-blob"
      : "file";
  const filePath =
    process.env.DESAIN_DATABASE_FILE_PATH ||
    (isVercel
      ? path.join(os.tmpdir(), "desain", runtimeEnvironment, fileName)
      : path.join(process.cwd(), "data", runtimeEnvironment, fileName));

  return {
    runtimeEnvironment,
    driver,
    filePath,
    storage,
    blobPathname:
      storage === "vercel-blob"
        ? process.env.DESAIN_DATABASE_BLOB_PATHNAME ||
          `databases/${runtimeEnvironment}/${fileName}`
        : undefined,
  };
};
