import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";

/**
 * Editor-only rendering of a body image: shows the image at its real occupied
 * size and, when selected, draws a boundary outline plus four corner control
 * points so the author can see how much space the photo takes. If the image
 * has a credit, a small caption is shown underneath. This only affects how the
 * node looks inside the editor — the saved HTML comes from renderHTML, so the
 * public post is unchanged.
 */
const DOT = "absolute h-2 w-2 rounded-[1px] bg-accent ring-1 ring-white shadow";

export function ImageNodeView({ node, selected }: NodeViewProps) {
  const width = (node.attrs.width as string | null) || "auto";
  const align = node.attrs.align as string | null;
  const credit = (node.attrs.credit as string) || "";
  const creditHref = (node.attrs.creditHref as string) || "";
  const textAlign = align === "center" ? "center" : align === "right" ? "right" : "left";

  return (
    <NodeViewWrapper as="div" className="my-3" style={{ textAlign }}>
      <span
        className="relative inline-block max-w-full align-top"
        style={{
          width,
          lineHeight: 0,
          outline: selected ? "2px solid var(--accent)" : undefined,
          outlineOffset: 2,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={node.attrs.src as string}
          alt={(node.attrs.alt as string) ?? ""}
          title={(node.attrs.title as string) ?? undefined}
          className="block h-auto w-full rounded-[4px]"
          style={{ margin: 0 }}
          draggable={false}
        />
        {selected && (
          <>
            <span className={DOT} style={{ top: -5, left: -5 }} />
            <span className={DOT} style={{ top: -5, right: -5 }} />
            <span className={DOT} style={{ bottom: -5, left: -5 }} />
            <span className={DOT} style={{ bottom: -5, right: -5 }} />
          </>
        )}
      </span>
      {credit && (
        <figcaption className="mt-1 text-xs text-slate-500" style={{ textAlign }} contentEditable={false}>
          {creditHref ? (
            <a href={creditHref} target="_blank" rel="noreferrer noopener" className="text-slate-500 no-underline transition-colors hover:text-gold">
              {credit}
            </a>
          ) : (
            credit
          )}
        </figcaption>
      )}
    </NodeViewWrapper>
  );
}
