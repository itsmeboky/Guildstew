import React, { useCallback, useEffect, useMemo, useRef } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { toast } from "sonner";
import { uploadFile } from "@/utils/uploadFile";
import { useAuth } from "@/lib/AuthContext";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Pasted text that exactly matches an http(s) image URL gets embedded
// as <img> instead of a literal link. External hosts are allowed —
// the trade-off is the same one any forum makes for img-bbcode.
const IMAGE_URL_RX = /^https?:\/\/\S+\.(?:png|jpe?g|gif|webp|svg|avif)(?:\?\S*)?$/i;

/**
 * Forum WYSIWYG editor — wraps ReactQuill with a forum-tuned toolbar
 * (no H1; H1 is reserved for the thread title) and an image handler
 * that uploads to user-assets/forum/inline rather than embedding
 * base64 inline.
 *
 * Three image-insert paths supported: (1) toolbar image button →
 * file picker, (2) clipboard paste of an image blob (e.g.
 * screenshot) → upload + embed, (3) clipboard paste of a plain
 * https image URL → direct embed without upload.
 *
 * Output is HTML. Caller must run sanitizeForumHtml() before
 * persisting and before rendering — Quill output is mostly
 * safe-by-construction, but DOMPurify is the trust boundary for
 * user-generated content.
 */
export default function ForumRichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  minHeight = 160,
}) {
  const { user } = useAuth();
  const quillRef = useRef(null);

  const uploadAndInsert = useCallback(async (file, atIndex) => {
    if (!file?.type?.startsWith("image/")) {
      toast.error("Only image files can be inserted.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image too large (max 5 MB).");
      return;
    }
    try {
      const { file_url } = await uploadFile(file, "user-assets", "forum/inline", {
        userId: user?.id,
        uploadType: "forum_image",
      });
      const editor = quillRef.current?.getEditor();
      if (!editor || !file_url) return;
      const idx = atIndex ?? (editor.getSelection(true)?.index ?? editor.getLength());
      editor.insertEmbed(idx, "image", file_url, "user");
      editor.setSelection(idx + 1, 0);
    } catch (err) {
      toast.error(`Image upload failed: ${err?.message || "unknown error"}`);
    }
  }, [user?.id]);

  const onInsertImage = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      await uploadAndInsert(file);
    };
    input.click();
  }, [uploadAndInsert]);

  // Clipboard paste — handles the two non-toolbar insert paths.
  // Quill exposes the editing root via getEditor().root; attaching
  // here (rather than to document) keeps the listener scoped to the
  // editor instance.
  useEffect(() => {
    const editor = quillRef.current?.getEditor();
    const root = editor?.root;
    if (!root) return;
    const handler = async (e) => {
      const cd = e.clipboardData;
      if (!cd) return;

      const items = Array.from(cd.items || []);
      const imgItem = items.find(
        (it) => it.kind === "file" && it.type?.startsWith("image/"),
      );
      if (imgItem) {
        e.preventDefault();
        const file = imgItem.getAsFile();
        if (file) await uploadAndInsert(file);
        return;
      }

      const text = cd.getData("text/plain")?.trim();
      if (text && IMAGE_URL_RX.test(text)) {
        e.preventDefault();
        const range = editor.getSelection(true) || { index: editor.getLength() };
        editor.insertEmbed(range.index, "image", text, "user");
        editor.setSelection(range.index + 1, 0);
      }
    };
    root.addEventListener("paste", handler);
    return () => root.removeEventListener("paste", handler);
  }, [uploadAndInsert]);

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          // H1 deliberately omitted — reserved for the thread title.
          [{ header: [2, 3, 4, false] }],
          ["bold", "italic", "strike"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["blockquote", "code-block"],
          ["link", "image"],
          ["clean"],
        ],
        handlers: { image: onInsertImage },
      },
      clipboard: { matchVisual: false },
    }),
    [onInsertImage],
  );

  const formats = useMemo(
    () => [
      "header",
      "bold", "italic", "strike",
      "list", "bullet",
      "blockquote", "code-block",
      "link", "image",
    ],
    [],
  );

  return (
    <div className={className} style={{ "--quill-min-h": `${minHeight}px` }}>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value || ""}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  );
}
