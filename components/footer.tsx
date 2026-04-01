"use client";
import React, { useState, FormEvent } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  FaTiktok,
  FaInstagram,
  FaYoutube,
  FaFacebook,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import KindJoeModalForm from "./modals/kindjoe-capture-modal";
import { PUBLIC_CONTACT_EMAIL } from "@/lib/legal/public-contact";

export function Footer() {
  const year = new Date().getFullYear();
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setOpen(true);
  };

  return (
    <footer className="bg-slate-950 text-gray-300 border-t border-gray-800 relative">
      {/* Decorative gradient glow at the top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-red-900/50 to-transparent" />

      <div className="w-full mx-auto px-6 py-12 lg:py-16">
        {/* Top Section: Newsletter & Branding */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 mb-16 border-b border-gray-800 pb-12">
          {/* Brand & Newsletter CTA */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-white tracking-tight">
                Join the <span className="text-red-600">Kind Joe</span>{" "}
                Community
              </h2>
              <p className="mt-4 text-gray-400 leading-relaxed">
                Subscribe to our newsletter to stay updated on our latest
                content, editorial pieces, and community announcements from
                Ventura County and beyond.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="relative max-w-md">
              <div className="relative flex items-center">
                <Input
                  type="email"
                  placeholder="Enter your email address..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full py-6 pl-6 pr-36 bg-[#1a1a1a] border-gray-700 text-white rounded-full focus:ring-2 focus:ring-red-900 focus:border-red-600 transition-all"
                />
                <Button
                  type="submit"
                  className="absolute right-1.5 py-4 px-6 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full shadow-lg shadow-red-900/20 transition-all duration-300"
                >
                  Subscribe
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-3 pl-4">
                We respect your inbox. Unsubscribe at any time.
              </p>
            </form>
          </div>

          {/* Spacer */}
          <div className="hidden lg:block lg:col-span-1" />

          {/* Navigation Links Grid */}
          <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {/* Column 1: Explore */}
            <div className="space-y-4">
              <h3 className="font-semibold text-white tracking-wide uppercase text-sm border-l-2 border-red-600 pl-3">
                Explore
              </h3>
              <ul className="space-y-3 text-sm text-gray-400">
                <li>
                  <a
                    href="/"
                    className="hover:text-red-500 hover:pl-1 transition-all duration-200 block"
                  >
                    Home
                  </a>
                </li>
                <li>
                  <a
                    href="/newsletter"
                    className="hover:text-red-500 hover:pl-1 transition-all duration-200 block"
                  >
                    Newsletters
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 2: Connect */}
            <div className="space-y-4">
              <h3 className="font-semibold text-white tracking-wide uppercase text-sm border-l-2 border-red-600 pl-3">
                Connect
              </h3>
              <ul className="space-y-3 text-sm text-gray-400">
                <li>
                  <a
                    href="/contact"
                    className="hover:text-red-500 hover:pl-1 transition-all duration-200 block"
                  >
                    Contact Us
                  </a>
                </li>
                <li>
                  <a
                    href="/advertise"
                    className="hover:text-red-500 hover:pl-1 transition-all duration-200 block"
                  >
                    Advertise
                  </a>
                </li>
                {/* <li className="pt-2">
                   <div className="flex items-start gap-2 text-gray-500 text-xs leading-tight">
                    <FaMapMarkerAlt className="flex-shrink-0 mt-0.5 text-red-800" />
                    <span>Based in<br/>Ventura County, CA</span>
                   </div>
                </li> */}
              </ul>
            </div>

            {/* Column 3: Legal */}
            <div className="space-y-4">
              <h3 className="font-semibold text-white tracking-wide uppercase text-sm border-l-2 border-red-600 pl-3">
                Legal
              </h3>
              <ul className="space-y-3 text-sm text-gray-400">
                <li>
                  <a
                    href="/terms-of-service"
                    className="hover:text-red-500 hover:pl-1 transition-all duration-200 block"
                  >
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a
                    href="/privacy-policy"
                    className="hover:text-red-500 hover:pl-1 transition-all duration-200 block"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="/disclaimer"
                    className="hover:text-red-500 hover:pl-1 transition-all duration-200 block"
                  >
                    Disclaimer
                  </a>
                </li>
                <li>
                  <a
                    href="/editorial-policy"
                    className="hover:text-red-500 hover:pl-1 transition-all duration-200 block"
                  >
                    Editorial Policy
                  </a>
                </li>
              </ul>
              <p className="text-xs text-gray-500 leading-relaxed pt-3 max-w-[16rem]">
                If you are a content owner and want material reviewed or removed, contact us at{" "}
                <a
                  href={`mailto:${PUBLIC_CONTACT_EMAIL}`}
                  className="text-gray-400 hover:text-red-400 underline-offset-2 hover:underline"
                >
                  {PUBLIC_CONTACT_EMAIL}
                </a>
                .
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Section: Socials & Copyright */}
        <div className="flex flex-col-reverse md:flex-row justify-between items-center gap-6">

          <div className="flex gap-4">
            <SocialLink
              href="https://www.tiktok.com/@thekind.joe"
              icon={<FaTiktok />}
            />
            <SocialLink href="https://x.com/TheKindJoe" icon={<FaXTwitter />} />
            <SocialLink
              href="https://www.instagram.com/thekindjoe/"
              icon={<FaInstagram />}
            />
            <SocialLink
              href="https://www.youtube.com/@thekindjoe-w4d"
              icon={<FaYoutube />}
            />
            <SocialLink
              href="https://www.facebook.com/thekindjoe"
              icon={<FaFacebook />}
            />
          </div>
        </div>
      </div>

      {/* Custom Modal Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl relative">
            <KindJoeModalForm
              onBack={() => setOpen(false)}
              initialEmail={email}
            />
          </div>
        </div>
      )}
    </footer>
  );
}

// Helper component for social icons to ensure consistent styling
function SocialLink({ href, icon }: { href: string; icon: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-[#1a1a1a] p-3 rounded-full text-gray-400 hover:text-white hover:bg-red-600 transition-all duration-300 hover:-translate-y-1 shadow-md hover:shadow-red-900/30"
    >
      <div className="w-5 h-5 flex items-center justify-center">{icon}</div>
    </a>
  );
}
