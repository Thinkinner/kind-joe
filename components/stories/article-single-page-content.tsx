"use client";

import React from "react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";

type Mark = { type: string; attrs?: any };
type JSONText = { type: "text"; text: string; marks?: Mark[] };
type JSONNode = {
  type: string;
  attrs?: Record<string, any>;
  content?: (JSONNode | JSONText)[];
  text?: string;
  marks?: Mark[];
};
type JSONDoc = { type: "doc"; content?: JSONNode[] };

/* ------------------------- Mark helpers ------------------------- */

function hasMark(run: JSONText, t: string) {
  return run.marks?.some((m) => m.type === t);
}
function getMark(run: JSONText, t: string) {
  return run.marks?.find((m) => m.type === t);
}
function getMarkAttr(run: JSONText, t: string, key: string) {
  return getMark(run, t)?.attrs?.[key];
}

function renderTextRun(run: JSONText): React.ReactNode {
  let el: React.ReactNode = run.text;

  // inline code first
  if (hasMark(run, "code")) {
    el = <code className="px-1 py-0.5 rounded bg-gray-100 text-[0.9em]">{el}</code>;
  }

  // highlight
  if (hasMark(run, "highlight")) {
    el = <span className="bg-yellow-200">{el}</span>;
  }

  // textStyle (e.g., color) - TipTap TextStyle extension
  const textStyle = getMark(run, "textStyle");
  if (textStyle?.attrs?.color) {
    el = <span style={{ color: textStyle.attrs.color }}>{el}</span>;
  }

  // typography marks (support aliases)
  if (hasMark(run, "bold") || hasMark(run, "strong")) el = <strong>{el}</strong>;
  if (hasMark(run, "italic") || hasMark(run, "em")) el = <em>{el}</em>;
  if (hasMark(run, "underline")) el = <u>{el}</u>;
  if (hasMark(run, "strike")) el = <s>{el}</s>;

  // link as MARK (TipTap default)
  if (hasMark(run, "link")) {
    const href = getMarkAttr(run, "link", "href") ?? "#";
    const target = getMarkAttr(run, "link", "target") ?? "_blank";
    const rel = getMarkAttr(run, "link", "rel") ?? "noopener noreferrer";
    el = (
      <Link href={href} target={target} rel={rel} className="underline underline-offset-4 decoration-slate-400">
        {el}
      </Link>
    );
  }

  return el;
}

/* ------------------------- Inline renderer ------------------------- */

function renderInline(nodes?: (JSONNode | JSONText)[]): React.ReactNode {
  if (!nodes) return null;
  return nodes.map((n, i) => {
    if ((n as JSONText).type === "text") {
      return <React.Fragment key={i}>{renderTextRun(n as JSONText)}</React.Fragment>;
    }
    const node = n as JSONNode;

    // explicit hard break
    if (node.type === "hardBreak") {
      return <br key={i} />;
    }

    // link as NODE (less common, but support it)
    if (node.type === "link") {
      const href = node.attrs?.href ?? "#";
      const target = node.attrs?.target ?? "_blank";
      const rel = node.attrs?.rel ?? "noopener noreferrer";
      return (
        <Link
          key={i}
          href={href}
          target={target}
          rel={rel}
          className="underline underline-offset-4 decoration-slate-400"
        >
          {renderInline(node.content)}
        </Link>
      );
    }

    // unknown inline container → recurse
    return <React.Fragment key={i}>{renderInline(node.content)}</React.Fragment>;
  });
}

/* ------------------------- CTA cards ------------------------- */

// Reusable in-article sponsor CTA cards. Authors drop [cta:<id>] on its own
// line in the admin's markdown editor; it renders as a styled card here.
// Add new entries as needed — keep the id short and URL-safe.
const CTAS: Record<string, { label: string; title: string; body: React.ReactNode }> = {
  "back-taxes": {
    label: "Sponsored",
    title: "Behind on back taxes?",
    body: (
      <>
        Get help from someone local. Text <strong>HELP</strong> to{" "}
        <strong>(805) 719-7630</strong> and we&rsquo;ll set up a time to talk
        that works for you.
      </>
    ),
  },
};

function renderCta(id: string, key: React.Key) {
  const cta = CTAS[id];
  if (!cta) return null;
  return (
    <div key={key} className="not-prose my-6 rounded-xl bg-slate-900 p-6 text-white">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-300">
        {cta.label}
      </div>
      <div className="mt-2 text-2xl font-bold">{cta.title}</div>
      <p className="mt-2 leading-relaxed text-slate-200">{cta.body}</p>
    </div>
  );
}

// Detect a paragraph that is only a [cta:<id>] shortcode.
function paragraphCtaId(node: JSONNode): string | null {
  const text = (node.content ?? [])
    .filter((c) => (c as JSONText).type === "text")
    .map((r) => (r as JSONText).text ?? "")
    .join("")
    .trim();
  const m = text.match(/^\[cta:([\w-]+)\]$/i);
  return m ? m[1].toLowerCase() : null;
}

