/**
 * Links to AstroBin showing a deep-sky object captured with a telescope like
 * ours. AstroBin's search is full-text, so we combine the catalog designation
 * (e.g. "M 42") with the scope's short name to surface comparable images.
 */

// Short, searchable name of our optical tube (from the William Optics RedCat 91 WIFD).
export const TELESCOPE_SEARCH = "RedCat 91";

export function astrobinUrl(catalog: string): string {
  const q = `${catalog} ${TELESCOPE_SEARCH}`;
  return `https://www.astrobin.com/search/?q=${encodeURIComponent(q)}`;
}
