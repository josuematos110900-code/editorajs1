// Verificação de assinatura de webhooks — HMAC-SHA256 com proteção contra
// replay. Só usa Web Crypto, por isso corre tanto nas Edge Functions (Deno)
// como nos testes (Node/Vitest).
//
// Formato do header (o mesmo esquema já usado pelo Vanqir Pay neste
// repositório): "t=<unix_segundos>,v1=<hex_hmac>", onde o HMAC é calculado
// sobre `${t}.${corpo_bruto}`. Se o provedor escolhido usar outro formato,
// adaptar APENAS parseSignatureHeader/signedPayload.

export const SIGNATURE_TOLERANCE_SECONDS = 300;

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function parseSignatureHeader(header: string | null): { timestamp: number; signature: string } | null {
  if (!header) return null;
  const parts = new Map<string, string>();
  for (const part of header.split(',')) {
    const idx = part.indexOf('=');
    if (idx > 0) parts.set(part.slice(0, idx).trim(), part.slice(idx + 1).trim());
  }
  const t = Number(parts.get('t'));
  const v1 = parts.get('v1');
  if (!Number.isFinite(t) || !v1 || !/^[0-9a-f]{64}$/i.test(v1)) return null;
  return { timestamp: t, signature: v1.toLowerCase() };
}

export async function signPayload(secret: string, rawBody: string, timestamp: number): Promise<string> {
  const v1 = await hmacSha256Hex(secret, `${timestamp}.${rawBody}`);
  return `t=${timestamp},v1=${v1}`;
}

export async function verifyWebhookSignature(
  header: string | null,
  rawBody: string,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  const parsed = parseSignatureHeader(header);
  if (!parsed) return false;
  if (Math.abs(nowSeconds - parsed.timestamp) > SIGNATURE_TOLERANCE_SECONDS) return false;
  const expected = await hmacSha256Hex(secret, `${parsed.timestamp}.${rawBody}`);
  return timingSafeEqual(expected, parsed.signature);
}
