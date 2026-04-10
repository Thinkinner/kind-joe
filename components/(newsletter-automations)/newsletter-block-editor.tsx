// components/editor/block-editor.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Blockquote from "@tiptap/extension-blockquote";
import HardBreak from "@tiptap/extension-hard-break";
import { Extension } from "@tiptap/core";
import { Plugin } from "prosemirror-state";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Heading1,
  Heading2,
  Heading3,
  Type,
  Quote,
  Image as ImageIcon,
  Code,
  Minus,
  Bot,
  Loader2,
} from "lucide-react";
import type { JSONContent } from "@tiptap/core";

type TiptapDoc = { type: "doc"; content?: any[] };

export type BlockEditorProps = {
  value?: TiptapDoc | string;
  onChange?: (json: TiptapDoc, html: string) => void;
  editable?: boolean;
  className?: string;
};

// --- Paste Normalization ---
function normalizePastedHTML(html: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    doc.body.querySelectorAll<HTMLElement>("*").forEach((el) => {
      el.removeAttribute("style");
      el.removeAttribute("class");
      if (el.getAttribute("role") === "heading") {
        const p = doc.createElement("p");
        p.textContent = el.textContent || "";
        el.replaceWith(p);
      }
      el.removeAttribute("role");
      el.removeAttribute("aria-level");
    });

    let keptFirstHeading = false;
    doc.body.querySelectorAll("h1, h2, h3").forEach((h) => {
      if (!keptFirstHeading) {
        keptFirstHeading = true;
        return;
      }
      const p = doc.createElement("p");
      p.textContent = h.textContent || "";
      h.replaceWith(p);
    });

    if (!doc.body.innerHTML.trim()) {
      const parsed = new DOMParser().parseFromString(html, "text/html");
      const text = parsed.documentElement?.textContent || "";
      if (text) {
        const p = doc.createElement("p");
        p.textContent = text;
        doc.body.appendChild(p);
      }
    }

    return doc.body.innerHTML;
  } catch {
    return html;
  }
}

const NormalizePaste = Extension.create({
  name: "normalizePaste",
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        props: {
          handlePaste(_view, event: ClipboardEvent) {
            const html = event.clipboardData?.getData("text/html");
            if (!html) return false;
            const normalized = normalizePastedHTML(html);
            event.preventDefault();
            editor.chain().focus().insertContent(normalized).run();
            return true;
          },
        },
      }),
    ];
  },
});

