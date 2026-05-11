async function importKey(secret: string) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function toBase64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(input: string) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((input.length + 3) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

export async function createSignedDownloadToken(secret: string, payload: Record<string, unknown>) {
  const json = JSON.stringify(payload);
  const body = toBase64Url(new TextEncoder().encode(json));
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return `${body}.${toBase64Url(new Uint8Array(sig))}`;
}

export async function verifySignedDownloadToken(secret: string, token: string) {
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  const key = await importKey(secret);
  const ok = await crypto.subtle.verify('HMAC', key, fromBase64Url(signature), new TextEncoder().encode(body));
  if (!ok) return null;
  return JSON.parse(new TextDecoder().decode(fromBase64Url(body)));
}
