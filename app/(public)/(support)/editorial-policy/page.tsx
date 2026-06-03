import React from 'react';
import { ShieldCheck, Scale, FileText, AlertCircle } from 'lucide-react';
import { PUBLIC_CONTACT_EMAIL } from "@/lib/legal/public-contact";

const EditorialPolicy: React.FC = () => {
  return (
    <div className="bg-white min-h-screen">
      
      {/* Header */}
      <div className="bg-slate-900 text-white py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-2 text-indigo-400 mb-4 font-semibold uppercase tracking-wider text-sm">
            <ShieldCheck size={20} />
            <span>Editorial Policy</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">KIND JOE EDITORIAL POLICY</h1>
          <p className="text-lg text-slate-300 max-w-2xl">
            Our commitment to factual, transparent, and ethical content. Last updated: November 2025.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-12 gap-12">
          
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-3 hidden lg:block">
            <div className="sticky top-32 space-y-2">
              <p className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Contents</p>
              <a href="#accuracy" className="block text-slate-600 hover:text-indigo-600 text-sm py-1">Accuracy & Verification</a>
              <a href="#transparency" className="block text-slate-600 hover:text-indigo-600 text-sm py-1">Transparency & Attribution</a>
              <a href="#corrections" className="block text-slate-600 hover:text-indigo-600 text-sm py-1">Corrections</a>
              <a href="#independence" className="block text-slate-600 hover:text-indigo-600 text-sm py-1">Editorial Independence</a>
              <a href="#ethics" className="block text-slate-600 hover:text-indigo-600 text-sm py-1">Ethical & Responsible Content</a>
              <a href="#privacy" className="block text-slate-600 hover:text-indigo-600 text-sm py-1">Privacy & Safety</a>
              <a href="#oversight" className="block text-slate-600 hover:text-indigo-600 text-sm py-1">Human Oversight</a>
              <a href="#contact" className="block text-slate-600 hover:text-indigo-600 text-sm py-1">Contact</a>
            </div>
          </aside>

          {/* Main Content */}
          <article className="lg:col-span-8 lg:col-start-5 prose prose-slate prose-lg max-w-none">
            
            {/* Accuracy & Verification */}
            <section id="accuracy" className="mb-16">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                  <Scale size={24} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 m-0">Accuracy & Verification</h2>
              </div>
              <p className="text-slate-600">
                Kind Joe is committed to factual, reliable reporting. All news and viral content is reviewed by our editorial team, verified through credible sources, and updated as new information becomes available.
              </p>
            </section>

            <div className="w-full h-px bg-slate-200 my-12"></div>

            {/* Transparency & Attribution */}
            <section id="transparency" className="mb-16">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                  <FileText size={24} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 m-0">Transparency & Attribution</h2>
              </div>
              <p className="text-slate-600">
                We clearly cite our sources, credit creators, and disclose when viral content cannot be independently verified. We aim to provide context, not confusion.
              </p>
              <p className="text-slate-600 mt-4">
                Original Kind Joe articles are published and hosted on kindjoe.com.
                When we link to headlines on other publishers, those links are
                labeled as external, open in a new tab, and are separate from
                our on-site reporting.
              </p>
            </section>

            <div className="w-full h-px bg-slate-200 my-12"></div>

            {/* Corrections */}
            <section id="corrections" className="mb-16">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                  <AlertCircle size={24} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 m-0">Corrections</h2>
              </div>
              <p className="text-slate-600">
                If we publish incorrect information, we remove content or correct it promptly and note significant updates clearly. Readers may report errors through our contact email.
              </p>
            </section>

            <div className="w-full h-px bg-slate-200 my-12"></div>

            {/* Editorial Independence */}
            <section id="independence" className="mb-16">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Editorial Independence</h2>
              <p className="text-slate-600">
                Our coverage is free from outside influence. Advertisers, partners, and sponsors do not dictate our news decisions or editorial judgment.
              </p>
            </section>

            <div className="w-full h-px bg-slate-200 my-12"></div>

            {/* Ethical & Responsible Content */}
            <section id="ethics" className="mb-16">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Ethical & Responsible Content</h2>
              <p className="text-slate-600">
                We avoid misleading, harmful, or manipulative material. Viral videos and user-generated content are reviewed carefully, used responsibly, and handled with respect for privacy and creator rights.
              </p>
            </section>

            <div className="w-full h-px bg-slate-200 my-12"></div>

            {/* Privacy & Safety */}
            <section id="privacy" className="mb-16">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Privacy & Safety</h2>
              <p className="text-slate-600">
                We do not reveal personal information without consent unless it is essential for legitimate public-interest reporting.
              </p>
            </section>

            <div className="w-full h-px bg-slate-200 my-12"></div>

            {/* Human Oversight */}
            <section id="oversight" className="mb-16">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Human Oversight</h2>
              <p className="text-slate-600">
                While we may use digital or AI tools to support workflows, all editorial decisions, reviews, and fact-checking are performed by human editors.
              </p>
            </section>

            <div className="w-full h-px bg-slate-200 my-12"></div>

            {/* Contact */}
            <section id="contact" className="mb-16">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Contact</h2>
              <p className="text-slate-600">
                For questions, corrections, or concerns, please reach us at{" "}
                <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`} className="text-indigo-600 underline underline-offset-2">
                  {PUBLIC_CONTACT_EMAIL}
                </a>.
              </p>
            </section>

          </article>
        </div>
      </div>
    </div>
  );
};

export default EditorialPolicy;
