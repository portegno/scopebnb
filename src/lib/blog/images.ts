import "server-only";

import sharp from "sharp";

// A row/column counts as a "black bar" only if EVERY pixel in it is essentially
// pure black. Astrophotography has stars/nebulosity, so real photo edges break
// this uniformity and are never trimmed — only baked-in pillarbox/letterbox bars.
const BLACK_MAX = 16;

/**
 * Strip uniform pure-black bars (pillarbox/letterbox) from the edges of an
 * image. Safe for dark astrophotos: it only removes edges where every pixel is
 * black, so star fields and nebulosity are left intact. Returns the original
 * buffer unchanged when there is nothing to trim (or on any failure).
 */
export async function trimBlackBars(buffer: Buffer): Promise<Buffer> {
  try {
    const { data, info } = await sharp(buffer, { failOn: "none" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { width: w, height: h, channels: ch } = info;

    const dark = (i: number) => Math.max(data[i], data[i + 1], data[i + 2]) < BLACK_MAX;
    const colDark = (x: number) => {
      for (let y = 0; y < h; y += 1) if (!dark((y * w + x) * ch)) return false;
      return true;
    };
    const rowDark = (y: number) => {
      for (let x = 0; x < w; x += 1) if (!dark((y * w + x) * ch)) return false;
      return true;
    };

    let left = 0;
    while (left < w && colDark(left)) left += 1;
    let right = 0;
    while (right < w - left && colDark(w - 1 - right)) right += 1;
    let top = 0;
    while (top < h && rowDark(top)) top += 1;
    let bottom = 0;
    while (bottom < h - top && rowDark(h - 1 - bottom)) bottom += 1;

    if (left + right + top + bottom === 0) return buffer;
    const cw = w - left - right;
    const chh = h - top - bottom;
    if (cw <= 0 || chh <= 0) return buffer;

    return await sharp(buffer, { failOn: "none" })
      .extract({ left, top, width: cw, height: chh })
      .toBuffer();
  } catch {
    return buffer; // never block an upload on processing
  }
}
