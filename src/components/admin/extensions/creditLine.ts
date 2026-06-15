import { Node } from "@tiptap/core";

/**
 * A small photo-credit line: tiny muted text with an optional link that opens
 * in a new tab. Stored as a self-describing <p data-credit-line> so it round-
 * trips through HTML (source of truth = the data-* attrs).
 *
 * Insert with: editor.chain().focus().insertContent({ type: "creditLine", attrs }).run()
 */
export const CreditLine = Node.create({
  name: "creditLine",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      text: { default: "" },
      href: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "p[data-credit-line]",
        getAttrs: (el) => {
          const e = el as HTMLElement;
          return {
            text: e.getAttribute("data-text") || e.textContent || "",
            href: e.getAttribute("data-href") || e.querySelector("a")?.getAttribute("href") || "",
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const { text, href } = node.attrs as Record<string, string>;
    const inner = href
      ? ["a", { href, target: "_blank", rel: "noreferrer noopener" }, text || href]
      : text || "";

    return [
      "p",
      { "data-credit-line": "", "data-text": text, "data-href": href, class: "photo-credit" },
      inner,
    ] as unknown as readonly [string, Record<string, unknown>, ...unknown[]];
  },
});
