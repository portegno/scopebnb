import Image from "@tiptap/extension-image";
import { mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ImageNodeView } from "./ImageNodeView";

/**
 * The standard Image node plus `width`, `align` and `credit`/`creditHref`
 * attributes so the author can size, justify and credit a body image, all from
 * the image's floating menu. Everything round-trips through HTML:
 *  - No credit  -> a plain <img> with the size/align inline style (unchanged).
 *  - With credit -> a <figure> (carrying the size/align) wrapping the <img> and
 *    a small <figcaption> whose text links out (new tab) when a URL is given.
 * The editor shows this through a React node view; the saved/public HTML comes
 * from renderHTML below.
 */
const ALIGN_STYLE: Record<string, string> = {
  center: "display: block; margin-left: auto; margin-right: auto",
  right: "display: block; margin-left: auto; margin-right: 0",
};

export const SizedImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      // src/alt fall back to an inner <img> so the <figure> form re-parses.
      src: {
        default: null as string | null,
        parseHTML: (el) => el.getAttribute("src") || el.querySelector("img")?.getAttribute("src") || null,
      },
      alt: {
        default: null as string | null,
        parseHTML: (el) => el.getAttribute("alt") || el.querySelector("img")?.getAttribute("alt") || null,
      },
      width: {
        default: null as string | null,
        parseHTML: (el) => el.style.width || el.getAttribute("data-width") || el.getAttribute("width") || null,
        renderHTML: () => ({}),
      },
      align: {
        default: null as string | null,
        parseHTML: (el) => el.getAttribute("data-align") || null,
        renderHTML: () => ({}),
      },
      credit: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-credit") || "",
        renderHTML: () => ({}),
      },
      creditHref: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-credit-href") || "",
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "figure[data-sized-image]" }, { tag: "img[src]" }];
  },

  renderHTML({ node }) {
    const src = (node.attrs.src as string) || "";
    const alt = (node.attrs.alt as string) || "";
    const title = (node.attrs.title as string) || undefined;
    const width = node.attrs.width as string | null;
    const align = node.attrs.align as string | null;
    const credit = (node.attrs.credit as string) || "";
    const creditHref = (node.attrs.creditHref as string) || "";

    const sizeAlign: string[] = [];
    if (width) sizeAlign.push(`width: ${width}`);
    if (align && ALIGN_STYLE[align]) sizeAlign.push(ALIGN_STYLE[align]);

    if (!credit) {
      const imgAttrs: Record<string, unknown> = { src, alt, title };
      if (sizeAlign.length) imgAttrs.style = sizeAlign.join("; ");
      if (align) imgAttrs["data-align"] = align;
      return ["img", mergeAttributes(imgAttrs)];
    }

    const capAlign = align === "center" ? "center" : align === "right" ? "right" : "left";
    const inner = creditHref
      ? ["a", { href: creditHref, target: "_blank", rel: "noreferrer noopener" }, credit]
      : credit;

    return [
      "figure",
      {
        "data-sized-image": "",
        "data-credit": credit,
        "data-credit-href": creditHref || undefined,
        "data-align": align || undefined,
        "data-width": width || undefined,
        class: "photo-figure",
        style: sizeAlign.join("; ") || undefined,
      },
      ["img", { src, alt, title, style: "width: 100%; display: block; margin: 0" }],
      ["figcaption", { class: "photo-credit", style: `text-align: ${capAlign}` }, inner],
    ] as unknown as readonly [string, Record<string, unknown>, ...unknown[]];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});
