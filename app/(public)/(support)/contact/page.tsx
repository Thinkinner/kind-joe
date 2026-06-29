"use client";

import React, { useState } from "react";
import { Mail, MapPin, Send, CheckCircle2 } from "lucide-react";
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
import Faqs from "@/components/sections/faqs";
import { PUBLIC_CONTACT_EMAIL } from "@/lib/legal/public-contact";

const Contact: React.FC = () => {
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [showSuccess, setShowSuccess] = useState(false);

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

      // Show success modal
      setShowSuccess(true);
    } catch (error) {
      console.error("Network error:", error);
      alert("Network error. Please try again in a moment.");
    }
  };

  return (
    <div className="min-h-screen bg-white pb-20 relative">
      {/* Header */}
      <section className="relative h-[50vh] flex items-center justify-center overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/featuredvideo.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div className="absolute inset-0 bg-black/60"></div> {/* Overlay for text readability */}
        <div className="max-w-4xl mx-auto text-center relative z-10 px-6">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Get in touch
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Have a question, a story idea, or just want to say hello? We'd love
            to hear from you.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 -mt-20 relative z-20"> {/* Adjusted margin-top and z-index */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
          <div className="grid lg:grid-cols-5">
            {/* Contact Info Sidebar */}
            <div className="lg:col-span-2 bg-blue-900 p-10 text-white flex flex-col justify-between relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-6">Contact Information</h3>
                <p className="text-blue-100 mb-10 leading-relaxed">
                  Fill up the form and our team will get back to you within 24
                  hours.
                </p>

                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    {/* <Mail className="w-6 h-6 text-blue-300 mt-1" /> */}
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-blue-100">{PUBLIC_CONTACT_EMAIL}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    {/* <MapPin className="w-6 h-6 text-blue-300 mt-1" /> */}
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

              {/* Socials */}
              <div className="relative z-10 mt-12">
                <div className="flex gap-5">
                  <a
                    href="https://www.tiktok.com/@thekind.joe"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {/* <FaTiktok className="hover:text-red-600 transition h-6 w-6" /> */}
                  </a>

                  <a
                    href="https://x.com/TheKindJoe"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {/* <FaXTwitter className="hover:text-red-600 transition h-6 w-6" /> */}
                  </a>

                  <a
                    href="https://www.instagram.com/thekindjoe/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {/* <FaInstagram className="hover:text-red-600 transition h-6 w-6" /> */}
                  </a>

                  <a
                    href="https://www.youtube.com/@thekindjoe-w4d"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {/* <FaYoutube className="hover:text-red-600 transition h-6 w-6" /> */}
                  </a>

                  <a
                    href="https://www.facebook.com/thekindjoe"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {/* <FaFacebook className="hover:text-red-600 transition h-6 w-6" /> */}
                  </a>
                </div>
              </div>

              {/* Decorative Circle */}
              <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500 rounded-full opacity-50 blur-2xl pointer-events-none"></div>
            </div>

            {/* Form Section */}
            <div className="lg:col-span-3 p-10 bg-white">
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
                      className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-slate-50 focus:bg-white"
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
                      className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-slate-50 focus:bg-white"
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

                  {/* Assuming Select, SelectTrigger, SelectValue, SelectContent, SelectItem are imported components */}
                  {/* <Select
                    value={formState.subject}
                    onValueChange={(value) =>
                      setFormState((prev) => ({ ...prev, subject: value }))
                    }
                  >
                    <SelectTrigger
                      id="subject"
                      className="w-full px-4 py-7 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all bg-slate-50 focus:bg-white"
                    >
                      <SelectValue placeholder="Select a topic" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="general">General Inquiry</SelectItem>
                      <SelectItem value="story">Submit a Story</SelectItem>
                      <SelectItem value="partnership">
                        Partnership Opportunity
                      </SelectItem>
                      <SelectItem value="support">Report an Issue</SelectItem>
                    </SelectContent>
                  </Select> */}
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
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-slate-50 focus:bg-white resize-none"
                    required
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full md:w-auto bg-slate-900 text-white px-8 py-3.5 rounded-lg font-semibold hover:bg-slate-800 focus:ring-4 focus:ring-slate-200 transition-all flex items-center justify-center space-x-2"
                >
                  <span>Send Message</span>
                  {/* Assuming Send is an imported icon */}
                  {/* <Send size={18} /> */}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Teaser */}
      {/* Assuming Faqs is a component */}
      {/* <Faqs /> */}

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 p-8 text-center relative">
            <button
              type="button"
              onClick={() => setShowSuccess(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <span className="sr-only">Close</span>×
            </button>

            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
                {/* Assuming CheckCircle2 is an imported icon */}
                {/* <CheckCircle2 className="w-8 h-8 text-green-500" /> */}
              </div>
            </div>

            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Message sent!
            </h3>
            <p className="text-slate-600 mb-6">
              Thanks for reaching out! Your message has been sent, and our team
              will get back to you within 24–48 hours.
            </p>

            <button
              type="button"
              onClick={() => setShowSuccess(false)}
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 focus:ring-4 focus:ring-slate-200 transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contact;
