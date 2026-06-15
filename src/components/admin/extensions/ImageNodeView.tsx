import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";

/**
 * Editor-only rendering of a body image: shows the image at its real occupied
 * size and, when selected, draws a boundary outline plus four corner control
 * points so the author can see exactly how much space the photo takes. This
 * only affects how the node looks inside the editor — the saved HTML still
 * comes from the node's renderHTML, so the public post is unchanged.
 */
const DOT = "absolute h-2 w-2 rounded-[1px] bg-accent ring-1 ring-white shadow";

export function ImageNodeView({ node, selected }: NodeViewProps) {
  const width = (node.attrs.width as string | null) || "auto";
  const align = node.attrs.align as string | null;
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
    </NodeViewWrapper>
  );
}
