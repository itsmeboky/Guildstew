import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import { Placeholder } from "@tiptap/extensions";
import { toast } from "sonner";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, Pilcrow, List, ListOrdered,
  Quote, Link as LinkIcon, Table as TableIcon, Image as ImageIcon,
  Baseline, Highlighter, Upload,
} from "lucide-react";
import { uploadFile } from "@/utils/uploadFile";
import "./loreRichText.css";

/**
 * World Lore rich-text editor (TipTap v3). Controlled component:
 * takes `value` (HTML string) and emits `onChange(html)` with
 * `editor.getHTML()`. StarterKit (v3) already bundles link + underline,
 * so only Image / Table / TextStyle / Color / Highlight are registered
 * separately to avoid duplicate-extension warnings.
 *
 * Styling pulls from the World Lore palette via the shared `.lore-prose`
 * class (see loreRichText.css) — the same class the saved-entry render
 * path uses, so authoring matches reading.
 */
export default function LoreRichTextEditor({ value = "", onChange, placeholder }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
        },
      }),
      TextStyle,
      Color.configure({ types: ["textStyle"] }),
      Highlight.configure({ multicolor: true }),
      Image.configure({ inline: false, allowBase64: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: placeholder || "Write whatever you want." }),
    ],
    content: value || "",
    editorProps: {
      attributes: { class: "lore-prose lore-rte-content", spellcheck: "true" },
    },
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
  });

  // Keep the editor in sync if the parent swaps `value` from the
  // outside (e.g. opening a different entry into the same form). The
  // guard prevents clobbering the caret while the user is typing —
  // during typing `value` and the current HTML are already equal.
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if ((value || "") !== current) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="border border-slate-600 rounded-lg bg-[#0f1219] overflow-hidden">
      <Toolbar editor={editor} />
      <EditorContent
        editor={editor}
        className="px-3 py-2 min-h-[220px] max-h-[60vh] overflow-y-auto cursor-text"
        onClick={() => editor.chain().focus().run()}
      />
    </div>
  );
}

function Toolbar({ editor }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const isActive = (name, attrs) => editor.isActive(name, attrs);

  const setLink = () => {
    const prev = editor.getAttributes("link")?.href || "";
    const url = window.prompt("Link URL", prev);
    if (url === null) return; // cancelled
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const insertImage = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await uploadFile(file, "user-assets", "worldlore", { uploadType: "worldLore" });
      editor.chain().focus().setImage({ src: file_url }).run();
    } catch (err) {
      toast.error(err?.message || "Image upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-700 bg-[#050816] px-2 py-1.5">
      <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={isActive("bold")} title="Bold"><Bold className="w-4 h-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={isActive("italic")} title="Italic"><Italic className="w-4 h-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={isActive("underline")} title="Underline"><UnderlineIcon className="w-4 h-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={isActive("strike")} title="Strikethrough"><Strikethrough className="w-4 h-4" /></Btn>

      <Divider />

      {/* Text color — full, unrestricted color wheel */}
      <ColorBtn
        icon={<Baseline className="w-4 h-4" />}
        title="Text color"
        value={editor.getAttributes("textStyle")?.color || "#ffffff"}
        onChange={(c) => editor.chain().focus().setColor(c).run()}
      />
      {/* Highlight — full, unrestricted color wheel */}
      <ColorBtn
        icon={<Highlighter className="w-4 h-4" />}
        title="Highlight color"
        value={editor.getAttributes("highlight")?.color || "#fff176"}
        onChange={(c) => editor.chain().focus().toggleHighlight({ color: c }).run()}
      />

      <Divider />

      <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={isActive("heading", { level: 1 })} title="Heading 1"><Heading1 className="w-4 h-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={isActive("heading", { level: 2 })} title="Heading 2"><Heading2 className="w-4 h-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={isActive("heading", { level: 3 })} title="Heading 3"><Heading3 className="w-4 h-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().setParagraph().run()} active={isActive("paragraph")} title="Paragraph"><Pilcrow className="w-4 h-4" /></Btn>

      <Divider />

      <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={isActive("bulletList")} title="Bullet list"><List className="w-4 h-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={isActive("orderedList")} title="Numbered list"><ListOrdered className="w-4 h-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={isActive("blockquote")} title="Blockquote"><Quote className="w-4 h-4" /></Btn>

      <Divider />

      <Btn onClick={setLink} active={isActive("link")} title="Link"><LinkIcon className="w-4 h-4" /></Btn>
      <Btn
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        title="Insert table"
      ><TableIcon className="w-4 h-4" /></Btn>
      <Btn
        onClick={() => !uploading && fileInputRef.current?.click()}
        title="Insert image"
      >
        {uploading ? <Upload className="w-4 h-4 animate-pulse" /> : <ImageIcon className="w-4 h-4" />}
      </Btn>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => insertImage(e.target.files?.[0])}
        disabled={uploading}
      />
    </div>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-slate-700" aria-hidden />;
}

function Btn({ onClick, active, title, children }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`p-1.5 rounded transition-colors ${
        active
          ? "bg-[#37F2D1]/15 text-[#37F2D1]"
          : "text-slate-400 hover:text-white hover:bg-[#252b3d]"
      }`}
    >
      {children}
    </button>
  );
}

function ColorBtn({ icon, title, value, onChange }) {
  return (
    <label
      title={title}
      aria-label={title}
      className="relative p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#252b3d] cursor-pointer flex items-center"
      onMouseDown={(e) => e.preventDefault()}
    >
      {icon}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </label>
  );
}
