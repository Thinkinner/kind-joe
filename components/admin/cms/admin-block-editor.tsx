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
          "prose prose-neutral max-w-none min-h-[280px] focus:outline-none px-3 py-2",
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
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-8 text-sm text-neutral-500">
        Loading editor…
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-neutral-200 bg-white", className)}>
      <div className="flex flex-wrap gap-1 border-b border-neutral-100 bg-neutral-50/80 px-2 py-2">
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
        <span className="mx-1 w-px self-stretch bg-neutral-200" />
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
        <span className="mx-1 w-px self-stretch bg-neutral-200" />
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
        <span className="mx-1 w-px self-stretch bg-neutral-200" />
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
      <EditorContent editor={editor} />
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
