"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const FAQS = [
  {
    question: "How often do you publish new articles?",
    answer:
      "We publish new stories daily covering current events, trending topics, and important conversations happening around the world.",
  },
  {
    question: "Can I submit my own story or news tip?",
    answer:
      "Absolutely! We welcome community submissions. Choose “Submit a Story” in the contact form and include your pitch, tip, or supporting details.",
  },
  {
    question: "Are your articles independently researched?",
    answer:
      "Yes. Every article goes through fact-checking, editorial review, and verification before publishing. Accuracy is extremely important to us.",
  },
  {
    question: "Do you accept sponsored posts or partnerships?",
    answer:
      "Yes — selectively. If you're a brand or organization looking to collaborate, select “Partnership Opportunity” in the contact form.",
  },
  {
    question: "Can I republish or quote your articles?",
    answer:
      "You may quote short excerpts with proper credit and a link back. For full reposting or syndication, please reach out for permission.",
  },
  {
    question: "How can I report an error in an article?",
    answer:
      "We take corrections seriously. If you spot an issue, select “Report an Issue” in the contact form and include the article link.",
  },
  {
    question: "Do you have a newsletter I can subscribe to?",
    answer:
      "Yes! We send out weekly highlights featuring top stories, editor picks, and trending news.",
  },
  {
    question: "Are the writers on your site professionals?",
    answer:
      "Our team includes journalists, researchers, and contributors with expertise in news reporting and storytelling.",
  },
  {
    question: "How do you choose which news to cover?",
    answer:
      "We prioritize stories that are impactful, important, and relevant to our audience — with a focus on accuracy, fairness, and integrity.",
  },
  {
    question: "How can I follow your updates?",
    answer:
      "You can follow us on TikTok, Instagram, Facebook, YouTube, and X for real-time updates, behind-the-scenes content, and story highlights.",
  },
];

const Faqs: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section className="py-20 px-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">
        Frequently Asked Questions
      </h2>

      <div className="space-y-4">
        {FAQS.map((faq, index) => (
          <motion.div
            key={faq.question}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.3, delay: index * 0.04 }}
            className="bg-slate-50 rounded-xl p-4 shadow-xs cursor-pointer"
          >
            <button
              type="button"
              onClick={() => toggle(index)}
              className="w-full flex items-center justify-between font-medium text-slate-900 hover:text-blue-600 transition-colors text-left cursor-pointer"
            >
              <span>{faq.question}</span>
              <motion.span
                animate={{ rotate: openIndex === index ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="ml-4 flex-shrink-0"
              >
                <svg
                  fill="none"
                  height="24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                  width="24"
                >
                  <path d="M6 9l6 6 6-6"></path>
                </svg>
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {openIndex === index && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <p className="text-slate-600 mt-4 leading-relaxed">
                    {faq.answer}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default Faqs;
