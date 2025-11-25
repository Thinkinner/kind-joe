import React from 'react';
import { ShieldCheck, Scale, FileText, AlertCircle } from 'lucide-react';

const EditorialPolicy: React.FC = () => {
  return (
    <div className="bg-white min-h-screen">
      
      {/* Header */}
      <div className="bg-slate-900 text-white py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-2 text-indigo-400 mb-4 font-semibold uppercase tracking-wider text-sm">
            <ShieldCheck size={20} />
            <span>Transparency & Trust</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Editorial Policy</h1>
          <p className="text-lg text-slate-300 max-w-2xl">
            Our commitment to accuracy, integrity, and our readers. Last updated: November 2025.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-12 gap-12">
          
          {/* Sidebar Navigation (Sticky on desktop) */}
          <aside className="lg:col-span-3 hidden lg:block">
            <div className="sticky top-32 space-y-2">
              <p className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Contents</p>
              <a href="#mission" className="block text-slate-600 hover:text-indigo-600 transition-colors text-sm py-1">Mission & Values</a>
              <a href="#fact-checking" className="block text-slate-600 hover:text-indigo-600 transition-colors text-sm py-1">Fact-Checking</a>
              <a href="#corrections" className="block text-slate-600 hover:text-indigo-600 transition-colors text-sm py-1">Corrections Policy</a>
              <a href="#independence" className="block text-slate-600 hover:text-indigo-600 transition-colors text-sm py-1">Editorial Independence</a>
              <a href="#diversity" className="block text-slate-600 hover:text-indigo-600 transition-colors text-sm py-1">Diversity & Inclusion</a>
            </div>
          </aside>

          {/* Main Content */}
          <article className="lg:col-span-8 lg:col-start-5 prose prose-slate prose-lg max-w-none">
            
            <section id="mission" className="mb-16">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                  <Scale size={24} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 m-0">Our Mission & Values</h2>
              </div>
              <p className="text-slate-600 leading-relaxed">
                At KindJoe, we are dedicated to providing content that informs, inspires, and fosters a sense of community. We believe that media has the power to shape perspectives, and we take that responsibility seriously. Our editorial process is guided by three core principles: <strong>Accuracy, Empathy, and Transparency</strong>.
              </p>
              <p className="text-slate-600 leading-relaxed mt-4">
                We strive to tell stories that matter, highlighting human experiences and providing practical advice that improves our readers' lives. We avoid sensationalism and clickbait, preferring to build trust through consistent quality.
              </p>
            </section>

            <div className="w-full h-px bg-slate-200 my-12"></div>

            <section id="fact-checking" className="mb-16">
               <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                  <FileText size={24} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 m-0">Fact-Checking Standards</h2>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Accuracy is the cornerstone of our reputation. Every article published on KindJoe undergoes a rigorous review process.
              </p>
              <ul className="list-disc pl-6 space-y-3 mt-6 text-slate-600">
                <li><strong>Verification:</strong> Writers are required to verify all facts, quotes, and statistics with primary sources whenever possible.</li>
                <li><strong>Sources:</strong> We prioritize credible, authoritative sources such as academic journals, government reports, and expert interviews. We link to these sources to allow readers to verify information for themselves.</li>
                <li><strong>Review:</strong> An editor reviews all content before publication. For sensitive or complex topics, we may consult subject matter experts.</li>
              </ul>
            </section>

            <div className="w-full h-px bg-slate-200 my-12"></div>

            <section id="corrections" className="mb-16">
               <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                  <AlertCircle size={24} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 m-0">Corrections Policy</h2>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Despite our best efforts, errors may occasionally occur. When they do, we are committed to correcting them promptly and transparently.
              </p>
              <div className="bg-slate-50 border-l-4 border-indigo-500 p-6 my-6 rounded-r-lg">
                <p className="text-slate-700 italic m-0">
                  "If you spot an error in one of our articles, please contact us at <a href="mailto:corrections@kindjoe.com" className="text-indigo-600 underline decoration-indigo-300 underline-offset-2">corrections@kindjoe.com</a>. We will investigate and update the article if necessary."
                </p>
              </div>
              <p className="text-slate-600 leading-relaxed">
                When a significant error is corrected, we will add a note at the bottom of the article detailing the change and the date it was made. Minor typos that do not affect the meaning of the content may be corrected without a note.
              </p>
            </section>

            <div className="w-full h-px bg-slate-200 my-12"></div>

            <section id="independence" className="mb-16">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Editorial Independence</h2>
              <p className="text-slate-600 leading-relaxed">
                Our editorial content is independent of advertising and sponsorship. Advertisers do not influence our coverage, and we do not allow them to review articles before publication.
              </p>
              <p className="text-slate-600 leading-relaxed mt-4">
                <strong>Affiliate Disclosure:</strong> KindJoe may participate in affiliate marketing programs, which means we may get paid commissions on editorially chosen products purchased through our links to retailer sites. However, every product we feature is selected independently by our editorial team based on its merit.
              </p>
            </section>
             
             <div className="w-full h-px bg-slate-200 my-12"></div>

             <section id="diversity" className="mb-16">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Diversity & Inclusion</h2>
              <p className="text-slate-600 leading-relaxed">
                We believe that diverse voices make our storytelling stronger. We are committed to featuring a wide range of perspectives in our content and maintaining a diverse team of contributors. We actively seek to amplify voices that have been historically marginalized in media.
              </p>
            </section>

          </article>
        </div>
      </div>
    </div>
  );
};

export default EditorialPolicy;