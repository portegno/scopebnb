import Image from "@tiptap/extension-image";

/**
 * The standard Image node plus `width` and `align` attributes so the author can
 * size and justify a body image. Both are stored as inline styles (plus a
 * `data-align` marker for reliable round-tripping) so they survive as HTML and
 * render identically on the public page via dangerouslySetInnerHTML.
 *  - width: e.g. "50%"; `null` means full/natural width.
 *  - align: "center" | "right"; `null`/"left" means natural (left) flow.
 * Alignment uses auto margins, so it needs `display:block` to take effect.
 */
const ALIGN_STYLE: Record<string, string> = {
  center: "display: block; margin-left: auto; margin-right: auto",
  right: "display: block; margin-left: auto; margin-right: 0",
};

export const SizedImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null as string | null,
        parseHTML: (el) => (el as HTMLElement).style.width || el.getAttribute("width") || null,
        renderHTML: (attrs) => (attrs.width ? { style: `width: ${attrs.width}` } : {}),
      },
      align: {
        default: null as string | null,
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-align") || null,
        renderHTML: (attrs) =>
          attrs.align && ALIGN_STYLE[attrs.align as string]
            ? { style: ALIGN_STYLE[attrs.align as string], "data-align": attrs.align }
            : {},
      },
    };
  },
});
