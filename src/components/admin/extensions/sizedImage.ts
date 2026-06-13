import Image from "@tiptap/extension-image";

/**
 * The standard Image node plus a `width` attribute so the author can pick a
 * size (S / M / L / Full). Width is stored as an inline style (e.g. "50%") so
 * it round-trips through HTML and renders identically on the public page via
 * dangerouslySetInnerHTML. `null` means full/natural width.
 */
export const SizedImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null as string | null,
        parseHTML: (el) => (el as HTMLElement).style.width || el.getAttribute("width") || null,
        renderHTML: (attrs) => (attrs.width ? { style: `width: ${attrs.width}` } : {}),
      },
    };
  },
});
