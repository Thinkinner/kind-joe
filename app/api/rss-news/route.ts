// app/api/news/route.ts
import { NextResponse } from 'next/server';
import { getRenderableArticles, toCardPayloads } from '@/lib/rss-news/news';

export async function GET() {
  try {
    const articles = await getRenderableArticles(36); // ← only items whose images we can show
    const groups = toCardPayloads(articles);

    return NextResponse.json({
      ok: true,
      count: articles.length,
      groups: groups.map((g) => ({
        main: {
          id: g.main?.id,
          title: g.main?.modifiedTitle || g.main?.title,
          link: g.main?.link,
          imageUrl: g.main?.imageUrl,
          sourceName: g.main?.source.name,
          publishedAt: g.main?.publishedAt,
        },
        links: g.links.map((l) => ({
          id: l.id,
          title: l.modifiedTitle || l.title,
          link: l.link,
          sourceName: l.source.name,
        })),
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: 'Failed to load news' }, { status: 500 });
  }
}
