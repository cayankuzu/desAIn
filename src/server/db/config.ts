import path from "node:path";
import type { DatabaseConfig, RuntimeEnvironment } from "@/server/types/database";

const normalizeRuntimeEnvironment = (
  value: string | undefined,
): RuntimeEnvironment => {
  return value === "production" ? "production" : "local";
};

export const getDatabaseConfig = (): DatabaseConfig => {
  const runtimeEnvironment = normalizeRuntimeEnvironment(
    process.env.DESAIN_RUNTIME_ENV,
  );
  const driver = "sqlite" as const;
  const fileName =
    runtimeEnvironment === "production"
      ? "desain.production.sqlite"
      : "desain.local.sqlite";

  return {
    runtimeEnvironment,
    driver,
    filePath: path.join(process.cwd(), "data", runtimeEnvironment, fileName),
  };
};
