/**
 * Password hashing with scrypt (node:crypto). Stored format:
 *   scrypt$N$r$p$<salt b64url>$<key b64url>
 */
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;
const MAXMEM = 64 * 1024 * 1024;

export { PASSWORD_MAX, PASSWORD_MIN } from "./password-policy";

function derive(password: string, salt: Buffer, opts: ScryptOptions & { keylen: number }) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, opts.keylen, opts, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, { N, r: R, p: P, maxmem: MAXMEM, keylen: KEYLEN });
  return ["scrypt", N, R, P, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, keyB64] = parts;
  const expected = Buffer.from(keyB64, "base64url");
  if (expected.length === 0) return false;
  try {
    const key = await derive(password, Buffer.from(saltB64, "base64url"), {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: MAXMEM,
      keylen: expected.length,
    });
    return timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | undefined;

/**
 * Burns the same scrypt work when the email doesn't exist, so response time
 * doesn't reveal which emails have accounts.
 */
export async function verifyAgainstDummy(password: string): Promise<false> {
  dummyHash ??= hashPassword("codidooh-dummy-password");
  await verifyPassword(password, await dummyHash);
  return false;
}
