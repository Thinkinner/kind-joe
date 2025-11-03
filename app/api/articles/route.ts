// src/app/api/articles/route.ts
import { ArticleInputSchema } from "@/lib/validations/article";
import { createArticle, listArticles } from "@/db/queries/articles";
import { NextResponse } from "next/server";

export async function GET() {
  const data = await listArticles();
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = ArticleInputSchema.parse(body);
  const result = await createArticle(parsed);
  return NextResponse.json(result, { status: 201 });
}
