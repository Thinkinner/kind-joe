"use client";

import { useState, FormEvent } from "react";
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button";
import {
  FaTiktok,
  FaInstagram,
  FaYoutube,
  FaFacebook,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

import KindJoeModalForm from "@/components/modals/email-capture-modal"; // path as you had it

export function Footer() {
  const year = new Date().getFullYear();
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setOpen(true); // show our custom modal
  };

  return (
    <footer className="bg-[#0d0d0d] text-gray-300 border-t border-gray-800">
      {/* Full-width container with px-5 py-5 */}
      <div className="w-full px-5 py-5">
        <div className="lg:flex lg:items-start lg:gap-12">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-8 w-full">
            {/* Newsletter copy */}
            <div className="col-span-2">
              <h2 className="text-2xl font-bold text-white">
                Get the latest news!
              </h2>
              <p className="mt-3 text-gray-400">
                Subscribe to our newsletter to stay updated on our latest
                content and announcements.
              </p>
            </div>

            {/* Newsletter Form */}
            <div className="col-span-2 lg:col-span-3 flex items-end">
              <form
                onSubmit={handleSubmit}
                className="w-full flex flex-col sm:flex-row gap-3"
              >
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="py-6 pl-5 bg-white text-black rounded-full"
                />
                <Button
                  type="submit"
                  className="py-6 px-10 bg-red-500 hover:bg-red-600 text-white font-semibold cursor-pointer rounded-full"
                >
                  Subscribe
                </Button>
              </form>
            </div>

            {/* Navigation */}
            <div>
              <p className="font-medium text-white">Navigation</p>
              <ul className="mt-5 space-y-3 text-sm">
                <li>
                  <a className="hover:text-red-600 transition" href="/">
                    Home
                  </a>
                </li>
                <li>
                  <a
                    className="hover:text-red-600 transition"
                    href="/terms-of-service"
                  >
                    Terms of Services
                  </a>
                </li>
                <li>
                  <a
                    className="hover:text-red-600 transition"
                    href="/privacy-policy"
                  >
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>

            {/* Featured */}
            <div>
              <p className="font-medium text-white">Featured</p>
              <ul className="mt-5 space-y-3 text-sm">
                <li>
                  <a
                    className="hover:text-red-600 transition"
                    href="/newsletter"
                  >
                    Newsletters
                  </a>
                </li>
                <li>
                  <a
                    className="hover:text-red-600 transition"
                    href="/advertise"
                  >
                    Advertise with us
                  </a>
                </li>
              </ul>
            </div>

            {/* Social */}
            <div className="col-span-2 flex gap-5 lg:col-span-5 lg:justify-end mt-4">
              <a href="https://www.tiktok.com/@thekind.joe" target="_blank">
                <FaTiktok className="hover:text-red-600 transition h-6 w-6" />
              </a>

              <a href="https://x.com/TheKindJoe" target="_blank">
                <FaXTwitter className="hover:text-red-600 transition h-6 w-6" />
              </a>

              <a
                href="https://www.instagram.com/thekindjoe/"
                target="_blank"
              >
                <FaInstagram className="hover:text-red-600 transition h-6 w-6" />
              </a>

              <a
                href="https://www.youtube.com/@thekindjoe-w4d"
                target="_blank"
              >
                <FaYoutube className="hover:text-red-600 transition h-6 w-6" />
              </a>

              <a href="https://www.facebook.com/thekindjoe" target="_blank">
                <FaFacebook className="hover:text-red-600 transition h-6 w-6" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between">
          <p className="text-xs text-gray-500">
            © {year}. Kind Joe. All rights reserved.
          </p>

          <ul className="mt-5 sm:mt-0 flex gap-5 text-xs">
            <li>
              <a
                className="hover:text-red-600 transition"
                href="/terms-of-service"
              >
                Terms of Services
              </a>
            </li>
            <li>
              <a
                className="hover:text-red-600 transition"
                href="/privacy-policy"
              >
                Privacy Policy
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* 🔻 Custom Modal Overlay using KindJoeModalForm */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-4">
          <div className="w-full max-w-2xl">
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
