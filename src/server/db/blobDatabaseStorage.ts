import type { DatabaseConfig } from "@/server/types/database";

const getBlobPathname = (config: DatabaseConfig) => {
  if (config.storage !== "vercel-blob" || !config.blobPathname) {
    return null;
  }

  return config.blobPathname;
};

const streamToBuffer = async (stream: ReadableStream<Uint8Array>) => {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    chunks.push(value);
    totalLength += value.byteLength;
  }

  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return Buffer.from(result);
};

export const readDatabaseBlob = async (config: DatabaseConfig) => {
  const pathname = getBlobPathname(config);

  if (!pathname) {
    return null;
  }

  const { get } = await import("@vercel/blob");
  const result = await get(pathname, {
    access: "private",
    useCache: false,
  });

  if (!result || result.statusCode !== 200) {
    return null;
  }

  return streamToBuffer(result.stream);
};

export const writeDatabaseBlob = async (
  config: DatabaseConfig,
  databaseBytes: Uint8Array,
) => {
  const pathname = getBlobPathname(config);

  if (!pathname) {
    return;
  }

  const { put } = await import("@vercel/blob");
  await put(pathname, Buffer.from(databaseBytes), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/octet-stream",
    cacheControlMaxAge: 60,
  });
};
