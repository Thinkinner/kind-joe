import { NextRequest, NextResponse } from "next/server";
import { getVenturaArticleDetailBySlug } from "@/lib/feed/ventura-articles";

export const revalidate = 60;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const article = await getVenturaArticleDetailBySlug(slug);

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch Ventura article" },
      { status: 500 },
    );
  }
}
