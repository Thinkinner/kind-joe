"use client";

import React from "react";
import { BrainCircuit, PenLine, Sparkles, Bot } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    "w-full min-h-[120px] resize-y rounded-xl border border-transparent bg-slate-50/80 p-3 text-sm transition-colors",
    "placeholder:font-mono placeholder:italic placeholder:text-muted-foreground/35",
    "focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200/50",
  );
  const chipClass =
    "rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] text-indigo-700";

  return (
    <section className="mb-10 space-y-4">
      <div className="rounded-xl border border-slate-200/70 bg-white px-4 py-4 shadow-[0_10px_30px_-20px_rgb(15_23_42/0.18)] sm:px-5">
        <h3 className="flex items-center gap-2 text-base font-semibold tracking-tight text-neutral-900">
          <span className="inline-flex rounded-full bg-indigo-100 p-1.5">
            <Bot className="h-5 w-5 text-indigo-600" aria-hidden />
          </span>
          AI training &amp; persona
        </h3>
        <p className="mt-1 text-sm text-neutral-600">
          How the model should pick stories and match your voice.
        </p>
      </div>

      <div className="grid gap-4">
        <Card className="gap-0 p-5">
          <label className="mb-2 flex items-center gap-2 text-sm font-medium tracking-tight text-neutral-800">
            <span className="inline-flex rounded-full bg-violet-100 p-1">
              <BrainCircuit className="h-4 w-4 text-violet-600" aria-hidden />
            </span>
            Content strategy
          </label>
          <textarea
            value={config.contentStrategy}
            onChange={(e) => handleChange("contentStrategy", e.target.value)}
            placeholder="e.g. Prioritize AI and space; avoid gossip; lead with the strongest angle."
            className={fieldClass}
          />
          <div className="mt-2 flex items-center gap-2">
            <Badge className={chipClass}>AI Suggestion</Badge>
            <span className="text-xs text-slate-500">
              {config.contentStrategy.length} chars
            </span>
          </div>
        </Card>

        <Card className="gap-0 p-5">
          <label className="mb-2 flex items-center gap-2 text-sm font-medium tracking-tight text-neutral-800">
            <span className="inline-flex rounded-full bg-indigo-100 p-1">
              <PenLine className="h-4 w-4 text-indigo-600" aria-hidden />
            </span>
            Writing style &amp; voice
          </label>
          <textarea
            value={config.writingStyle}
            onChange={(e) => handleChange("writingStyle", e.target.value)}
            placeholder="e.g. Short sentences, witty but clear; bullets inside blurbs; no jargon."
            className={fieldClass}
          />
          <div className="mt-2 flex items-center gap-2">
            <Badge className={chipClass}>AI Suggestion</Badge>
            <span className="text-xs text-slate-500">
              {config.writingStyle.length} chars
            </span>
          </div>
        </Card>

        <Card className="gap-0 p-5">
          <label className="mb-2 flex items-center gap-2 text-sm font-medium tracking-tight text-neutral-800">
            <span className="inline-flex rounded-full bg-rose-100 p-1">
              <Sparkles className="h-4 w-4 text-rose-600" aria-hidden />
            </span>
            Example newsletter (optional)
          </label>
          <textarea
            value={config.exampleContent}
            onChange={(e) => handleChange("exampleContent", e.target.value)}
            placeholder="Paste a past issue so the model can mirror structure and tone."
            className={cn(fieldClass, "min-h-[180px] text-xs")}
          />
          <div className="mt-2 flex items-center gap-2">
            <Badge className={chipClass}>Reference style</Badge>
            <span className="text-xs text-slate-500">
              {config.exampleContent.length} chars
            </span>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default PersonalizationPanel;
