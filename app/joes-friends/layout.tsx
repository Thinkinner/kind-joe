import type { Metadata } from "next";
import { Archivo_Black, Caveat, Space_Grotesk } from "next/font/google";

import { JoesFriendsFooter } from "@/components/joes-friends/footer";
import { JoesFriendsHeader } from "@/components/joes-friends/header";

const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-archivo-black",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    absolute: "Joe's Friends — Stop Running Your Own Content Department",
  },
  description:
    "A social media company built by Kind Joe. We manage your pages, edit and create the posts, and grow the audience — with a proven niche already delivering millions of views.",
};

export default function JoesFriendsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${archivoBlack.variable} ${spaceGrotesk.variable} ${caveat.variable} jf-root flex min-h-dvh flex-col antialiased`}
    >
      <JoesFriendsHeader />
      <div className="flex-1">{children}</div>
      <JoesFriendsFooter />
    </div>
  );
}