export default function BlockEditor({
  value,
  onChange,
  editable = true,
  className,
}: BlockEditorProps) {
  const [status, setStatus] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Auto-clear status messages
  useEffect(() => {
    if (status) {
      const t = setTimeout(() => setStatus(""), 2500);
      return () => clearTimeout(t);
    }
  }, [status]);

  const initialContent = useMemo(() => {
    if (typeof value === "string") {
      const html = value.trim();
      return html || "<p></p>";
    }
    if (value && typeof value === "object" && (value as any).type === "doc") {
      return value as TiptapDoc;
    }
    return { type: "doc", content: [{ type: "paragraph" }] } as TiptapDoc;
  }, [value]);

  const editor = useEditor({
    extensions: [
      NormalizePaste,
      HardBreak.configure({ HTMLAttributes: { class: "hard-break" } }),
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { HTMLAttributes: {} },
        orderedList: { HTMLAttributes: {} },
        hardBreak: false,
      }),
      Blockquote,
      Placeholder.configure({
        placeholder: "Write your story here…",
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class:
            "text-blue-500 underline underline-offset-4 hover:text-blue-600 transition-colors cursor-pointer",
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
    ],

    content: initialContent,
    editable,

    onCreate: ({ editor }) => {
      onChange?.(editor.getJSON() as TiptapDoc, editor.getHTML());
    },

    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON() as TiptapDoc, editor.getHTML());
    },

    immediatelyRender: false,

    editorProps: {
      attributes: {
        // 🔥 FIX: We removed Tailwind's 'prose' so it stops fighting your CSS.
        // 🔥 FIX: We added YOUR custom 'tiptap-article' class right here!
        class:
          "tiptap-article focus:outline-none min-h-[400px] w-full px-6 py-8 outline-none border-none",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;

    if (typeof value === "string") {
      const nextHTML = value || "<p></p>";
      const currentHTML = editor.getHTML();

      if (currentHTML !== nextHTML) {
        editor.commands.setContent(nextHTML, { emitUpdate: false });
        onChange?.(editor.getJSON() as TiptapDoc, editor.getHTML());
      }
      return;
    }

    if (value && (value as any).type === "doc") {
      const nextJSON = value as JSONContent;
      const nowJSON = editor.getJSON();

      if (JSON.stringify(nowJSON) !== JSON.stringify(nextJSON)) {
        editor.commands.setContent(nextJSON, { emitUpdate: false });
        onChange?.(editor.getJSON() as TiptapDoc, editor.getHTML());
      }
    }
  }, [editor, value]);

  if (!editor) return null;

  const run = (label: string, fn: () => void) => {
    fn();
    setStatus(label);
  };

  const setLink = () => {
    const url = window.prompt("Enter the URL:");
    if (url === null) return;
    if (url === "") {
      run("Link removed", () => editor.chain().focus().unsetLink().run());
    } else {
      run("Link added", () =>
        editor.chain().focus().setLink({ href: url }).run(),
      );
    }
  };

  const insertImage = () => {
    const url = window.prompt("Image URL:");
    if (!url) return;
    run("Image inserted", () =>
      editor.chain().focus().setImage({ src: url }).run(),
    );
  };

  const toggleQuote = () => {
    run(
      editor.isActive("blockquote") ? "Quote removed" : "Quote toggled",
      () => {
        const ch = editor.chain().focus();
        if (editor.isActive("blockquote")) {
          ch.toggleBlockquote().run();
          return;
        }
        if (!editor.can().chain().focus().toggleBlockquote().run()) {
          ch.liftListItem("listItem").toggleBlockquote().run();
        } else {
          ch.toggleBlockquote().run();
        }
      },
    );
  };

  async function aiFormat() {
    if (!editor || isAiLoading) return;
    setIsAiLoading(true);
    setStatus("AI is formatting...");
    try {
      const raw = editor.getText();
      const res = await fetch("/api/admin/ai/block-editor-helper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: raw }),
      });
      const data = await res.json();
      if (data.html) {
        editor.commands.setContent(data.html, { emitUpdate: true });
        setStatus("AI formatted successfully");
      }
    } catch (e) {
      setStatus("AI formatting failed");
    } finally {
      setIsAiLoading(false);
    }
  }

  return (
    <div className={`flex h-full flex-col font-sans ${className ?? ""}`}>
      {/* Sleek Minimalist Toolbar */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-zinc-200 px-3 py-2 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.02]">
        {/* Text Formatting */}
        <div className="flex items-center gap-0.5">
          <ToolbarBtn
            active={editor.isActive("bold")}
            onClick={() =>
              run("Bold toggled", () =>
                editor.chain().focus().toggleBold().run(),
              )
            }
            title="Bold (Cmd+B)"
          >
            <Bold className="size-4" />
          </ToolbarBtn>
          <ToolbarBtn
            active={editor.isActive("italic")}
            onClick={() =>
              run("Italic toggled", () =>
                editor.chain().focus().toggleItalic().run(),
              )
            }
            title="Italic (Cmd+I)"
          >
            <Italic className="size-4" />
          </ToolbarBtn>
        </div>

        <Divider />

        {/* Headings */}
        <div className="flex items-center gap-0.5">
          <ToolbarBtn
            active={editor.isActive("heading", { level: 1 })}
            onClick={() =>
              run("H1 toggled", () =>
                editor.chain().focus().toggleHeading({ level: 1 }).run(),
              )
            }
            title="Heading 1"
          >
            <Heading1 className="size-4" />
          </ToolbarBtn>
          <ToolbarBtn
            active={editor.isActive("heading", { level: 2 })}
            onClick={() =>
              run("H2 toggled", () =>
                editor.chain().focus().toggleHeading({ level: 2 }).run(),
              )
            }
            title="Heading 2"
          >
            <Heading2 className="size-4" />
          </ToolbarBtn>
          <ToolbarBtn
            active={editor.isActive("heading", { level: 3 })}
            onClick={() =>
              run("H3 toggled", () =>
                editor.chain().focus().toggleHeading({ level: 3 }).run(),
              )
            }
            title="Heading 3"
          >
            <Heading3 className="size-4" />
          </ToolbarBtn>
          <ToolbarBtn
            active={editor.isActive("paragraph")}
            onClick={() =>
              run("Set to Paragraph", () =>
                editor.chain().focus().setParagraph().run(),
              )
            }
            title="Paragraph"
          >
            <Type className="size-4" />
          </ToolbarBtn>
        </div>

        <Divider />

        {/* Lists & Quotes */}
        <div className="flex items-center gap-0.5">
          <ToolbarBtn
            active={editor.isActive("bulletList")}
            onClick={() =>
              run("Bulleted List toggled", () =>
                editor.chain().focus().toggleBulletList().run(),
              )
            }
            title="Bullet List"
          >
            <List className="size-4" />
          </ToolbarBtn>
          <ToolbarBtn
            active={editor.isActive("orderedList")}
            onClick={() =>
              run("Numbered List toggled", () =>
                editor.chain().focus().toggleOrderedList().run(),
              )
            }
            title="Numbered List"
          >
            <ListOrdered className="size-4" />
          </ToolbarBtn>
          <ToolbarBtn
            active={editor.isActive("blockquote")}
            onClick={toggleQuote}
            title="Blockquote"
          >
            <Quote className="size-4" />
          </ToolbarBtn>
        </div>

        <Divider />

        {/* Media & Extras */}
        <div className="flex items-center gap-0.5">
          <ToolbarBtn
            active={editor.isActive("link")}
            onClick={setLink}
            title="Add Link"
          >
            <LinkIcon className="size-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={insertImage} title="Insert Image URL">
            <ImageIcon className="size-4" />
          </ToolbarBtn>
          <ToolbarBtn
            active={editor.isActive("codeBlock")}
            onClick={() =>
              run("Code block toggled", () =>
                editor.chain().focus().toggleCodeBlock().run(),
              )
            }
            title="Code Block"
          >
            <Code className="size-4" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() =>
              run("Divider inserted", () =>
                editor.chain().focus().setHorizontalRule().run(),
              )
            }
            title="Divider Line"
          >
            <Minus className="size-4" />
          </ToolbarBtn>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span
            className={`text-xs font-medium text-zinc-500 transition-opacity duration-300 dark:text-zinc-400 ${status ? "opacity-100" : "opacity-0"}`}
          >
            {status}
          </span>
          <button
            onClick={aiFormat}
            disabled={isAiLoading}
            className="flex items-center gap-1.5 border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-100 disabled:opacity-50 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
            title="Ask AI to format text beautifully"
          >
            {isAiLoading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Bot className="size-3.5" />
            )}
            AI Format
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div
        className="flex-1 cursor-text bg-transparent"
        onClick={() => !editor.isFocused && editor.chain().focus().run()}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
          .tiptap p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: #a1a1aa;
            pointer-events: none;
            height: 0;
          }
          .dark .tiptap p.is-editor-empty:first-child::before {
            color: rgba(255, 255, 255, 0.2);
          }
        `,
          }}
        />
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}

/**
 * Custom Minimal Toolbar Button
 */
function ToolbarBtn({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex h-8 w-8 items-center justify-center border border-zinc-200/80 transition-all active:scale-95 dark:border-white/10
        ${
          active
            ? "bg-indigo-100 text-indigo-700 shadow-sm ring-1 ring-indigo-500/50 dark:bg-indigo-500/30 dark:text-indigo-300 dark:ring-indigo-500/50"
            : "text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
        }
      `}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-5 w-[1px] bg-zinc-200 dark:bg-white/10" />;
}
