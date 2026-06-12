import { Node } from "@tiptap/core";

/**
 * A credited image block: an <img> with a small <figcaption> underneath giving
 * credit to an AstroBin user (linked). Stored as a self-describing <figure> so
 * it round-trips through HTML (source of truth = the data-* attrs on <figure>).
 *
 * Insert with: editor.chain().focus().insertContent({ type: "astroFigure", attrs }).run()
 */
export const AstroFigure = Node.create({
  name: "astroFigure",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: "" },
      alt: { default: "" },
      caption: { default: "" },
      credit: { default: "" }, // AstroBin username
      href: { default: "" }, // link (AstroBin image / profile)
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure[data-astro]",
        getAttrs: (el) => {
          const e = el as HTMLElement;
          return {
            src: e.getAttribute("data-src") || e.querySelector("img")?.getAttribute("src") || "",
            alt: e.getAttribute("data-alt") || "",
            caption: e.getAttribute("data-caption") || "",
            credit: e.getAttribute("data-credit") || "",
            href: e.getAttribute("data-href") || "",
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const { src, alt, caption, credit, href } = node.attrs as Record<string, string>;

    const creditInline = href
      ? ["a", { href, target: "_blank", rel: "noreferrer noopener" }, credit || "AstroBin"]
      : credit || "";

    const figcaptionChildren: unknown[] = [];
    if (caption) figcaptionChildren.push(["span", { class: "astro-cap" }, caption]);
    figcaptionChildren.push(["span", { class: "astro-credit" }, "Image by ", creditInline, " · AstroBin"]);

    return [
      "figure",
      {
        "data-astro": "",
        "data-src": src,
        "data-alt": alt,
        "data-caption": caption,
        "data-credit": credit,
        "data-href": href,
        class: "astro-figure",
      },
      ["img", { src, alt: alt || caption || credit }],
      ["figcaption", {}, ...figcaptionChildren],
    ] as unknown as readonly [string, Record<string, unknown>, ...unknown[]];
  },
});
