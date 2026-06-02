import crypto from "node:crypto";

const SCRYPT_KEY_LENGTH = 64;

const createPasswordHash = async (password: string, salt: string) => {
  return new Promise<string>((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEY_LENGTH, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey.toString("hex"));
    });
  });
};

export const hashPassword = async (password: string) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await createPasswordHash(password, salt);
  return `${salt}:${hash}`;
};

export const verifyPassword = async (password: string, storedValue: string) => {
  const [salt, storedHash] = storedValue.split(":");

  if (!salt || !storedHash) {
    return false;
  }

  const incomingHash = await createPasswordHash(password, salt);
  return crypto.timingSafeEqual(
    Buffer.from(storedHash, "hex"),
    Buffer.from(incomingHash, "hex"),
  );
};

export const hashToken = (token: string) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};
