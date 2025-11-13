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
    el = <code className="px-1 py-0.5 rounded bg-gray-100">{el}</code>;
  }

  // highlight
  if (hasMark(run, "highlight")) {
    el = <span className="bg-yellow-200">{el}</span>;
  }

  // textStyle (e.g., color)
  const textStyle = getMark(run, "textStyle");
  if (textStyle?.attrs?.color) {
    el = <span style={{ color: textStyle.attrs.color }}>{el}</span>;
  }

  // typography marks
  if (hasMark(run, "bold") || hasMark(run, "strong")) el = <strong>{el}</strong>;
  if (hasMark(run, "italic") || hasMark(run, "em")) el = <em>{el}</em>;
  if (hasMark(run, "underline")) el = <u>{el}</u>;
  if (hasMark(run, "strike")) el = <s>{el}</s>;

  // link mark
  if (hasMark(run, "link")) {
    const href = getMarkAttr(run, "link", "href") ?? "#";
    const target = getMarkAttr(run, "link", "target") ?? "_blank";
    const rel = getMarkAttr(run, "link", "rel") ?? "noopener noreferrer";
    el = (
      <Link href={href} target={target} rel={rel} className="underline">
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

    // link node
    if (node.type === "link") {
      const href = node.attrs?.href ?? "#";
      const target = node.attrs?.target ?? "_blank";
      const rel = node.attrs?.rel ?? "noopener noreferrer";
      return (
        <Link key={i} href={href} target={target} rel={rel} className="underline">
          {renderInline(node.content)}
        </Link>
      );
    }

    // unknown inline container → recurse
    return <React.Fragment key={i}>{renderInline(node.content)}</React.Fragment>;
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
      ? "text-3xl font-bold mb-6"
      : level === 2
      ? "text-2xl font-semibold mb-5"
      : level === 3
      ? "text-xl font-semibold mb-4"
      : "text-lg font-semibold mb-4";

  const alignCls =
    align === "center"
      ? "text-center"
      : align === "right"
      ? "text-right"
      : align === "justify"
      ? "text-justify"
      : "";

  return React.createElement(tag, { className: `${base} ${alignCls}` }, children);
}

/* ------------------------- Lists ------------------------- */

function renderListItems(children: (JSONNode | JSONText)[]) {
  return children.map((c, i) => {
    const n = c as JSONNode;
    if (n.type === "listItem") {
      return (
        <li key={i} className="my-1">
          {n.content?.map((inner, j) => {
            const ni = inner as JSONNode;
            if (ni.type === "paragraph") {
              return (
                <p key={j} className="leading-7 my-0">
                  {renderInline(ni.content)}
                </p>
              );
            }
            return <div key={j}>{renderBlock(ni, `${i}-${j}`)}</div>;
          })}
        </li>
      );
    }
    // Fallback
    return (
      <li key={i} className="my-1">
        {renderInline((c as JSONNode).content)}
      </li>
    );
  });
}

/* ------------------------- Tables ------------------------- */

function renderTable(node: JSONNode, key: React.Key) {
  return (
    <div key={key} className="overflow-x-auto mb-6">
      <table className="w-full border-collapse">
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
      const align = node.attrs?.textAlign as "left" | "center" | "right" | "justify" | undefined;
      const alignCls =
        align === "center"
          ? "text-center"
          : align === "right"
          ? "text-right"
          : align === "justify"
          ? "text-justify"
          : "";
      return (
        <p key={key} className={`leading-7 text-lg mb-6 ${alignCls}`}>
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
        <blockquote key={key} className="border-l-4 pl-4 italic text-gray-700 mb-6">
          {(node.content ?? []).map((c, i) => {
            const n = c as JSONNode;
            return n.type === "paragraph" ? (
              <p key={i} className="leading-7 my-0">
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
      return <img key={key} src={src} alt={alt ?? ""} className="rounded-xl max-w-full mb-6" />;
    }

    // Generic list
    case "list": {
      const ordered = !!node.attrs?.ordered;
      const Tag = ordered ? "ol" : "ul";
      const cls = ordered ? "list-decimal" : "list-disc";
      return (
        <Tag key={key} className={`ml-6 mb-6 ${cls} [&_ol]:list-decimal [&_ul]:list-disc`}>
          {renderListItems(node.content ?? [])}
        </Tag>
      );
    }

    // TipTap lists
    case "bulletList":
      return (
        <ul key={key} className="ml-6 mb-6 list-disc">
          {renderListItems(node.content ?? [])}
        </ul>
      );

    case "orderedList":
      return (
        <ol key={key} className="ml-6 mb-6 list-decimal">
          {renderListItems(node.content ?? [])}
        </ol>
      );

    // Task list
    case "taskList": {
      return (
        <ul key={key} className="ml-6 mb-6 space-y-2">
          {(node.content ?? []).map((c, i) => {
            const n = c as JSONNode;
            if (n.type !== "taskItem") return null;
            const checked = !!n.attrs?.checked;
            return (
              <li key={i} className="flex items-start gap-2">
                <input type="checkbox" checked={checked} readOnly className="mt-1" />
                <div>{renderInline(n.content)}</div>
              </li>
            );
          })}
        </ul>
      );
    }

    // Embeds
    case "embed": {
      const { src, title } = node.attrs ?? {};
      if (!src) return null;
      return (
        <div key={key} className="aspect-video mb-6">
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
          className="rounded-xl bg-gray-900 text-gray-100 p-4 overflow-x-auto mb-6"
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
        <div key={key} className="mb-6">
          {renderInline(node.content)}
        </div>
      );
  }
}

/* ------------------------- Exported component ------------------------- */

export default function ArticleContent({ value }: { value: JSONDoc | null | undefined }) {
  if (!value || value.type !== "doc") return null;

  return (
    <article className="max-w-none">
      {(value.content ?? []).map((node, i) => renderBlock(node as JSONNode, i))}
    </article>
  );
}
