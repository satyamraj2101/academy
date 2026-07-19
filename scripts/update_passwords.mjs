import crypto from 'node:crypto';

const ITERATIONS = 100000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;

async function hashPassword(password) {
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

(async () => {
  const hash = await hashPassword('Spot2026$');
  console.log('NEW_HASH=' + hash);
})();
