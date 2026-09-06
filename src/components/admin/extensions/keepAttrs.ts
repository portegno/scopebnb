import { Extension } from "@tiptap/core";

/**
 * Keeps the attributes an email layout depends on.
 *
 * TipTap drops every attribute it has not been told about. That is right for a
 * blog post, where the markup should stay clean, and wrong for a newsletter:
 * the two column blocks are tables with `width` and `valign` on the cells, and
 * every colour and margin lives in a `style`, because email clients ignore
 * stylesheets. Parsed without these, the layout survives as tags and comes back
 * looking like nothing.
 *
 * This does not make the editor a safe place to design an email. It makes the
 * round trip lossless enough that opening one to fix a line does not destroy it.
 */
const CON_ESTILO = [
  "paragraph",
  "heading",
  "image",
  "table",
  "tableRow",
  "tableCell",
  "tableHeader",
];

export const KeepAttrs = Extension.create({
  name: "keepAttrs",

  addGlobalAttributes() {
    return [
      {
        types: CON_ESTILO,
        attributes: {
          style: {
            default: null,
            parseHTML: (el) => el.getAttribute("style"),
            renderHTML: (attrs) => (attrs.style ? { style: attrs.style } : {}),
          },
        },
      },
      {
        // `width`, `align` and `valign` are attributes and not CSS on purpose:
        // Outlook ignores the stylesheet and obeys the attribute, so an email
        // carries both. Losing them collapses a two column row into a stack.
        types: ["table", "tableRow", "tableCell", "tableHeader", "image"],
        attributes: {
          width: {
            default: null,
            parseHTML: (el) => el.getAttribute("width"),
            renderHTML: (attrs) => (attrs.width ? { width: attrs.width } : {}),
          },
          align: {
            default: null,
            parseHTML: (el) => el.getAttribute("align"),
            renderHTML: (attrs) => (attrs.align ? { align: attrs.align } : {}),
          },
          valign: {
            default: null,
            parseHTML: (el) => el.getAttribute("valign"),
            renderHTML: (attrs) => (attrs.valign ? { valign: attrs.valign } : {}),
          },
        },
      },
    ];
  },
});
