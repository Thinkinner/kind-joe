import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession, type AuthAppUser } from "@/lib/auth/server";
import {
  PredictionCommentError,
  createPredictionComment,
  getPredictionMarketIdBySlug,
  listCommentsForMarket,
} from "@/lib/predictions/comments";

const postBodySchema = z.object({
  body: z.string(),
  parentId: z.number().int().positive().optional().nullable(),
});

function mapCommentError(err: PredictionCommentError): { status: number; body: object } {
  switch (err.code) {
    case "INVALID_BODY":
      return { status: 400, body: { error: err.message, code: err.code } };
    case "MARKET_NOT_FOUND":
      return { status: 404, body: { error: err.message, code: err.code } };
    case "PARENT_NOT_FOUND":
    case "PARENT_WRONG_MARKET":
    case "PARENT_NOT_TOP_LEVEL":
      return { status: 400, body: { error: err.message, code: err.code } };
    case "COMMENTS_TABLE_MISSING":
      return { status: 503, body: { error: err.message, code: err.code } };
    default:
      return { status: 400, body: { error: err.message } };
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const marketId = await getPredictionMarketIdBySlug(slug);
    if (marketId == null) {
      return NextResponse.json(
        { error: "Prediction market not found." },
        { status: 404 },
      );
    }
    const comments = await listCommentsForMarket(marketId);
    return NextResponse.json({ comments });
  } catch (err) {
    console.error("prediction_comments_list_failed", err);
    return NextResponse.json(
      { error: "Could not load comments." },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const session = await getServerSession();
    const user = session?.user as AuthAppUser | undefined;
    const authorId = user?.id;
    if (!authorId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const { slug } = await params;
    const marketId = await getPredictionMarketIdBySlug(slug);
    if (marketId == null) {
      return NextResponse.json(
        { error: "Prediction market not found." },
        { status: 404 },
      );
    }

    const json = await req.json();
    const parsed = postBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request.", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const { body, parentId } = parsed.data;

    try {
      const comment = await createPredictionComment({
        marketId,
        authorId,
        parentId: parentId ?? null,
        body,
      });
      return NextResponse.json({ comment });
    } catch (e) {
      if (e instanceof PredictionCommentError) {
        const { status, body: resBody } = mapCommentError(e);
        return NextResponse.json(resBody, { status });
      }
      throw e;
    }
  } catch (err) {
    console.error("prediction_comments_create_failed", err);
    return NextResponse.json(
      { error: "Could not post comment." },
      { status: 500 },
    );
  }
}
