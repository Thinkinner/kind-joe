import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Predictions",
  description: "News prediction markets.",
};

export default async function PredictionFeedPage() {
  redirect("/predictions");
}
