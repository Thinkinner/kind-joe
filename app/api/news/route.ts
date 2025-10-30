import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    featured: {
      id: "f1",
      title: "Amazon just kicked off the new era of giant AI layoffs",
      category: "EXCLUSIVE",
      date: "Oct 27 2025",
      readTime: "7 min read",
      imageSrc: "https://placehold.co/800x450/png",
      href: "/story/ai-layoffs",
    },
    articles: [
      {
        id: "a1",
        title:
          "Female founders say sexual harassment is still common while seeking VC funding",
        category: "EXCLUSIVE",
        imageSrc: "https://placehold.co/500x550/png",
        href: "/story/founders-vc",
      },
      {
        id: "a2",
        title: "Stripe rolls out new billing SDK",
        category: "FINTECH",
        imageSrc: "https://placehold.co/500x550/png",
        href: "/story/stripe-billing",
      },
      {
        id: "a3",
        title: "Meta pauses Llama Cloud in EU",
        category: "AI",
        imageSrc: "https://placehold.co/500x550/png",
        href: "/story/meta-llama-eu",
      },
      {
        id: "a4",
        title: "NVIDIA debuts RTX 5090",
        category: "HARDWARE",
        imageSrc: "https://placehold.co/500x550/png",
        href: "/story/rtx-5090",
      },
    ],
  });
}
