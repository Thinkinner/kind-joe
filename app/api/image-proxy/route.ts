// app/api/image-proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const MAX_BYTES = 15 * 1024 * 1024;
const FORWARD_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; NewsProxy/1.0)',
};

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get('url');
  if (!target) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  let u: URL;
  try {
    u = new URL(target);
  } catch {
    return NextResponse.json({ error: 'Bad url' }, { status: 400 });
  }
  if (!ALLOWED_PROTOCOLS.has(u.protocol)) {
    return NextResponse.json({ error: 'Protocol not allowed' }, { status: 400 });
  }

  // Stream through our domain so browser hotlink protections don’t break the UI
  const res = await fetch(u.toString(), { method: 'GET', redirect: 'follow', headers: FORWARD_HEADERS });
  if (!res.ok) return NextResponse.json({ error: `Upstream ${res.status}` }, { status: 502 });

  const ct = res.headers.get('content-type') || '';
  if (!ct.toLowerCase().startsWith('image/')) return NextResponse.json({ error: 'Not an image' }, { status: 415 });

  const len = Number(res.headers.get('content-length') || '0');
  if (len > 0 && len > MAX_BYTES) return NextResponse.json({ error: 'Image too large' }, { status: 413 });

  const headers = new Headers();
  headers.set('Content-Type', ct);
  headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=600');

  return new NextResponse(res.body, { status: 200, headers });
}
