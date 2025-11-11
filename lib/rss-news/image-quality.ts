// lib/imageQuality.ts
// Uses probe-image-size to validate & get real dimensions without downloading the whole image.
import probe from 'probe-image-size';

const DEFAULT_TIMEOUT_MS = 7000;
const MAX_ACCEPTED_BYTES = 15 * 1024 * 1024; // 15MB

function withTimeout(ms: number) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cleanup: () => clearTimeout(t) };
}

export type Probed = {
  ok: true;
  width: number;
  height: number;
  type?: string;
  mime?: string;
  length?: number;
} | { ok: false; reason: string };

export async function checkAndProbeImage(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Probed> {
  const headers = { 'User-Agent': 'Mozilla/5.0 (compatible; NewsProxy/1.0)' };
  const { signal, cleanup } = withTimeout(timeoutMs);
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow', headers, signal });
    if (!res.ok) { cleanup(); return { ok: false, reason: `HTTP ${res.status}` }; }

    const ct = res.headers.get('content-type') || '';
    if (!ct.toLowerCase().startsWith('image/')) { cleanup(); return { ok: false, reason: 'not_image' }; }

    const len = Number(res.headers.get('content-length') || '0');
    if (len > 0 && len > MAX_ACCEPTED_BYTES) { cleanup(); return { ok: false, reason: 'too_large' }; }

    // Convert Web -> Node stream for probe
    // @ts-ignore
    const nodeStream: NodeJS.ReadableStream = (res.body as any)?.getReader
      ? (await import('stream')).Readable.fromWeb(res.body as any)
      : (res.body as unknown as NodeJS.ReadableStream);

    const result = await probe(nodeStream);
    cleanup();
    if (!result?.width || !result?.height) return { ok: false, reason: 'no_dimensions' };

    return { ok: true, width: result.width, height: result.height, type: result.type, mime: ct, length: len || undefined };
  } catch (e: any) {
    cleanup();
    return { ok: false, reason: e?.name === 'AbortError' ? 'timeout' : 'fetch_error' };
  }
}
