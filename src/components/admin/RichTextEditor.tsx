"use client";

import { useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
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
    // v3 doesn't re-render on transactions by default, so the toolbar's
    // isActive() states (incl. the per-image size controls that appear when an
    // image is selected) would go stale. Opt back in to selection-driven renders.
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
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
    </div>
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
    <div className="flex flex-wrap items-center gap-1 rounded-t-[4px] border-b border-slate-300 bg-slate-100 p-1.5">
      <Btn label="H2" active={editor.isActive("heading", { level: 2 })} on={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
      <Btn label="H3" active={editor.isActive("heading", { level: 3 })} on={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
      <span className="mx-1 h-4 w-px bg-slate-300" />
      <Btn label="B" active={editor.isActive("bold")} on={() => editor.chain().focus().toggleBold().run()} />
      <Btn label="I" active={editor.isActive("italic")} on={() => editor.chain().focus().toggleItalic().run()} />
      <span className="mx-1 h-4 w-px bg-slate-300" />
      <Btn label="• List" active={editor.isActive("bulletList")} on={() => editor.chain().focus().toggleBulletList().run()} />
      <Btn label="1. List" active={editor.isActive("orderedList")} on={() => editor.chain().focus().toggleOrderedList().run()} />
      <Btn label="❝ Quote" active={editor.isActive("blockquote")} on={() => editor.chain().focus().toggleBlockquote().run()} />
      <span className="mx-1 h-4 w-px bg-slate-300" />
      <Btn label="Link" active={editor.isActive("link")} on={addLink} />
      <Btn label={uploading ? "Uploading…" : "Image"} on={() => !uploading && fileRef.current?.click()} />
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage} />
      {editor.isActive("image") && (
        <>
          <span className="mx-1 h-4 w-px bg-slate-300" />
          <span className="px-1 text-[11px] uppercase tracking-wider text-slate-400">Size</span>
          {IMAGE_SIZES.map(({ label, w }) => (
            <Btn
              key={label}
              label={label}
              active={(editor.getAttributes("image").width ?? null) === w}
              on={() => editor.chain().focus().updateAttributes("image", { width: w }).run()}
            />
          ))}
        </>
      )}
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
