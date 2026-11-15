/**
 * Derives a deterministic, non-reversible short identifier (`key_xxxxxxxxxxxx`)
 * from a Gemini API key using Web Crypto SHA-256 so floors and history can be
 * partitioned per API key without ever storing or exposing the raw secret.
 */
export async function deriveApiKeyId(rawKey?: string | null): Promise<string> {
  const clean = (rawKey || '').trim();
  if (!clean) return 'default';

  try {
    if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
      const data = new TextEncoder().encode(clean);
      const digest = await crypto.subtle.digest('SHA-256', data);
      const bytes = Array.from(new Uint8Array(digest));
      const hex = bytes
        .slice(0, 8)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      return `key_${hex}`;
    }
  } catch {
    // Fallback below if Web Crypto is unavailable
  }

  // Deterministic lightweight non-cryptographic fallback hash
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `key_${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}
