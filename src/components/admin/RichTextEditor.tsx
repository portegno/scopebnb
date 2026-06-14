"use client";

import { useRef, useState } from "react";
import { useEditor, useEditorState, EditorContent, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { SizedImage } from "./extensions/sizedImage";
import { AstroFigure } from "./extensions/astroFigure";
import { uploadBlogImage } from "@/lib/blog/upload";

// Width options for a selected body image (null = full / natural width).
const IMAGE_SIZES: { label: string; w: string | null }[] = [
  { label: "S", w: "33%" },
  { label: "M", w: "50%" },
  { label: "L", w: "75%" },
  { label: "Full", w: null },
];

// Justification options (null = left / natural flow).
const IMAGE_ALIGNS: { label: string; a: string | null }[] = [
  { label: "Left", a: null },
  { label: "Center", a: "center" },
  { label: "Right", a: "right" },
];

// Text justification for paragraphs/headings.
const TEXT_ALIGNS: { label: string; a: "left" | "center" | "right" | "justify" }[] = [
  { label: "↤", a: "left" },
  { label: "↔", a: "center" },
  { label: "↦", a: "right" },
  { label: "≣", a: "justify" },
];

/**
 * WYSIWYG editor for blog post bodies. StarterKit (v3) already bundles Link +
 * Underline; we add Image. Emits HTML via onChange. Uncontrolled after mount —
 * pass the initial HTML as `initialHtml`.
 */
export function RichTextEditor({
  initialHtml,
  onChange,
}: {
  initialHtml: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    immediatelyRender: false, // avoids SSR hydration mismatch in Next
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      SizedImage.configure({ inline: false }),
      AstroFigure,
    ],
    content: initialHtml,
    editorProps: {
      attributes: {
        class:
          "min-h-64 rounded-b-[4px] bg-white px-4 py-3 text-sm text-slate-800 outline-none " +
          "[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-background " +
          "[&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-background " +
          "[&_p]:my-2 [&_p]:leading-relaxed [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 " +
          "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-blue-600 [&_a]:underline " +
          "[&_img]:my-3 [&_img]:rounded-[4px] [&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 " +
          "[&_blockquote]:pl-3 [&_blockquote]:text-slate-500 " +
          "[&_figure]:my-4 [&_figure_img]:m-0 [&_figcaption]:mt-1.5 [&_figcaption]:text-xs " +
          "[&_figcaption]:text-slate-500 [&_figcaption_.astro-cap]:block [&_figcaption_.astro-cap]:text-slate-600 " +
          "[&_figcaption_a]:text-blue-600 [&_figcaption_a]:underline",
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  if (!editor) return <div className="min-h-72 rounded-[4px] border border-slate-300 bg-slate-50" />;

  return (
    <div className="rounded-[4px] border border-slate-300">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      <ImageSizeMenu editor={editor} />
    </div>
  );
}

/**
 * Floating controls that appear right on a selected image so the author can
 * change its size in place (S / M / L / Full). Driven by the bubble-menu
 * plugin, so it shows on any image, including ones already in a saved post.
 */
function ImageSizeMenu({ editor }: { editor: Editor }) {
  // Subscribe only to the selected image's width so the active highlight stays
  // in sync without re-rendering the whole editor on every transaction (which
  // would feed back into the bubble menu's positioning and loop).
  const { width, align } = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const a = e.getAttributes("image");
      return {
        width: (a.width as string | undefined) ?? null,
        align: (a.align as string | undefined) ?? null,
      };
    },
  });
  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor: e }) => e.isActive("image")}
      options={{ placement: "top", offset: 8 }}
      className="flex items-center gap-1 rounded-[4px] border border-slate-300 bg-white p-1 shadow-lg"
    >
      <span className="px-1 text-[11px] uppercase tracking-wider text-slate-400">Size</span>
      {IMAGE_SIZES.map(({ label, w }) => (
        <Btn
          key={label}
          label={label}
          active={width === w}
          on={() => editor.chain().focus().updateAttributes("image", { width: w }).run()}
        />
      ))}
      <span className="mx-1 h-4 w-px bg-slate-300" />
      <span className="px-1 text-[11px] uppercase tracking-wider text-slate-400">Align</span>
      {IMAGE_ALIGNS.map(({ label, a }) => (
        <Btn
          key={label}
          label={label}
          active={align === a}
          on={() => editor.chain().focus().updateAttributes("image", { align: a }).run()}
        />
      ))}
    </BubbleMenu>
  );
}

