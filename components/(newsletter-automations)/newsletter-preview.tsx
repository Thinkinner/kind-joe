"use client";

import React from "react";
import { 
  Youtube, 
  Instagram, 
  Twitter, 
  ExternalLink, 
  FileText,
  Coffee,
} from "lucide-react";

// Types
import { NewsletterData, NewsletterStory } from "@/lib/(newsletter-automations)/types";
import { deriveNewsletterLeadFromStories } from "@/lib/(newsletter-automations)/newsletter-lead";
import {
  buildNewsletterStoryHref,
  normalizeSiteBase,
} from "@/lib/(newsletter-automations)/newsletter-links";
import {
  splitNewsletterStorySummary,
  tokenizeNewsletterInlineMarkdown,
} from "@/lib/(newsletter-automations)/newsletter-summary";
import { KINDJOE_NEWSLETTER_END_PROMO } from "@/lib/(newsletter-automations)/newsletter-end-promo";
import { cn } from "@/lib/utils";

interface NewsletterPreviewProps {
  data: NewsletterData;
}

const NewsletterInlineText: React.FC<{ text: string }> = ({ text }) => (
  <>
    {tokenizeNewsletterInlineMarkdown(text).map((token, index) => {
      if (token.type === "strong") {
        return <strong key={index}>{token.value}</strong>;
      }
      if (token.type === "em") {
        return <em key={index}>{token.value}</em>;
      }
      return <React.Fragment key={index}>{token.value}</React.Fragment>;
    })}
  </>
);

