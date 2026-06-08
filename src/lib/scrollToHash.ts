/**
 * Smooth-scroll to an in-page anchor target.
 *
 * Plain `<a href="#id">` / Next <Link> only scroll when the URL hash actually
 * changes — clicking the same anchor twice (hash already set) is a no-op. This
 * scrolls imperatively so it works every time, and keeps the hash in sync
 * without adding a history entry. Respects `scroll-margin-top` (scroll-mt-*).
 *
 * Pass an href like "#how-it-works" or "/#how-it-works". Returns true if it
 * handled the scroll (caller should preventDefault); false if the target isn't
 * on the current page (let the link navigate normally — the hash scrolls on load).
 */
export function scrollToHash(href: string): boolean {
  const hashIndex = href.indexOf("#");
  if (hashIndex === -1) return false;

  const id = href.slice(hashIndex + 1);
  if (!id) return false;

  const el = document.getElementById(id);
  if (!el) return false;

  el.scrollIntoView({ behavior: "smooth", block: "start" });
  history.replaceState(null, "", `#${id}`);
  return true;
}