/* ------------------------- Utilities ------------------------- */

// Extract a YouTube video ID from common URL shapes. Returns null when the
// URL isn't a recognizable YouTube video link. Only the ID is trusted — the
// embed URL is always rebuilt from it, never taken from pasted HTML.
function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
    const idPattern = /^[\w-]{11}$/;
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id && idPattern.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (u.pathname === "/watch") {
        const id = u.searchParams.get("v");
        return id && idPattern.test(id) ? id : null;
      }
      const m = u.pathname.match(/^\/(embed|shorts|live)\/([\w-]{11})/);
      if (m) return m[2];
    }
  } catch {
    // not a URL
  }
  return null;
}

function renderYouTubeEmbed(videoId: string, key: React.Key) {
  return (
    <div key={key} className="my-4 aspect-video not-prose">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title="YouTube video"
        className="w-full h-full rounded-xl border"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

// If a paragraph contains nothing but a YouTube URL (plain text or a link),
// or a raw pasted <iframe> snippet, return the video ID so it renders as a
// player instead of a dead link/text blob.
function paragraphYouTubeId(node: JSONNode): string | null {
  const runs = ((node.content ?? []).filter(
    (c) => (c as JSONText).type === "text"
  ) as JSONText[]).filter((r) => r.text && r.text.trim().length > 0);
  if (runs.length === 0) return null;
  const text = runs.map((r) => r.text ?? "").join("").trim();
  if (!text) return null;
  // raw pasted iframe snippet → pull the src out, then the video id
  const iframeSrc = text.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i)?.[1];
  if (iframeSrc) return getYouTubeId(iframeSrc);
  // bare URL paragraph (TipTap may store it with a link mark — the text still matches)
  if (/^https?:\/\/\S+$/i.test(text)) return getYouTubeId(text);
  return null;
}

// Detect if a paragraph is effectively "empty"
function isEmptyParagraph(node: JSONNode) {
  if (!node.content || node.content.length === 0) return true;
  return node.content.every((c) => {
    const t = c as JSONText;
    if (t.type === "text") {
      return !t.text || t.text.trim().length === 0;
    }
    const n = c as JSONNode;
    return !n.content || n.content.length === 0;
  });
}

/* ------------------------- Headings ------------------------- */

function Heading({
  level,
  align,
  children,
}: {
  level: number;
  align?: "left" | "center" | "right" | "justify";
  children: React.ReactNode;
}) {
  const tag = (`h${Math.min(Math.max(level, 1), 6)}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6");
  const base =
    level === 1
      ? "text-3xl font-semibold tracking-tight"
      : level === 2
      ? "text-2xl font-semibold tracking-tight"
      : level === 3
      ? "text-xl font-semibold tracking-tight"
      : "text-lg font-semibold";
  const alignCls =
    align === "center"
      ? "text-center"
      : align === "right"
      ? "text-right"
      : align === "justify"
      ? "text-justify"
      : "text-left";

  return React.createElement(tag, { className: `${base} ${alignCls}` }, children);
}

/* ------------------------- Lists ------------------------- */

function renderListItems(children: (JSONNode | JSONText)[]) {
  return children.map((c, i) => {
    const n = c as JSONNode;
    if (n.type === "listItem") {
      return (
        <li key={i} className="leading-relaxed">
          {n.content?.map((inner, j) => {
            const ni = inner as JSONNode;
            if (ni.type === "paragraph") {
              return <span key={j}>{renderInline(ni.content)}</span>;
            }
            return <div key={j}>{renderBlock(ni, `${i}-${j}`)}</div>;
          })}
        </li>
      );
    }
    // Fallback if editor gave raw inline content
    return (
      <li key={i} className="leading-relaxed">
        {renderInline((c as JSONNode).content)}
      </li>
    );
  });
}

/* ------------------------- Tables ------------------------- */

function renderTable(node: JSONNode, key: React.Key) {
  return (
    <div key={key} className="my-4 overflow-x-auto not-prose">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {(node.content ?? []).map((row, i) => {
            const r = row as JSONNode;
            if (r.type !== "tableRow") return null;
            return (
              <tr key={i} className="border-b last:border-0">
                {(r.content ?? []).map((cell, j) => {
                  const c = cell as JSONNode;
                  const common = { className: "p-2 align-top border-r last:border-0" };
                  if (c.type === "tableHeader") {
                    return (
                      <th key={j} {...common}>
                        {renderInline(c.content)}
                      </th>
                    );
                  }
                  if (c.type === "tableCell") {
                    return (
                      <td key={j} {...common}>
                        {renderInline(c.content)}
                      </td>
                    );
                  }
                  return (
                    <td key={j} {...common}>
                      {renderInline(c.content)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------- Main block renderer ------------------------- */

function renderBlock(node: JSONNode, key: React.Key): React.ReactNode {
  switch (node.type) {
    case "paragraph": {
      // [cta:<id>] shortcode → sponsor card
      const ctaId = paragraphCtaId(node);
      if (ctaId) return renderCta(ctaId, key);

      // A paragraph that is just a YouTube link (or pasted iframe snippet)
      // becomes an embedded player — this is how videos get into articles
      // from the admin's markdown editor.
      const ytId = paragraphYouTubeId(node);
      if (ytId) return renderYouTubeEmbed(ytId, key);

      if (isEmptyParagraph(node)) {
        // collapse empty paragraphs so your content doesn’t get weird big gaps
        return <div key={key} className="h-2" />;
      }

      const align = node.attrs?.textAlign as "left" | "center" | "right" | "justify" | undefined;
      const alignCls =
        align === "center"
          ? "text-center"
          : align === "right"
          ? "text-right"
          : align === "justify"
          ? "text-justify"
          : "text-left";

      return (
        <p key={key} className={`leading-relaxed ${alignCls}`}>
          {renderInline(node.content)}
        </p>
      );
    }

    case "heading": {
      const level = node.attrs?.level ?? 2;
      const align = node.attrs?.textAlign as "left" | "center" | "right" | "justify" | undefined;
      return (
        <Heading key={key} level={level} align={align}>
          {renderInline(node.content)}
        </Heading>
      );
    }

    case "blockquote":
    case "quote":
      return (
        <blockquote key={key} className="border-l-4 pl-4 italic text-slate-700">
          {(node.content ?? []).map((c, i) => {
            const n = c as JSONNode;
            return n.type === "paragraph" ? (
              <p key={i} className="leading-relaxed">
                {renderInline(n.content)}
              </p>
            ) : (
              <div key={i}>{renderBlock(n, i)}</div>
            );
          })}
        </blockquote>
      );

    case "image": {
      const { src, alt } = node.attrs ?? {};
      if (!src) return null;
      // eslint-disable-next-line @next/next/no-img-element
      return <img key={key} src={src} alt={alt ?? ""} className="rounded-xl my-4 max-w-full" />;
    }

    // Generic list (your schema)
    case "list": {
      const ordered = !!node.attrs?.ordered;
      const Tag = ordered ? "ol" : "ul";
      const cls = ordered ? "list-decimal" : "list-disc";
      return (
        <Tag key={key} className={`ml-6 ${cls} [&_ol]:list-decimal [&_ul]:list-disc space-y-1`}>
          {renderListItems(node.content ?? [])}
        </Tag>
      );
    }
    // TipTap lists
    case "bulletList":
      return (
        <ul key={key} className="ml-6 list-disc space-y-1">
          {renderListItems(node.content ?? [])}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={key} className="ml-6 list-decimal space-y-1">
          {renderListItems(node.content ?? [])}
        </ol>
      );

    // TipTap task list
    case "taskList": {
      return (
        <ul key={key} className="ml-6 space-y-2">
          {(node.content ?? []).map((c, i) => {
            const n = c as JSONNode;
            if (n.type !== "taskItem") return null;
            const checked = !!n.attrs?.checked;
            return (
              <li key={i} className="flex items-start gap-2 leading-relaxed">
                <input type="checkbox" checked={checked} readOnly className="mt-1" />
                <div>{renderInline(n.content)}</div>
              </li>
            );
          })}
        </ul>
      );
    }

    // Embeds (youtube/iframe-like)
    case "embed": {
      const { src, title } = node.attrs ?? {};
      if (!src) return null;
      return (
        <div key={key} className="my-4 aspect-video not-prose">
          <iframe
            src={src}
            title={title || "embed"}
            className="w-full h-full rounded-xl border"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    case "table":
      return renderTable(node, key);

    case "codeBlock":
    case "code": {
      const codeText = (node.content ?? [])
        .map((c: any) => (c.type === "text" ? c.text : ""))
        .join("");
      return (
        <pre
          key={key}
          className="my-4 rounded-xl bg-slate-900 text-slate-50 text-sm p-4 overflow-x-auto not-prose"
        >
          <code>{codeText}</code>
        </pre>
      );
    }

    case "hr":
    case "horizontalRule":
      return <Separator key={key} className="my-8" />;

    case "doc":
      return (
        <React.Fragment key={key}>
          {(node.content ?? []).map((n, i) => renderBlock(n as JSONNode, i))}
        </React.Fragment>
      );

    default:
      return (
        <div key={key} className="leading-relaxed">
          {renderInline(node.content)}
        </div>
      );
  }
}

/* ------------------------- Exported component ------------------------- */

export default function ArticleContent({ value }: { value: JSONDoc | null | undefined }) {
  if (!value || value.type !== "doc") return null;

  return (
    <article
      className="
        tiptap
        prose prose-slate prose-lg
        leading-relaxed
        prose-headings:font-semibold
        prose-headings:tracking-tight
        prose-p:leading-relaxed
        prose-li:leading-relaxed
        prose-ul:my-3 prose-ol:my-3
        prose-img:rounded-xl
        prose-p:my-2
      "
    >
      {(value.content ?? []).map((node, i) => renderBlock(node as JSONNode, i))}
    </article>
  );
}
