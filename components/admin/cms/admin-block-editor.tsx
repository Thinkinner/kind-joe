"use client";

import { useCallback } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExt from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Youtube from "@tiptap/extension-youtube";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
  ImageIcon,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const defaultDoc = {
  type: "doc" as const,
  content: [{ type: "paragraph" as const }],
};

export type AdminBlockEditorProps = {
  initialDoc?: object;
  initialHtml?: string;
  className?: string;
  onChange?: (payload: { json: object; html: string }) => void;
  onEditorReady?: (editor: Editor) => void;
};

export function AdminBlockEditor({
  initialDoc,
  initialHtml,
  className,
  onChange,
  onEditorReady,
}: AdminBlockEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Link.configure({ openOnClick: false, autolink: true }),
      ImageExt.configure({ inline: false }),
      Underline,
      Youtube.configure({ width: 640, height: 360 }),
    ],
    content: initialDoc ?? defaultDoc,
    editorProps: {
      attributes: {
        class:
          [
            "min-h-[420px] focus:outline-none px-5 py-5 text-[18px] leading-8 text-foreground",
            // Base typography (do not depend on external `prose` plugin styles).
            "[&_p]:my-[1.4rem] [&_p]:text-[1.01rem] [&_p]:leading-[1.78] [&_p]:text-foreground [&_p]:font-[ui-serif,Georgia,Cambria,Times,serif]",
            "[&_h2]:mt-[3.2rem] [&_h2]:mb-[0.75rem] [&_h2]:text-[1.26rem] sm:[&_h2]:text-[1.36rem] [&_h2]:font-semibold [&_h2]:tracking-[0.04em] [&_h2]:uppercase [&_h2]:font-[var(--font-google-sans),ui-sans-serif,system-ui] [&_h2]:text-foreground",
            "[&_h3]:mt-[2.8rem] [&_h3]:mb-[0.65rem] [&_h3]:text-[1.12rem] sm:[&_h3]:text-[1.18rem] [&_h3]:font-semibold [&_h3]:tracking-[0.035em] [&_h3]:uppercase [&_h3]:font-[var(--font-google-sans),ui-sans-serif,system-ui] [&_h3]:text-foreground",
            "[&_h4]:mt-[2.3rem] [&_h4]:mb-[0.55rem] [&_h4]:text-[0.99rem] sm:[&_h4]:text-[1.03rem] [&_h4]:font-semibold [&_h4]:tracking-[0.03em] [&_h4]:uppercase [&_h4]:font-[var(--font-google-sans),ui-sans-serif,system-ui] [&_h4]:text-foreground",
            "[&_ul]:my-[1.4rem] [&_ul]:list-disc [&_ul]:pl-[1.7rem]",
            "[&_ol]:my-[1.4rem] [&_ol]:list-decimal [&_ol]:pl-[1.7rem]",
            "[&_li]:my-[0.85rem] [&_li]:leading-[1.78] [&_li]:text-foreground [&_li]:font-[ui-serif,Georgia,Cambria,Times,serif]",
            "[&_blockquote]:my-7 [&_blockquote]:border-l-2 [&_blockquote]:border-rose-300 [&_blockquote]:pl-5 [&_blockquote]:text-foreground",
            "[&_a]:text-rose-700 dark:[&_a]:text-rose-300 [&_a]:underline [&_a]:underline-offset-2",
            "[&_img]:my-6 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-md",
            "[&_iframe]:my-6 [&_iframe]:max-w-full [&_iframe]:rounded-md",
          ].join(" "),
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange?.({ json: ed.getJSON() as object, html: ed.getHTML() });
    },
    onCreate: ({ editor: ed }) => {
      if (initialHtml?.trim()) {
        ed.commands.setContent(initialHtml);
      }
      onEditorReady?.(ed);
    },
  });

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
    const url = window.prompt("Image URL (upload via cover or media first)");
    if (!url?.trim()) return;
    editor.chain().focus().setImage({ src: url.trim() }).run();
  }, [editor]);

  if (!editor) {
    return (
      <div className="rounded-xl border border-border bg-muted p-8 text-sm text-muted-foreground">
        Loading editor…
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-border bg-card", className)}>
      <div className="sticky top-11 z-40 flex flex-wrap gap-1 border-b border-border bg-muted/95 px-2 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-muted/80 lg:top-16">
        <ToolbarBtn
          pressed={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          label="Bold"
        >
          <Bold className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          pressed={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          label="Italic"
        >
          <Italic className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          pressed={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          label="Underline"
        >
          <span className="text-xs font-bold underline">U</span>
        </ToolbarBtn>
        <ToolbarBtn
          pressed={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          label="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarBtn>
        <span className="mx-1 w-px self-stretch bg-border" />
        <ToolbarBtn
          pressed={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          label="H2"
        >
          H2
        </ToolbarBtn>
        <ToolbarBtn
          pressed={editor.isActive("heading", { level: 3 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          label="H3"
        >
          H3
        </ToolbarBtn>
        <ToolbarBtn
          pressed={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          label="Bullet list"
        >
          <List className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          pressed={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          label="Ordered list"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          pressed={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          label="Quote"
        >
          <Quote className="h-4 w-4" />
        </ToolbarBtn>
        <span className="mx-1 w-px self-stretch bg-border" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2"
          onClick={setLink}
        >
          <Link2 className="h-4 w-4" />
          Link
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2"
          onClick={addImage}
        >
          <ImageIcon className="h-4 w-4" />
          Image
        </Button>
        <span className="mx-1 w-px self-stretch bg-border" />
        <ToolbarBtn
          onClick={() => editor.chain().focus().undo().run()}
          label="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().redo().run()}
          label="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </ToolbarBtn>
      </div>
      <div className="mx-auto w-full max-w-4xl px-3 pb-4">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function ToolbarBtn({
  children,
  onClick,
  pressed,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  pressed?: boolean;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant={pressed ? "secondary" : "ghost"}
      size="sm"
      className="h-8 min-w-8 px-2"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </Button>
  );
}
