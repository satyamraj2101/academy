// WebCrypto based PBKDF2 hashing for edge environments
// Format: iterations:salt(hex):hash(hex)

const ITERATIONS = 100000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;

/**
 * Hashes a password using PBKDF2 and SHA-256
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    HASH_BYTES * 8
  );

  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `${ITERATIONS}:${saltHex}:${hashHex}`;
}

/**
 * Verifies a password against a stored PBKDF2 hash
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const parts = storedHash.split(':');
    if (parts.length !== 3) return false;
    
    const iterations = parseInt(parts[0], 10);
    const saltHex = parts[1];
    const hashHex = parts[2];
    
    const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      HASH_BYTES * 8
    );

    const testHashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Constant time comparison
    if (testHashHex.length !== hashHex.length) return false;
    let mismatch = 0;
    for (let i = 0; i < hashHex.length; i++) {
      mismatch |= testHashHex.charCodeAt(i) ^ hashHex.charCodeAt(i);
    }
    return mismatch === 0;
  } catch (e) {
    console.error("Password verification error:", e);
    return false;
  }
}
