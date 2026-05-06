import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { kindjoeClipSubmissions } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AgeGroupSchema = z.enum(["12_and_under", "13_to_17", "18_and_over"]);

const SubmitSchema = z
  .object({
    ageGroup: AgeGroupSchema,
    firstName: z.string().trim().min(1, "First name is required").max(120),
    lastName: z.string().trim().min(1, "Last name is required").max(120),
    email: z.string().trim().email("A valid email is required").max(255),
    clipUrl: z.string().trim().url("A valid clip URL is required"),
    filmedLocation: z.string().trim().min(1, "Filming location is required").max(255),
    hasDescription: z.boolean(),
    clipDescription: z.string().trim().max(4000).optional().or(z.literal("")),
    recordedBySubmitter: z.boolean(),
    wantsClipCredit: z.boolean(),
    digitalSignature: z.string().trim().min(1, "Digital signature is required").max(255),
    acceptsSubmissionTerms: z.literal(true),
    confirmsNoExclusiveAgreement: z.literal(true),
    confirmsClipGuidelines: z.literal(true),
    marketingOptIn: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.hasDescription && !value.clipDescription?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["clipDescription"],
        message: "Please tell us about your clip.",
      });
    }

    if (!value.hasDescription && value.clipDescription?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["clipDescription"],
        message: "Turn on description to provide details.",
      });
    }

  });

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = SubmitSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  if (parsed.data.ageGroup === "12_and_under") {
    return NextResponse.json(
      {
        error:
          "Submissions are limited to users 13 and older. If this clip belongs to a minor, please have a parent or legal guardian submit it.",
      },
      { status: 400 },
    );
  }

  const [row] = await db
    .insert(kindjoeClipSubmissions)
    .values({
      ageGroup: parsed.data.ageGroup,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email.toLowerCase(),
      clipUrl: parsed.data.clipUrl,
      filmedLocation: parsed.data.filmedLocation,
      hasDescription: parsed.data.hasDescription,
      clipDescription: parsed.data.clipDescription?.trim() || null,
      recordedBySubmitter: parsed.data.recordedBySubmitter,
      wantsClipCredit: parsed.data.wantsClipCredit,
      paypalEmail: null,
      digitalSignature: parsed.data.digitalSignature,
      acceptsSubmissionTerms: true,
      confirmsNoExclusiveAgreement: true,
      confirmsClipGuidelines: true,
      marketingOptIn: parsed.data.marketingOptIn,
    })
    .returning({ id: kindjoeClipSubmissions.id });

  return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
}
