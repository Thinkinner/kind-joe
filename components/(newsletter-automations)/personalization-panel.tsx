"use client";

import React from "react";
import { BrainCircuit, PenLine, Sparkles, Bot } from "lucide-react";

import { PersonalizationConfig } from "@/lib/(newsletter-automations)/types";
import { cn } from "@/lib/utils";

interface PersonalizationPanelProps {
  config: PersonalizationConfig;
  setConfig: React.Dispatch<React.SetStateAction<PersonalizationConfig>>;
}

const PersonalizationPanel: React.FC<PersonalizationPanelProps> = ({
  config,
  setConfig,
}) => {
  const handleChange = (field: keyof PersonalizationConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const fieldClass = cn(
    "w-full min-h-[110px] border border-neutral-200 bg-white p-3 text-sm transition-colors resize-y",
    "placeholder:text-muted-foreground/45",
    "focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30",
  );

  return (
    <section className="mb-10 border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-200 bg-neutral-50/80 px-4 py-4 sm:px-5">
        <h3 className="flex items-center gap-2 text-base font-semibold text-neutral-900">
          <Bot className="h-5 w-5 text-orange-600" aria-hidden />
          AI training &amp; persona
        </h3>
        <p className="mt-1 text-sm text-neutral-600">
          How the model should pick stories and match your voice.
        </p>
      </div>

      <div className="space-y-6 p-4 sm:p-5">
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-800">
            <BrainCircuit className="h-4 w-4 text-neutral-500" aria-hidden />
            Content strategy
          </label>
          <textarea
            value={config.contentStrategy}
            onChange={(e) => handleChange("contentStrategy", e.target.value)}
            placeholder="e.g. Prioritize AI and space; avoid gossip; lead with the strongest angle."
            className={fieldClass}
          />
        </div>

        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-800">
            <PenLine className="h-4 w-4 text-neutral-500" aria-hidden />
            Writing style &amp; voice
          </label>
          <textarea
            value={config.writingStyle}
            onChange={(e) => handleChange("writingStyle", e.target.value)}
            placeholder="e.g. Short sentences, witty but clear; bullets inside blurbs; no jargon."
            className={fieldClass}
          />
        </div>

        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-800">
            <Sparkles className="h-4 w-4 text-orange-500" aria-hidden />
            Example newsletter (optional)
          </label>
          <textarea
            value={config.exampleContent}
            onChange={(e) => handleChange("exampleContent", e.target.value)}
            placeholder="Paste a past issue so the model can mirror structure and tone."
            className={cn(fieldClass, "min-h-[160px] font-mono text-xs")}
          />
        </div>
      </div>
    </section>
  );
};

export default PersonalizationPanel;