const StoryBlock: React.FC<{ story: NewsletterStory; isLast: boolean }> = ({ story, isLast }) => {
  const publicSite = normalizeSiteBase(
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SITE_URL : undefined,
  );
  const storyHref = buildNewsletterStoryHref(story, publicSite);
  const displayCategory = story.category || story.slotName.replace(/^Slot\s+\d+\s*[-—:]\s*/i, "");
  const { intro: introText, bullets: bulletPoints } = splitNewsletterStorySummary(
    story.summary || "",
  );

  return (
    <div className={cn(
      "mb-8 pb-8 transition-colors",
      !isLast ? "border-b border-border/50" : ""
    )}>
      {/* Category Label */}
      <div className="mb-2">
        <span className="text-xs font-bold uppercase tracking-widest text-blue-500 font-sans">
          {displayCategory}
        </span>
      </div>

      {/* Image */}
      {story.imageUrl && (
        <div className="mb-4 overflow-hidden border border-border/40">
          <img
            src={story.imageUrl}
            alt={story.headline}
            className="w-full h-auto object-cover max-h-[300px]"
          />
        </div>
      )}

      {/* Headline */}
      <h2 className="text-xl md:text-2xl font-bold text-foreground mb-3 leading-tight font-serif">
        {storyHref ? (
          <a
            href={storyHref}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-500 transition-colors no-underline"
          >
            {story.headline}
          </a>
        ) : (
          <span>{story.headline}</span>
        )}
      </h2>

      {/* Content Body */}
      <div className="text-muted-foreground text-base leading-relaxed mb-5 font-serif">
        {introText && (
          <p className="mb-3 whitespace-pre-wrap">
            <NewsletterInlineText text={introText} />
          </p>
        )}

        {bulletPoints.length > 0 && (
          <ul className="list-none pl-0 space-y-2">
            {bulletPoints.map((point, i) => (
              <li key={i} className="flex items-start">
                <span className="mr-2 text-blue-500 font-bold">•</span>
                <span>
                  <NewsletterInlineText text={point} />
                </span>
              </li>
            ))}
          </ul>
        )}
        
        {bulletPoints.length === 0 && !introText && story.summary}
      </div>

      {/* Read More Link/Button */}
      <div>
        {storyHref ? (
          <a
            href={storyHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center border border-sky-700 bg-[#0ea5e9] px-5 py-2.5 font-sans text-sm font-bold text-white no-underline transition-all hover:bg-[#0284c7]"
          >
            Read Full Story <span className="ml-2">→</span>
          </a>
        ) : (
          <div className="inline-block border border-dashed border-border px-3 py-1.5 font-sans text-xs italic text-muted-foreground/50">
            Generate Full Articles to enable links
          </div>
        )}
      </div>
    </div>
  );
};

const NewsletterPreview: React.FC<NewsletterPreviewProps> = ({ data }) => {
  const copyrightYear = new Date().getFullYear();
  const leadParagraph =
    (data.intro || "").trim() ||
    deriveNewsletterLeadFromStories(data.stories);

  return (
    <div className="max-w-[650px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      {/* Simulation of the Email Wrapper */}
      <div className="overflow-hidden border border-border bg-card text-card-foreground">
        
        <div className="p-6 md:p-10">
          {/* Header */}
          <div className="mb-8 text-center border-b-2 border-foreground pb-8">
            <div className="flex flex-col items-center justify-center mb-4">
              <img
                src="https://storage.googleapis.com/msgsndr/VPl4AjuzzxeZqlljHIdI/media/694189977109a8d55b5f1658.png"
                alt="Kind Joe Logo"
                className="h-16 w-auto mb-4 object-contain"
              />
              <div className="text-2xl md:text-3xl font-black text-foreground tracking-[0.2em] uppercase font-sans">
                DAILY BRIEF
              </div>
            </div>
            <p className="text-sm text-muted-foreground font-sans font-medium uppercase tracking-widest">
              {data.date}
            </p>
          </div>

          {/* Lead / daily-brief teaser (saved intro, else auto from story summaries) */}
          {leadParagraph && (
            <div className="mb-10 border-l-4 border-blue-500 bg-blue-500/5 py-4 pl-5 font-serif text-lg italic text-foreground">
              {leadParagraph}
            </div>
          )}

          {/* Stories List */}
          <div className="space-y-2">
            {data.stories.map((story, index) => (
              <StoryBlock
                key={index}
                story={story}
                isLast={index === data.stories.length - 1}
              />
            ))}
          </div>

          <div className="mt-8 rounded-2xl bg-[#102A80] px-6 py-8 text-center sm:px-8 sm:py-9">
            <p className="mb-2 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">
              {KINDJOE_NEWSLETTER_END_PROMO.kicker}
            </p>
            <h3 className="mb-3 font-sans text-[22px] font-extrabold leading-tight text-white sm:text-[26px]">
              {KINDJOE_NEWSLETTER_END_PROMO.headline}
            </h3>
            <p className="mx-auto mb-6 max-w-md font-sans text-[14px] leading-relaxed text-white/90">
              {KINDJOE_NEWSLETTER_END_PROMO.body}
            </p>
            <a
              href={KINDJOE_NEWSLETTER_END_PROMO.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#DC2626] px-5 py-2.5 font-sans text-[13px] font-bold text-white no-underline transition-opacity hover:opacity-90"
            >
              <Coffee className="h-4 w-4" />
              {KINDJOE_NEWSLETTER_END_PROMO.buttonLabel}
            </a>
          </div>

          {/* Footer Section */}
          <div className="mt-12 pt-10 border-t border-border text-center">
            <p className="text-muted-foreground font-serif italic mb-8 text-lg">
              {data.signOff}
            </p>

            {/* YouTube Button */}
            <div className="mb-8">
              <a
                href="https://www.youtube.com/@thekindjoe-w4d"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-red-800 bg-[#FF0000] px-6 py-3 font-sans font-bold text-white no-underline transition-transform hover:-translate-y-0.5 hover:bg-red-700"
              >
                <Youtube className="w-5 h-5 fill-current" />
                Subscribe on YouTube
              </a>
            </div>

            {/* Social Links */}
            <div className="flex justify-center gap-4 mb-10">
              <a
                href="https://www.instagram.com/thekindjoe/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center border border-white/20 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 text-white transition-opacity hover:opacity-90"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://x.com/TheKindJoe"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center border border-border bg-foreground text-background transition-opacity hover:opacity-90"
              >
                <Twitter className="w-4 h-4 fill-current" />
              </a>
            </div>

            {/* Legal / Copyright */}
            <div className="border-t border-border/50 pt-8">
              <div className="max-w-xs mx-auto space-y-4">
                <p className="text-xs text-muted-foreground/60 font-sans leading-relaxed">
                  You are receiving this email because you are a valued member of KindJoe. 
                  We believe in the power of information to change the world.
                </p>
                <div className="text-[11px] text-muted-foreground/40 font-sans uppercase tracking-[0.2em] font-bold">
                  &copy; {copyrightYear} KindJoe.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Outside Labels */}
      <div className="mt-6 flex items-center justify-center gap-2 text-muted-foreground/40 font-sans text-[10px] uppercase tracking-widest font-bold">
        <FileText className="w-3 h-3" />
        Newsletter Preview
      </div>
    </div>
  );
};

export default NewsletterPreview;