import { db } from '@/db';
import { newsRssArticles, newsRssSource } from '@/db/schema';
import { desc, and, isNotNull, eq } from 'drizzle-orm';
import { checkAndProbeImage } from '@/lib/rss-news/image-quality';

export type ArticleWithSource = {
  id: number;
  title: string;
  modifiedTitle: string | null;
  link: string;
  imageUrl: string | null;
  publishedAt: Date | null;
  source: { id: number; name: string; url: string };
  imgWidth?: number;
  imgHeight?: number;
  imgArea?: number;
  imgAspect?: number;
};

const TARGET_ASPECT = 3 / 2;
const MIN_MAIN_WIDTH = 1000;
const MIN_MAIN_HEIGHT = 650;

function mainScore(a: ArticleWithSource) {
  const area = a.imgArea ?? 0;
  const aspect = a.imgAspect ?? TARGET_ASPECT;
  const aspectPenalty = Math.abs(aspect - TARGET_ASPECT);
  return area - aspectPenalty * 10000;
}

export async function getRenderableArticles(limit = 36): Promise<ArticleWithSource[]> {
  const rows = await db
    .select({
      id: newsRssArticles.id,
      title: newsRssArticles.title,
      modifiedTitle: newsRssArticles.modifiedTitle,
      link: newsRssArticles.link,
      imageUrl: newsRssArticles.imageUrl,
      publishedAt: newsRssArticles.publishedAt,
      sourceId: newsRssSource.id,
      sourceName: newsRssSource.name,
      sourceUrl: newsRssSource.url,
    })
    .from(newsRssArticles)
    .innerJoin(newsRssSource, eq(newsRssArticles.sourceId, newsRssSource.id))
    .where(and(isNotNull(newsRssArticles.imageUrl)))
    .orderBy(desc(newsRssArticles.publishedAt), desc(newsRssArticles.id))
    .limit(limit * 2);

  const out: ArticleWithSource[] = [];
  let i = 0;
  const CONCURRENCY = 10;

  async function worker() {
    while (i < rows.length && out.length < limit) {
      const idx = i++;
      const r = rows[idx];
      const res = await checkAndProbeImage(r.imageUrl!);
      if (!res.ok) continue;

      const area = res.width * res.height;
      out.push({
        id: r.id,
        title: r.title,
        modifiedTitle: r.modifiedTitle,
        link: r.link,
        imageUrl: r.imageUrl,
        publishedAt: r.publishedAt,
        source: { id: r.sourceId, name: r.sourceName, url: r.sourceUrl },
        imgWidth: res.width,
        imgHeight: res.height,
        imgArea: area,
        imgAspect: res.width / res.height,
      });
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return out;
}

export function pickHeroAndGroups(articles: ArticleWithSource[]) {
  const eligible = articles.filter(
    a => (a.imgWidth ?? 0) >= MIN_MAIN_WIDTH && (a.imgHeight ?? 0) >= MIN_MAIN_HEIGHT
  );
  const pool = eligible.length ? eligible : articles;
  const hero = pool.reduce((acc, cur) => (mainScore(cur) > mainScore(acc) ? cur : acc), pool[0]);
  const rest = articles.filter(a => a !== hero);
  return { hero, rest };
}


export function toCardPayloads(articles: ArticleWithSource[]) {
  const groups: { main: ArticleWithSource; links: ArticleWithSource[] }[] = [];

  for (let i = 0; i < articles.length; i += 4) {
    const slice = articles.slice(i, i + 4);
    if (slice.length === 0) continue;

    const best = slice.reduce((acc, cur) => (cur.imgArea ?? 0) > (acc.imgArea ?? 0) ? cur : acc, slice[0]);
    const links = slice.filter(x => x !== best);

    groups.push({ main: best, links });
  }

  return groups.map(g => ({
    main: g.main,
    links: g.links,
  }));
}