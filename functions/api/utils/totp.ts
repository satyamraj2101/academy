const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32ToBuf(b32: string): Uint8Array {
  let bits = 0;
  let value = 0;
  let index = 0;
  const buf = new Uint8Array(Math.ceil(b32.length * 5 / 8));
  for (let i = 0; i < b32.length; i++) {
    const val = base32chars.indexOf(b32[i].toUpperCase());
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      buf[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }
  return buf.slice(0, index);
}

export async function verifyTOTP(secret: string, token: string, window = 1): Promise<boolean> {
  const key = base32ToBuf(secret);
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  
  const timeStep = Math.floor(Date.now() / 30000);
  
  for (let i = -window; i <= window; i++) {
    let t = timeStep + i;
    const timeBuf = new Uint8Array(8);
    for (let j = 7; j >= 0; j--) {
      timeBuf[j] = t & 255;
      t = Math.floor(t / 256);
    }
    
    const mac = await crypto.subtle.sign('HMAC', cryptoKey, timeBuf);
    const macView = new Uint8Array(mac);
    const offset = macView[macView.length - 1] & 0x0f;
    const code = ((macView[offset] & 0x7f) << 24) |
                 ((macView[offset + 1] & 0xff) << 16) |
                 ((macView[offset + 2] & 0xff) << 8) |
                 (macView[offset + 3] & 0xff);
                 
    const otp = (code % 1000000).toString().padStart(6, '0');
    if (otp === token) return true;
  }
  return false;
}

export function generateTOTPSecret(): string {
  const buf = new Uint8Array(20);
  crypto.getRandomValues(buf);
  let b32 = '';
  let bits = 0;
  let value = 0;
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      b32 += base32chars[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    b32 += base32chars[(value << (5 - bits)) & 31];
  }
  return b32;
}