function Btn({ on, active, label }: { on: () => void; active?: boolean; label: string }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // keep editor selection
      onClick={on}
      className={`rounded-[4px] px-2 py-1 text-xs font-medium ${
        active ? "bg-surface-2 text-white" : "text-slate-600 hover:bg-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [astroOpen, setAstroOpen] = useState(false);

  // Reactive active-states so the toolbar highlights track the selection (v3
  // doesn't re-render on transactions by default).
  const a = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      link: e.isActive("link"),
      align: (["left", "center", "right", "justify"] as const).find((al) => e.isActive({ textAlign: al })) ?? null,
    }),
  });

  function addLink() {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadBlogImage(file);
      editor.chain().focus().setImage({ src: url, alt: file.name }).run();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-1 rounded-t-[4px] border-b border-slate-300 bg-slate-100 p-1.5">
      <Btn label="H2" active={a.h2} on={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
      <Btn label="H3" active={a.h3} on={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
      <span className="mx-1 h-4 w-px bg-slate-300" />
      <Btn label="B" active={a.bold} on={() => editor.chain().focus().toggleBold().run()} />
      <Btn label="I" active={a.italic} on={() => editor.chain().focus().toggleItalic().run()} />
      <span className="mx-1 h-4 w-px bg-slate-300" />
      <Btn label="• List" active={a.bullet} on={() => editor.chain().focus().toggleBulletList().run()} />
      <Btn label="1. List" active={a.ordered} on={() => editor.chain().focus().toggleOrderedList().run()} />
      <Btn label="❝ Quote" active={a.quote} on={() => editor.chain().focus().toggleBlockquote().run()} />
      <span className="mx-1 h-4 w-px bg-slate-300" />
      {TEXT_ALIGNS.map(({ label, a: al }) => (
        <Btn
          key={al}
          label={label}
          active={(a.align ?? "left") === al}
          on={() => editor.chain().focus().setTextAlign(al).run()}
        />
      ))}
      <span className="mx-1 h-4 w-px bg-slate-300" />
      <Btn label="Link" active={a.link} on={addLink} />
      <Btn label={uploading ? "Uploading…" : "Image"} on={() => !uploading && fileRef.current?.click()} />
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage} />
      <span className="mx-1 h-4 w-px bg-slate-300" />
      <Btn label="★ AstroBin" on={() => setAstroOpen(true)} />
      {astroOpen && <AstroDialog editor={editor} onClose={() => setAstroOpen(false)} />}
    </div>
  );
}

/** Modal to insert a credited AstroBin photo (image + small credit caption). */
function AstroDialog({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState("");
  const [credit, setCredit] = useState("");
  const [href, setHref] = useState("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  const input =
    "w-full rounded-[4px] border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-slate-500";

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      setSrc(await uploadBlogImage(file));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function insert() {
    if (!src) return;
    editor
      .chain()
      .focus()
      .insertContent({
        type: "astroFigure",
        attrs: { src, alt: caption || credit, caption: caption.trim(), credit: credit.trim(), href: href.trim() },
      })
      .run();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-[4px] bg-white p-5 shadow-xl ring-1 ring-slate-200" onMouseDown={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-slate-800">Insert AstroBin photo</h3>

        <div className="mt-3 space-y-3">
          <div>
            <label className="text-xs uppercase tracking-wider text-slate-400">Image</label>
            <div className="mt-1 flex gap-2">
              <input value={src} onChange={(e) => setSrc(e.target.value)} placeholder="Paste image URL or upload →" className={input} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="shrink-0 rounded-[4px] border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                {uploading ? "…" : "Upload"}
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPick} />
            </div>
            {src && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt="" className="mt-2 max-h-40 w-full rounded-[4px] object-contain" />
            )}
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-slate-400">AstroBin user (credit)</label>
            <input value={credit} onChange={(e) => setCredit(e.target.value)} placeholder="e.g. astrophotographer_123" className={`${input} mt-1`} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-slate-400">Link</label>
            <input value={href} onChange={(e) => setHref(e.target.value)} placeholder="https://www.astrobin.com/…" className={`${input} mt-1`} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-slate-400">Caption (optional)</label>
            <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="e.g. M31 — Andromeda Galaxy" className={`${input} mt-1`} />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[4px] border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button type="button" onClick={insert} disabled={!src} className="rounded-[4px] bg-surface-2 px-3 py-1.5 text-sm font-semibold text-white hover:bg-surface disabled:opacity-50">
            Insert
          </button>
        </div>
      </div>
    </div>
  );
}
