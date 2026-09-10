/**
 * Renders a JSON-LD structured-data block. Server-safe: emits a static
 * <script type="application/ld+json"> so crawlers and LLMs read it without JS.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // Structured data is trusted, app-generated content (no user input in the
      // graph builders), so this is safe.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
