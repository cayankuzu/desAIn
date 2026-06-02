import fs from "node:fs/promises";
import path from "node:path";
import initSqlJs from "sql.js";
import {
  readDatabaseBlob,
  writeDatabaseBlob,
} from "@/server/db/blobDatabaseStorage";
import { getDatabaseConfig } from "@/server/db/config";
import type { DatabaseConfig } from "@/server/types/database";

type SqlBindParams = initSqlJs.BindParams;
export interface SqliteExecutor {
  all<T>(sql: string, params?: SqlBindParams): Promise<T[]>;
  get<T>(sql: string, params?: SqlBindParams): Promise<T | null>;
  run(sql: string, params?: SqlBindParams): Promise<{ changes: number }>;
}

type SqliteRuntime = {
  config: DatabaseConfig;
  db: initSqlJs.Database;
  filePath: string;
};

let sqlJsPromise: Promise<initSqlJs.SqlJsStatic> | null = null;
let runtimePromise: Promise<SqliteRuntime> | null = null;
let writeQueue = Promise.resolve();

const migrationsDirectory = path.join(
  process.cwd(),
  "src",
  "server",
  "db",
  "migrations",
);

const getSqlJs = async () => {
  if (!sqlJsPromise) {
    sqlJsPromise = initSqlJs({
      locateFile: (file) =>
        path.join(process.cwd(), "node_modules", "sql.js", "dist", file),
    });
  }

  return sqlJsPromise;
};

const persistDatabase = async (db: initSqlJs.Database, filePath: string) => {
  const binary = db.export();
  const tempFilePath = `${filePath}.${process.pid}.${Date.now()}.${Math.random()
    .toString(16)
    .slice(2)}.tmp`;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(tempFilePath, Buffer.from(binary));

  try {
    await fs.rename(tempFilePath, filePath).catch(async (error) => {
      const nodeError = error as NodeJS.ErrnoException;

      if (nodeError.code !== "EEXIST" && nodeError.code !== "EPERM") {
        throw error;
      }

      await fs.rm(filePath, { force: true });
      await fs.rename(tempFilePath, filePath);
    });
  } finally {
    await fs.rm(tempFilePath, { force: true }).catch(() => undefined);
  }

  return binary;
};

const persistRuntimeDatabase = async (runtime: SqliteRuntime) => {
  const binary = await persistDatabase(runtime.db, runtime.filePath);
  await writeDatabaseBlob(runtime.config, binary);
};

const readDatabaseFile = async (filePath: string) => {
  try {
    const existing = await fs.readFile(filePath);
    return new Uint8Array(existing);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }

    return undefined;
  }
};

const getRows = <T>(
  db: initSqlJs.Database,
  sql: string,
  params?: SqlBindParams,
) => {
  const statement = db.prepare(sql, params);
  const rows: T[] = [];

  while (statement.step()) {
    rows.push(statement.getAsObject() as T);
  }

  statement.free();
  return rows;
};

