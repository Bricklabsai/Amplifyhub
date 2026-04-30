"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Link } from "@tiptap/extension-link";
import { Image } from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { TextAlign } from "@tiptap/extension-text-align";
import {
  HiBold,
  HiItalic,
  HiStrikethrough,
  HiListBullet,
  HiNumberedList,
  HiArrowUturnLeft,
  HiArrowUturnRight,
  HiSquare2Stack,
  HiEllipsisHorizontal,
} from "react-icons/hi2";
import { Button } from "@/components/ui/button";

interface TipTapEditorProps {
  value: string;
  onChange: (html: string) => void;
}

export default function TipTapEditor({ value, onChange }: TipTapEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Link.configure({
        openOnClick: false,
      }),
      Image,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return null;
  }

  const toggleLink = () => {
    const url = window.prompt("Enter URL");
    if (url) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  };

  const insertImage = () => {
    const url = window.prompt("Enter image URL");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 bg-gray-50">
        <Button
          size="sm"
          variant={editor.isActive("bold") ? "default" : "outline"}
          onClick={() => editor.chain().focus().toggleBold().run()}
          className="h-8 w-8 p-0"
          title="Bold"
        >
          <HiBold className="text-sm" />
        </Button>

        <Button
          size="sm"
          variant={editor.isActive("italic") ? "default" : "outline"}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className="h-8 w-8 p-0"
          title="Italic"
        >
          <HiItalic className="text-sm" />
        </Button>

        <Button
          size="sm"
          variant={editor.isActive("strike") ? "default" : "outline"}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className="h-8 w-8 p-0"
          title="Strikethrough"
        >
          <HiStrikethrough className="text-sm" />
        </Button>

        <div className="w-px bg-gray-300" />

        <Button
          size="sm"
          variant={editor.isActive({ textAlign: "left" }) ? "default" : "outline"}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className="h-8 w-8 p-0"
          title="Align Left"
        >
          ←
        </Button>

        <Button
          size="sm"
          variant={editor.isActive({ textAlign: "center" }) ? "default" : "outline"}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className="h-8 w-8 p-0"
          title="Align Center"
        >
          ↔
        </Button>

        <Button
          size="sm"
          variant={editor.isActive({ textAlign: "right" }) ? "default" : "outline"}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className="h-8 w-8 p-0"
          title="Align Right"
        >
          →
        </Button>

        <div className="w-px bg-gray-300" />

        <Button
          size="sm"
          variant={editor.isActive("bulletList") ? "default" : "outline"}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className="h-8 w-8 p-0"
          title="Bullet List"
        >
          <HiListBullet className="text-sm" />
        </Button>

        <Button
          size="sm"
          variant={editor.isActive("orderedList") ? "default" : "outline"}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className="h-8 w-8 p-0"
          title="Numbered List"
        >
          <HiNumberedList className="text-sm" />
        </Button>

        <div className="w-px bg-gray-300" />

        <Button
          size="sm"
          variant={editor.isActive("heading", { level: 1 }) ? "default" : "outline"}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className="h-8 w-8 p-0 text-xs font-bold"
          title="Heading 1"
        >
          H1
        </Button>

        <Button
          size="sm"
          variant={editor.isActive("heading", { level: 2 }) ? "default" : "outline"}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className="h-8 w-8 p-0 text-xs font-bold"
          title="Heading 2"
        >
          H2
        </Button>

        <Button
          size="sm"
          variant={editor.isActive("heading", { level: 3 }) ? "default" : "outline"}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className="h-8 w-8 p-0 text-xs font-bold"
          title="Heading 3"
        >
          H3
        </Button>

        <div className="w-px bg-gray-300" />

        <Button
          size="sm"
          variant="outline"
          onClick={toggleLink}
          className="h-8 px-2 text-xs"
          title="Insert Link"
        >
          Link
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={insertImage}
          className="h-8 px-2 text-xs"
          title="Insert Image"
        >
          Image
        </Button>

        <div className="w-px bg-gray-300" />

        <Button
          size="sm"
          variant="outline"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="h-8 w-8 p-0"
          title="Undo"
        >
          <HiArrowUturnLeft className="text-sm" />
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="h-8 w-8 p-0"
          title="Redo"
        >
          <HiArrowUturnRight className="text-sm" />
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => editor.chain().focus().clearNodes().run()}
          className="h-8 px-2 text-xs"
          title="Clear Formatting"
        >
          Clear
        </Button>
      </div>

      {/* Editor Content Area */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none focus:outline-none p-4 min-h-80 [&_.ProseMirror]:focus:outline-none [&_.ProseMirror]:min-h-80"
      />
    </div>
  );
}
