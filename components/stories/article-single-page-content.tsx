"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { marked } from "marked";
import { normalizeArticleMarkdown } from "@/lib/content/normalize-article-markdown";
import {
  embedYouTubeLinksInHtml,
  getYouTubeId,
  youtubeEmbedUrl,
} from "@/lib/media/youtube";

type Mark = { type: string; attrs?: Record<string, unknown> };
type JSONText = { type: "text"; text: string; marks?: Mark[] };
type JSONNode = {
  type: string;
  attrs?: Record<string, unknown>;
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

  if (hasMark(run, "code")) {
    el = <code className="px-1 py-0.5 rounded bg-gray-100 text-[0.9em]">{el}</code>;
  }

  if (hasMark(run, "highlight")) {
    el = <span className="bg-yellow-200">{el}</span>;
  }

  const textStyle = getMark(run, "textStyle");
  if (textStyle?.attrs?.color) {
    el = <span style={{ color: textStyle.attrs.color }}>{el}</span>;
  }

  if (hasMark(run, "bold") || hasMark(run, "strong")) el = <strong>{el}</strong>;
  if (hasMark(run, "italic") || hasMark(run, "em")) el = <em>{el}</em>;
  if (hasMark(run, "underline")) el = <u>{el}</u>;
  if (hasMark(run, "strike")) el = <s>{el}</s>;

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

    if (node.type === "hardBreak") {
      return <br key={i} />;
    }

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

    return <React.Fragment key={i}>{renderInline(node.content)}</React.Fragment>;
  });
}

