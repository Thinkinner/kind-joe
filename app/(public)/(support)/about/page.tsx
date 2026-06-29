"use client";

import React, { useState } from 'react';
import { Users, Heart, Coffee, Star, Mail, MapPin, Send } from 'lucide-react';

import {
  FaTiktok,
  FaXTwitter,
  FaInstagram,
  FaYoutube,
  FaFacebook,
} from "react-icons/fa6";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Faqs from "@/components/sections/faqs"; // Faqs component is imported but not used, consider removing if not needed.
import { PUBLIC_CONTACT_EMAIL } from "@/lib/legal/public-contact";

const About: React.FC = () => {
  // --- STATE AND HANDLERS ARE NOW INSIDE THE COMPONENT ---
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [showSuccess, setShowSuccess] = useState(false); // Used for a success modal, but no modal component is rendered in the current code.

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormState({
      ...formState,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/contact-support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formState),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Error submitting form:", data);
        alert("Something went wrong sending your message. Please try again.");
        return;
      }

      // Clear the form on success
      setFormState({
        name: "",
        email: "",
        subject: "",
        message: "",
      });

      // Show success modal (you'd need to render a modal component to use this)
      setShowSuccess(true);
      alert("Thank you for your message! We'll get back to you shortly."); // Added a temporary alert for success feedback
    } catch (error) {
      console.error("Network error:", error);
      alert("Network error. Please try again in a moment.");
    }
  };
  // --- END OF STATE AND HANDLERS ---

  return (
    <div className="w-full animate-fade-in pb-20">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 px-6 overflow-hidden">
        {/* Video Background */}
        <video
          className="absolute inset-0 w-full h-full object-cover z-0"
          src="/featuredvideo.mp4" // Path to your video in the public folder
          autoPlay
          loop
          muted
          playsInline // Important for mobile autoplay
        />
        {/* Overlay to improve text readability - INCREASED OPACITY */}
        <div className="absolute inset-0 bg-black opacity-60 z-0"></div>


        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <div className="relative z-10">
            <span className="inline-block py-1 px-3 rounded-full bg-indigo-50 text-indigo-600 text-sm font-semibold mb-6">
              Our Story
            </span>
            <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
              We believe in <br />
              {/* Adjusted gradient for better contrast */}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-200 to-sky-300 drop-shadow-lg">
                kindness first.
              </span>
            </h1>
            <p className="text-lg text-indigo-100 mb-8 leading-relaxed max-w-lg">
              Kind Joe is an independent digital news publisher based in Ventura
              County, California. We publish original reporting, analysis, and
              local coverage on kindjoe.com — written and edited by our team.
              Our mission is to deliver clear, engaging journalism that keeps
              readers informed about the stories that matter in our community
              and beyond.
            </p>
          </div>
          <div className="relative lg:h-[500px] w-full rounded-3xl overflow-hidden shadow-lg">
            <img
              src="https://storage.googleapis.com/msgsndr/VPl4AjuzzxeZqlljHIdI/media/6925d3c476cd827b3cc3620a.png"
              alt="Team working together"
              className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
          </div>
        </div>
      </section>

      {/* About Us Extended / Mission Section */}
      <section className="relative py-20 bg-white px-6">
        {/* Subtle abstract background element for visual interest */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none z-0">
          <svg className="w-full h-full" viewBox="0 0 1440 800" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 0C0 0 240 160 720 160C1200 160 1440 0 1440 0V800H0V0Z" fill="url(#paint0_linear_1_2)" />
            <defs>
              <linearGradient id="paint0_linear_1_2" x1="720" y1="0" x2="720" y2="800" gradientUnits="userSpaceOnUse">
                <stop stopColor="#F5F3FF" /> {/* Light purple */}
                <stop offset="1" stopColor="#FFFFFF" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">Our Mission & Values</h2>
          <p className="text-lg text-slate-700 mb-12 max-w-3xl mx-auto">
            Kind Joe was founded to foster a more informed, empathetic internet
            through transparent, fact-based journalism. We publish original
            articles on kindjoe.com, follow our{" "}
            <a href="/editorial-policy" className="text-red-700 underline">
              editorial policy
            </a>
            , and clearly label third-party headline links when we reference
            external sources. Questions?{" "}
            <a href="/contact" className="text-red-700 underline">
              Contact our team
            </a>
            .
          </p>

          {/* Stats/Values Section - moved here for better context */}
          <div className="grid md:grid-cols-3 gap-8 text-center mt-12">
            <div className="bg-slate-50 p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              {/* Vibrant Icon Backgrounds */}
              <div className="w-12 h-12 bg-indigo-200 text-indigo-700 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Heart size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Compassion</h3>
              <p className="text-slate-600">Every story we tell is rooted in empathy and understanding for the human experience.</p>
            </div>
            <div className="bg-slate-50 p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              {/* Vibrant Icon Backgrounds */}
              <div className="w-12 h-12 bg-violet-200 text-violet-700 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Coffee size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Community</h3>
              <p className="text-slate-600">We are building a safe space where diverse voices are heard, respected, and celebrated.</p>
            </div>
            <div className="bg-slate-50 p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              {/* Vibrant Icon Backgrounds */}
              <div className="w-12 h-12 bg-pink-200 text-pink-700 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Star size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Quality</h3>
              <p className="text-slate-600">We value depth over breadth, ensuring every piece of content adds real value to your day.</p>
            </div>
          </div>
        </div>
      </section>
      <section className="bg-slate-50 py-20 px-6 bg-slate-900">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Get in touch
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Have a question, a story idea, or just want to say hello? We'd love
            to hear from you.
          </p>
        </div>
      </section>
      {/* NEW Contact Section - VERTICAL LAYOUT */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto space-y-12"> {/* Replaced grid with space-y for vertical stacking */}

          {/* Contact Info and Form - COMBINED INTO ONE CARD */}
          <div className="rounded-3xl shadow-xl overflow-hidden border border-slate-100 bg-white">
            <div className="grid md:grid-cols-5"> {/* Keep this inner grid for sidebar + form */}
              {/* Contact Info Sidebar */}
              <div className="md:col-span-2 bg-gradient-to-b from-blue-900 to-indigo-950 p-10 text-white flex flex-col justify-between relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold mb-6">Contact Information</h3>
                  <p className="text-blue-100 mb-10 leading-relaxed">
                    Fill up the form and our team will get back to you within 24
                    hours.
                  </p>

                  <div className="space-y-6">
                    <div className="flex items-start space-x-4">
                      <Mail className="w-6 h-6 text-blue-300 mt-1" />
                      <div>
                        <p className="font-medium">Email</p>
                        <p className="text-blue-100">{PUBLIC_CONTACT_EMAIL}</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <MapPin className="w-6 h-6 text-blue-300 mt-1" />
                      <div>
                        <p className="font-medium">Office</p>
                        <p className="text-blue-100">
                          3863 Grandview Blvd,
                          <br />
                          Los Angeles, CA 90066
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Socials - Flex-wrap to prevent overflow */}
                <div className="relative z-10 mt-12">
                  <div className="flex flex-wrap gap-3">
                    <a
                      href="https://www.tiktok.com/@thekind.joe"
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-full bg-white/10 hover:bg-blue-300/20 transition-all"
                    >
                      <FaTiktok className="h-6 w-6 text-white" />
                    </a>

                    <a
                      href="https://x.com/TheKindJoe"
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-full bg-white/10 hover:bg-blue-300/20 transition-all"
                    >
                      <FaXTwitter className="h-6 w-6 text-white" />
                    </a>

                    <a
                      href="https://www.instagram.com/thekindjoe/"
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-full bg-white/10 hover:bg-blue-300/20 transition-all"
                    >
                      <FaInstagram className="h-6 w-6 text-white" />
                    </a>

                    <a
                      href="https://www.youtube.com/@thekindjoe-w4d"
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-full bg-white/10 hover:bg-blue-300/20 transition-all"
                    >
                      <FaYoutube className="h-6 w-6 text-white" />
                    </a>

                    <a
                      href="https://www.facebook.com/thekindjoe"
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-full bg-white/10 hover:bg-blue-300/20 transition-all"
                    >
                      <FaFacebook className="h-6 w-6 text-white" />
                    </a>
                  </div>
                </div>

                {/* Decorative Circle */}
                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500 rounded-full opacity-50 blur-2xl pointer-events-none"></div>
              </div>

              {/* Form Section */}
              <div className="md:col-span-3 p-10 bg-white">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label
                        htmlFor="name"
                        className="text-sm font-semibold text-slate-700"
                      >
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formState.name}
                        onChange={handleChange}
                        placeholder="Jane Doe"
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-slate-100 focus:bg-white"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="email"
                        className="text-sm font-semibold text-slate-700"
                      >
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formState.email}
                        onChange={handleChange}
                        placeholder="jane@example.com"
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-slate-100 focus:bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="subject"
                      className="text-sm font-semibold text-slate-700"
                    >
                      Subject
                    </label>

                    <select
                      id="subject"
                      name="subject"
                      value={formState.subject}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-slate-100 focus:bg-white"
                      required
                    >
                      <option value="">Select a topic</option>
                      <option value="general">General Inquiry</option>
                      <option value="story">Submit a Story</option>
                      <option value="partnership">Partnership Opportunity</option>
                      <option value="support">Report an Issue</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="message"
                      className="text-sm font-semibold text-slate-700"
                    >
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={6}
                      value={formState.message}
                      onChange={handleChange}
                      placeholder="Write your message here..."
                      className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-slate-100 focus:bg-white resize-none"
                      required
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="w-full md:w-auto bg-slate-900 text-white px-8 py-3.5 rounded-lg font-semibold hover:bg-slate-800 focus:ring-4 focus:ring-slate-200 transition-all flex items-center justify-center space-x-2 hover:scale-[1.02] transform"
                  >
                    <span>Send Message</span>
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Google Maps embed - Now a separate, stacked card */}
          <div className="h-[600px] w-full rounded-3xl overflow-hidden shadow-xl"> {/* Consistent rounded corners */}
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3305.2863955627684!2d-118.4239240237748!3d34.06202511419736!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80c2bc56b4648c69%3A0xc3f12b6f1f4b7a1e!2s3863%20Grandview%20Blvd%2C%20Los%20Angeles%2C%20CA%2090066%2C%20USA!5e0!3m2!1sen!2sin!4v1700438400000!5m2!1sen!2sin"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>

        </div>
        {/* FAQ Teaser */}
        <Faqs />
      </section>
    </div>
  );
};

export default About;