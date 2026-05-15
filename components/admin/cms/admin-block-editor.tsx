"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExt from "@tiptap/extension-image";
import LinkExt from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Youtube from "@tiptap/extension-youtube";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { marked } from "marked";
import { universalParser } from "@/lib/content/parser";
import { normalizeArticleMarkdown } from "@/lib/content/normalize-article-markdown";
import {
  Bold,
  Code2,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
} from "lucide-react";

export type AdminBlockEditorProps = {
  initialMarkdown?: string;
  initialHtml?: string;
  className?: string;
  onChange?: (payload: { markdown: string; html: string }) => void;
};

export function AdminBlockEditor({
  initialMarkdown,
  initialHtml,
  className,
  onChange,
}: AdminBlockEditorProps) {
  const hasUserEditedRef = useRef(false);
  const startingHtml = useMemo(() => {
    if (initialHtml?.trim()) {
      return initialHtml;
    }
    if (initialMarkdown?.trim()) {
      const parsed = marked.parse(normalizeArticleMarkdown(initialMarkdown));
      return typeof parsed === "string" ? parsed : "";
    }
    return "";
  }, [initialHtml, initialMarkdown]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      LinkExt.configure({ openOnClick: false, autolink: true }),
      ImageExt.configure({ inline: false }),
      Underline,
      Youtube.configure({ width: 640, height: 360 }),
    ],
    content: startingHtml || "<p></p>",
    editorProps: {
      attributes: {
        class:
          [
            "min-h-[520px] focus:outline-none px-5 py-5 bg-background",
            "text-[1.03rem] leading-8 text-foreground font-[var(--font-sans),ui-sans-serif,system-ui,sans-serif]",
            "[&_p]:my-4 [&_p]:leading-8",
            "[&_h2]:mt-9 [&_h2]:mb-3 [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:tracking-tight",
            "[&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:text-2xl [&_h3]:font-bold [&_h3]:tracking-tight",
            "[&_h4]:mt-6 [&_h4]:mb-2 [&_h4]:text-xl [&_h4]:font-semibold",
            "[&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6",
            "[&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6",
            "[&_li]:my-2",
            "[&_blockquote]:my-5 [&_blockquote]:border-l-4 [&_blockquote]:border-rose-400/70 [&_blockquote]:bg-transparent [&_blockquote]:pl-4 [&_blockquote]:pr-0 [&_blockquote]:py-0",
            "[&_blockquote_p]:my-2",
            "[&_a]:text-rose-700 [&_a]:underline [&_a]:underline-offset-2",
            "[&_img]:my-6 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg",
            "[&_pre]:my-5 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-950 [&_pre]:p-4 [&_pre]:text-slate-100",
          ].join(" "),
      },
    },
    onUpdate: ({ editor: ed }) => {
      hasUserEditedRef.current = true;
      const html = ed.getHTML();
      onChange?.({
        markdown: universalParser(ed.getJSON()),
        html,
      });
    },
    onCreate: ({ editor: ed }) => {
      const html = ed.getHTML();
      onChange?.({
        markdown: universalParser(ed.getJSON()),
        html,
      });
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (!startingHtml.trim()) return;
    if (hasUserEditedRef.current) return;
    if (editor.isFocused) return;
    if (startingHtml === editor.getHTML()) return;
    editor.commands.setContent(startingHtml, false);
  }, [editor, startingHtml]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const next = window.prompt("URL", prev ?? "https://");
    if (next === null) return;
    if (next === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: next }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Image URL");
    if (!url?.trim()) return;
    editor.chain().focus().setImage({ src: url.trim() }).run();
  }, [editor]);

  return (
    <div className={cn("rounded-xl border border-border bg-card", className)}>
      <div className="border-b border-border bg-muted/60 px-3 py-2">
        <p className="text-xs text-muted-foreground">
          Visual editor (live markdown sync in background).
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-background px-2.5 py-2">
        <IconToolButton
          label="Bold"
          shortcut="Cmd/Ctrl+B"
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </IconToolButton>
        <IconToolButton
          label="Italic"
          shortcut="Cmd/Ctrl+I"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </IconToolButton>
        <span className="mx-0.5 h-6 w-px bg-border" />
        <IconToolButton
          label="Heading 2"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </IconToolButton>
        <IconToolButton
          label="Heading 3"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" />
        </IconToolButton>
        <span className="mx-0.5 h-6 w-px bg-border" />
        <IconToolButton
          label="Bullet list"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </IconToolButton>
        <IconToolButton
          label="Numbered list"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </IconToolButton>
        <IconToolButton
          label="Blockquote"
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </IconToolButton>
        <span className="mx-0.5 h-6 w-px bg-border" />
        <IconToolButton label="Link" shortcut="Cmd/Ctrl+K" onClick={setLink}>
          <Link2 className="h-4 w-4" />
        </IconToolButton>
        <IconToolButton label="Image" onClick={addImage}>
          <ImagePlus className="h-4 w-4" />
        </IconToolButton>
        <IconToolButton
          label="Code block"
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
        >
          <Code2 className="h-4 w-4" />
        </IconToolButton>
      </div>

      <div className="min-h-[520px] bg-background">
        {editor ? (
          <EditorContent editor={editor} />
        ) : (
          <div className="px-5 py-5 text-sm text-muted-foreground">Loading editor...</div>
        )}
      </div>
    </div>
  );
}

function IconToolButton({
  children,
  label,
  shortcut,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
}) {
  const title = shortcut ? `${label} (${shortcut})` : label;
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      onClick={onClick}
      aria-label={label}
      title={title}
      className="h-8 w-8 rounded-md text-foreground/80 transition hover:bg-muted hover:text-foreground"
    >
      {children}
    </Button>
  );
}
