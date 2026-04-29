import { NextResponse } from "next/server";
import { listVenturaPosts } from "@/lib/feed/ventura-posts";

export const revalidate = 60;

export async function GET() {
  const posts = await listVenturaPosts();
  return NextResponse.json(posts);
}