function plainTextFromInline(nodes?: (JSONNode | JSONText)[]): string {
  if (!nodes?.length) return "";
  return nodes
    .map((n) => {
      if ((n as JSONText).type === "text") {
        return (n as JSONText).text ?? "";
      }
      return plainTextFromInline((n as JSONNode).content);
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractDenseOrderedItems(text: string): string[] | null {
  const normalized = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!/\b1\.\s+/.test(normalized) || !/\b2\.\s+/.test(normalized)) return null;

  const matches = Array.from(normalized.matchAll(/(\d+)\.\s+/g));
  if (matches.length < 2) return null;
  if (Number(matches[0][1]) !== 1) return null;

  const items: string[] = [];
  for (let i = 0; i < matches.length; i += 1) {
    const current = matches[i];
    const next = matches[i + 1];
    const num = Number(current[1]);
    if (Number.isNaN(num) || num !== i + 1) return null;
    const start = (current.index ?? 0) + current[0].length;
    const end = next?.index ?? normalized.length;
    const item = normalized.slice(start, end).trim();
    if (!item) return null;
    items.push(item);
  }

  return items.length >= 2 ? items : null;
}

/* ------------------------- Utilities ------------------------- */

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
      ? `text-[1.85rem] font-bold tracking-tight uppercase mt-16 mb-5`
      : level === 2
      ? `text-[1.35rem] font-bold tracking-tight uppercase mt-14 mb-4`
      : level === 3
      ? `text-[1.15rem] font-bold tracking-tight uppercase mt-10 mb-3`
      : `text-[1rem] font-bold tracking-tight uppercase mt-8 mb-2`;
  const alignCls =
    align === "center" ? "text-center" : align === "right" ? "text-right" : align === "justify" ? "text-justify" : "text-left";

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
      const paragraphText = (node.content ?? [])
        .filter((child) => (child as JSONText).type === "text")
        .map((child) => (child as JSONText).text ?? "")
        .join("")
        .trim();
      const paragraphVideoId =
        /^https?:\/\/\S+$/i.test(paragraphText) || /<iframe\b/i.test(paragraphText)
          ? getYouTubeId(paragraphText)
          : null;
      if (paragraphVideoId) {
        return (
          <div key={key} className="my-4 aspect-video not-prose">
            <iframe
              src={youtubeEmbedUrl(paragraphVideoId)}
              title="YouTube video"
              className="h-full w-full rounded-xl border"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        );
      }

      if (isEmptyParagraph(node)) {
        return <div key={key} className="h-2" />;
      }
      const denseItems = extractDenseOrderedItems(plainTextFromInline(node.content));
      if (denseItems) {
        return (
          <ol key={key} className="my-4 ml-6 list-decimal space-y-2">
            {denseItems.map((item, idx) => (
              <li key={idx} className="leading-relaxed">{item}</li>
            ))}
          </ol>
        );
      }

      const align = node.attrs?.textAlign as "left" | "center" | "right" | "justify" | undefined;
      const alignCls =
        align === "center" ? "text-center" : align === "right" ? "text-right" : align === "justify" ? "text-justify" : "text-left";

      return (
        <p key={key} className={`${alignCls} leading-[1.75] my-6`}>
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
        <blockquote key={key} className="my-7 border-l-2 border-rose-300 pl-5 text-neutral-700">
          {(node.content ?? []).map((c, i) => {
            const n = c as JSONNode;
            return n.type === "paragraph" ? (
              <p key={i} className="italic leading-[1.75]">{renderInline(n.content)}</p>
            ) : (
              <div key={i}>{renderBlock(n, i)}</div>
            );
          })}
        </blockquote>
      );

    case "image": {
      const { src, alt } = node.attrs ?? {};
      if (!src || typeof src !== "string") return null;
      const imageVideoId = getYouTubeId(src);
      if (imageVideoId) {
        return (
          <div key={key} className="my-6 aspect-video not-prose">
            <iframe
              src={youtubeEmbedUrl(imageVideoId)}
              title={typeof alt === "string" && alt ? alt : "YouTube video"}
              className="h-full w-full rounded-xl border"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        );
      }
      return <img key={key} src={src} alt={typeof alt === "string" ? alt : ""} className="rounded-xl my-6 max-w-full mx-auto" />;
    }

    case "list": {
      const ordered = !!node.attrs?.ordered;
      const Tag = ordered ? "ol" : "ul";
      const cls = ordered ? "list-decimal" : "list-disc";
      return (
        <Tag key={key} className={`ml-6 ${cls} [&_ol]:list-decimal [&_ul]:list-disc space-y-2 my-6`}>
          {renderListItems(node.content ?? [])}
        </Tag>
      );
    }
    case "bulletList":
      return (
        <ul key={key} className="ml-6 list-disc space-y-2 my-6">
          {renderListItems(node.content ?? [])}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={key} className="ml-6 list-decimal space-y-2 my-6">
          {renderListItems(node.content ?? [])}
        </ol>
      );

    case "taskList": {
      return (
        <ul key={key} className="ml-6 space-y-2 my-6">
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

    case "embed": {
      const { src, title } = node.attrs ?? {};
      if (!src) return null;
      return (
        <div key={key} className="my-6 aspect-video not-prose">
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
        .map((c) => {
          if ((c as JSONText).type === "text") {
            return (c as JSONText).text ?? "";
          }
          return "";
        })
        .join("");
      return (
        <pre key={key} className="my-6 rounded-xl bg-slate-900 text-slate-50 text-sm p-4 overflow-x-auto not-prose">
          <code>{codeText}</code>
        </pre>
      );
    }

    case "hr":
    case "horizontalRule":
      return <Separator key={key} className="my-10" />;

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

type ArticleContentProps = {
  value?: JSONDoc | null;
  markdown?: string | null;
  /** @deprecated Use markdown + value fallback; kept for callers still passing it. */
  preferLegacyDoc?: boolean;
};

export default function ArticleContent({
  value,
  markdown,
  preferLegacyDoc = false,
}: ArticleContentProps) {
  const sansAll = "font-[var(--font-sans),ui-sans-serif,system-ui,sans-serif]";

  const trimmedMarkdown = markdown?.trim() ?? "";

  const htmlContent = useMemo(() => {
    if (!trimmedMarkdown) return null;
    return embedYouTubeLinksInHtml(marked(normalizeArticleMarkdown(trimmedMarkdown)) as string);
  }, [trimmedMarkdown]);

  const useLegacyDoc =
    preferLegacyDoc && !trimmedMarkdown && Boolean(value?.content?.length);

  return (
    <article className={`article-content ${sansAll}`}>
      <div className="article-flow max-w-none">
        {htmlContent ? (
          <div className="article-flow-content" dangerouslySetInnerHTML={{ __html: htmlContent }} />
        ) : useLegacyDoc && value?.content ? (
          value.content.map((node, i) => renderBlock(node, i))
        ) : value?.content ? (
          value.content.map((node, i) => renderBlock(node, i))
        ) : null}
      </div>
    </article>
  );
}