const isCorruptedDatabaseError = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes("database disk image is malformed") ||
    message.includes("file is not a database")
  );
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getCorruptBackupPath = (filePath: string) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${filePath}.corrupt-${timestamp}`;
};

const runMigrations = async (db: initSqlJs.Database) => {
  db.run(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);

  const appliedIds = new Set(
    getRows<{ id: string }>(db, "SELECT id FROM schema_migrations").map(
      (row) => row.id,
    ),
  );
  const migrationFiles = (await fs.readdir(migrationsDirectory))
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();
  let migrated = false;

  for (const fileName of migrationFiles) {
    if (appliedIds.has(fileName)) {
      continue;
    }

    const sql = await fs.readFile(path.join(migrationsDirectory, fileName), "utf8");
    db.run("BEGIN");

    try {
      db.run(sql);
      db.run(
        "INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)",
        [fileName, new Date().toISOString()],
      );
      migrated = true;
      db.run("COMMIT");
    } catch (error) {
      db.run("ROLLBACK");
      throw error;
    }
  }

  return migrated;
};

const createDatabaseFromDisk = async (filePath: string) => {
  const SQL = await getSqlJs();
  const openDatabase = async () => {
    const databaseFile = await readDatabaseFile(filePath);
    const db = databaseFile ? new SQL.Database(databaseFile) : new SQL.Database();
    db.run("PRAGMA foreign_keys = ON");
    const migrated = await runMigrations(db);

    return {
      db,
      migrated,
      hasExistingFile: Boolean(databaseFile),
    };
  };

  try {
    const { db, migrated } = await openDatabase();
    return { db, migrated };
  } catch (error) {
    if (!isCorruptedDatabaseError(error)) {
      throw error;
    }
  }

  await delay(75);

  try {
    const { db, migrated } = await openDatabase();
    return { db, migrated };
  } catch (error) {
    if (!isCorruptedDatabaseError(error)) {
      throw error;
    }
  }

  const existingFile = await readDatabaseFile(filePath);

  if (existingFile) {
    const backupPath = getCorruptBackupPath(filePath);
    await fs.rename(filePath, backupPath);
    console.warn(`Recovered malformed SQLite database by moving it to ${backupPath}.`);
  }

  const db = new SQL.Database();
  db.run("PRAGMA foreign_keys = ON");
  await runMigrations(db);

  return {
    db,
    migrated: true,
  };
};

const hydrateDatabaseFile = async (config: DatabaseConfig) => {
  const databaseBytes = await readDatabaseBlob(config);

  if (databaseBytes) {
    await fs.mkdir(path.dirname(config.filePath), { recursive: true });
    await fs.writeFile(config.filePath, databaseBytes);
    return;
  }

  if (config.storage === "vercel-blob") {
    await fs.rm(config.filePath, { force: true }).catch(() => undefined);
  }
};

const initializeRuntime = async (): Promise<SqliteRuntime> => {
  const config = getDatabaseConfig();

  await fs.mkdir(path.dirname(config.filePath), { recursive: true });
  await hydrateDatabaseFile(config);

  const { db } = await createDatabaseFromDisk(config.filePath);
  const runtime = {
    config,
    db,
    filePath: config.filePath,
  };
  await persistRuntimeDatabase(runtime);

  return runtime;
};

const getRuntime = async () => {
  if (!runtimePromise) {
    runtimePromise = initializeRuntime();
  }

  return runtimePromise;
};

const refreshRuntimeFromDisk = async (runtime: SqliteRuntime) => {
  await hydrateDatabaseFile(runtime.config);
  const { db, migrated } = await createDatabaseFromDisk(runtime.filePath);
  runtime.db.close();
  runtime.db = db;

  if (migrated) {
    await persistRuntimeDatabase(runtime);
  }
};

const enqueueWrite = async <T>(operation: () => Promise<T>) => {
  const previous = writeQueue;
  let release = () => {};
  writeQueue = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;

  try {
    return await operation();
  } finally {
    release();
  }
};

export const sqliteAll = async <T>(
  sql: string,
  params?: SqlBindParams,
) => {
  return enqueueWrite(async () => {
    const runtime = await getRuntime();
    await refreshRuntimeFromDisk(runtime);
    return getRows<T>(runtime.db, sql, params);
  });
};

export const sqliteGet = async <T>(
  sql: string,
  params?: SqlBindParams,
) => {
  const rows = await sqliteAll<T>(sql, params);
  return rows[0] ?? null;
};

export const sqliteRun = async (sql: string, params?: SqlBindParams) => {
  return enqueueWrite(async () => {
    const runtime = await getRuntime();
    await refreshRuntimeFromDisk(runtime);
    runtime.db.run(sql, params);
    const changes = runtime.db.getRowsModified();
    await persistRuntimeDatabase(runtime);

    return { changes };
  });
};

export const sqliteTransaction = async <T>(
  operation: (tx: SqliteExecutor) => Promise<T>,
) => {
  return enqueueWrite(async () => {
    const runtime = await getRuntime();
    await refreshRuntimeFromDisk(runtime);
    const tx: SqliteExecutor = {
      async all<T>(sql: string, params?: SqlBindParams) {
        return getRows<T>(runtime.db, sql, params);
      },
      async get<T>(sql: string, params?: SqlBindParams) {
        return (getRows<T>(runtime.db, sql, params)[0] ?? null) as T | null;
      },
      async run(sql: string, params?: SqlBindParams) {
        runtime.db.run(sql, params);
        return { changes: runtime.db.getRowsModified() };
      },
    };
    runtime.db.run("BEGIN");

    try {
      const result = await operation(tx);
      runtime.db.run("COMMIT");
      await persistRuntimeDatabase(runtime);
      return result;
    } catch (error) {
      runtime.db.run("ROLLBACK");
      throw error;
    }
  });
};

export const ensureSqliteReady = async () => {
  await getRuntime();
};
