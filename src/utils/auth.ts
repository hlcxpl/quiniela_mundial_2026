import crypto from 'crypto';

/**
 * Hashes a password using scrypt with a random salt.
 * Returns a string formatted as "salt:hash"
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  // Deriving 64-byte key using memory-hard scrypt Sync
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verifies a password against a stored "salt:hash" string.
 * Uses timingSafeEqual to prevent timing attacks.
 * Automatically falls back to SHA-256 for backward compatibility.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;

  // Backward compatibility check: SHA-256 hashes do not contain a ":"
  if (!storedHash.includes(':')) {
    const oldHash = crypto.createHash('sha256').update(password).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(oldHash), Buffer.from(storedHash));
    } catch {
      return false;
    }
  }

  const [salt, hash] = storedHash.split(':');
  const derivedHash = crypto.scryptSync(password, salt, 64).toString('hex');
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(derivedHash, 'hex'),
      Buffer.from(hash, 'hex')
    );
  } catch {
    return false;
  }
}
