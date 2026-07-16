/**
 * FITS light frame -> stretched JPEG, server-side, Node-only (uses `sharp`).
 *
 * The numbers are owned by code end to end: we decode the raw FITS, neutralise
 * the Bayer grid with a 2x2 superpixel bin, apply the standard PixInsight STF
 * auto-stretch (median + MAD driven midtones transfer), then hand an 8-bit
 * grayscale buffer to sharp for resize + JPEG encode. No Python, no astropy.
 *
 * This produces an honest "this came off the scope" preview of a single sub,
 * not a processed integration. Mono is correct for a dual-narrowband sub.
 */
import sharp from "sharp";

export type RenderMode = "mono" | "color";

export interface FitsToJpegOptions {
  /** Longest-edge width of the output JPEG. */
  maxWidth?: number;
  /** JPEG quality 1-100. */
  quality?: number;
  /** Target background for the STF stretch (0..1). Lower = darker sky. */
  targetBg?: number;
  /** Shadow clip in MADN units (negative pushes the black point below median). */
  shadowsClip?: number;
  /** "mono" = luminance; "color" = Bayer superpixel debayer to RGB. */
  mode?: RenderMode;
}

interface FitsHeader {
  width: number;
  height: number;
  bitpix: number;
  bzero: number;
  bscale: number;
  dataOffset: number;
  /** CFA pattern of the top-left 2x2 (e.g. RGGB); empty if not a color sensor. */
  bayer: string;
}

const BLOCK = 2880;
const CARD = 80;

/** Parse the primary HDU header: scan 80-char cards until END. */
function parseFitsHeader(buf: Buffer): FitsHeader {
  const h: Record<string, string> = {};
  let endCard = -1;
  const maxCards = Math.floor(buf.length / CARD);
  for (let i = 0; i < maxCards; i++) {
    const card = buf.toString("ascii", i * CARD, i * CARD + CARD);
    const key = card.slice(0, 8).trim();
    if (key === "END") { endCard = i; break; }
    if (card[8] === "=") h[key] = card.slice(9).split("/")[0].trim();
  }
  if (endCard < 0) throw new Error("FITS: no END card found in header");

  const num = (k: string, dflt: number) => (h[k] !== undefined ? Number(h[k]) : dflt);
  const naxis = num("NAXIS", 0);
  if (naxis < 2) throw new Error(`FITS: unsupported NAXIS=${naxis}`);

  const headerBytes = Math.ceil(((endCard + 1) * CARD) / BLOCK) * BLOCK;
  const bayer = (h["BAYERPAT"] ?? "").replace(/'/g, "").trim().toUpperCase();
  return {
    width: num("NAXIS1", 0),
    height: num("NAXIS2", 0),
    bitpix: num("BITPIX", 0),
    bzero: num("BZERO", 0),
    bscale: num("BSCALE", 1),
    dataOffset: headerBytes,
    bayer,
  };
}

/** Read one physical pixel value (raw*BSCALE + BZERO) for supported BITPIX. */
function makeReader(buf: Buffer, hdr: FitsHeader): { read: (i: number) => number; bytesPerPx: number } {
  const { bitpix, bzero, bscale, dataOffset } = hdr;
  switch (bitpix) {
    case 16:
      return { bytesPerPx: 2, read: (i) => buf.readInt16BE(dataOffset + i * 2) * bscale + bzero };
    case 8:
      return { bytesPerPx: 1, read: (i) => buf.readUInt8(dataOffset + i) * bscale + bzero };
    case 32:
      return { bytesPerPx: 4, read: (i) => buf.readInt32BE(dataOffset + i * 4) * bscale + bzero };
    case -32:
      return { bytesPerPx: 4, read: (i) => buf.readFloatBE(dataOffset + i * 4) * bscale + bzero };
    case -64:
      return { bytesPerPx: 8, read: (i) => buf.readDoubleBE(dataOffset + i * 8) * bscale + bzero };
    default:
      throw new Error(`FITS: unsupported BITPIX=${bitpix}`);
  }
}

/** Midtones transfer function (PixInsight MTF). */
function mtf(m: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  if (x === m) return 0.5;
  return ((m - 1) * x) / ((2 * m - 1) * x - m);
}

export interface StretchedImage {
  /** 8-bit interleaved pixels, row-major. */
  data: Buffer;
  width: number;
  height: number;
  channels: 1 | 3;
}

/** Build a value -> 0..255 mapper via the PixInsight STF on one channel. */
function stfMapper(src: Float32Array, targetBg: number, shadowsClip: number): (v: number) => number {
  const n = src.length;
  const step = Math.max(1, Math.floor(n / 200_000));
  const sample: number[] = [];
  for (let i = 0; i < n; i += step) sample.push(src[i]);
  sample.sort((p, q) => p - q);
  const median = sample[sample.length >> 1];
  const devs = sample.map((v) => Math.abs(v - median)).sort((p, q) => p - q);
  const mad = devs[devs.length >> 1] || 1;

  const lo = sample[0];
  const hi = sample[sample.length - 1];
  const range = Math.max(1, hi - lo);
  const medN = (median - lo) / range;
  const madN = (1.4826 * mad) / range;

  const c0 = Math.min(Math.max(medN + shadowsClip * madN, 0), 1);
  const m = mtf(targetBg, medN - c0);
  const denom = Math.max(1e-6, 1 - c0);
  return (v) => {
    const p = (v - lo) / range;
    const x = Math.min(1, Math.max(0, (p - c0) / denom));
    return Math.round(mtf(m, x) * 255);
  };
}

/**
 * Decode a raw FITS light and return the auto-stretched 8-bit image (before any
 * resize/encode). One 2x2 superpixel pass per Bayer quad yields both a
 * luminance channel and the R/G/B channels; `mode` selects which is returned.
 * "mono" is correct for a dual-narrowband sub; "color" debayers to real RGB.
 */
export function stretchFitsLight(fits: Buffer, opts: FitsToJpegOptions = {}): StretchedImage {
  const { targetBg = 0.25, shadowsClip = -2.8, mode = "mono" } = opts;

  const hdr = parseFitsHeader(fits);
  const { width, height } = hdr;
  if (!width || !height) throw new Error("FITS: missing image dimensions");
  const { read } = makeReader(fits, hdr);

  const color = mode === "color" && hdr.bayer.length === 4;
  // Which of the 4 quad samples (TL, TR, BL, BR) feed R / G / B, from BAYERPAT.
  const pat = color ? hdr.bayer : "RGGB";
  const rIdx: number[] = [], gIdx: number[] = [], bIdx: number[] = [];
  for (let i = 0; i < 4; i++) {
    if (pat[i] === "R") rIdx.push(i);
    else if (pat[i] === "B") bIdx.push(i);
    else gIdx.push(i);
  }
  const avg = (q: number[], idx: number[]) => { let s = 0; for (const i of idx) s += q[i]; return s / idx.length; };

  const bw = width >> 1;
  const bh = height >> 1;
  const N = bw * bh;
  const gray = new Float32Array(N);
  const r = color ? new Float32Array(N) : null;
  const g = color ? new Float32Array(N) : null;
  const b = color ? new Float32Array(N) : null;

  for (let by = 0; by < bh; by++) {
    const y0 = by * 2;
    for (let bx = 0; bx < bw; bx++) {
      const x0 = bx * 2;
      const q = [
        read(y0 * width + x0),
        read(y0 * width + x0 + 1),
        read((y0 + 1) * width + x0),
        read((y0 + 1) * width + x0 + 1),
      ];
      const j = by * bw + bx;
      gray[j] = (q[0] + q[1] + q[2] + q[3]) * 0.25;
      if (color) {
        r![j] = avg(q, rIdx);
        g![j] = avg(q, gIdx);
        b![j] = avg(q, bIdx);
      }
    }
  }

  if (!color) {
    const map = stfMapper(gray, targetBg, shadowsClip);
    const out = Buffer.allocUnsafe(N);
    for (let i = 0; i < N; i++) out[i] = map(gray[i]);
    return { data: out, width: bw, height: bh, channels: 1 };
  }

  // Per-channel STF neutralises the background and balances color automatically.
  // A green-neutral pass (SCNR average-neutral: G <= (R+B)/2) removes the green
  // speckle OSC data shows after an unlinked stretch.
  const mr = stfMapper(r!, targetBg, shadowsClip);
  const mg = stfMapper(g!, targetBg, shadowsClip);
  const mb = stfMapper(b!, targetBg, shadowsClip);
  const out = Buffer.allocUnsafe(N * 3);
  for (let i = 0; i < N; i++) {
    const R = mr(r![i]);
    const B = mb(b![i]);
    const G = Math.min(mg(g![i]), (R + B) >> 1);
    out[i * 3] = R;
    out[i * 3 + 1] = G;
    out[i * 3 + 2] = B;
  }
  return { data: out, width: bw, height: bh, channels: 3 };
}

/** Encode a stretched image to a JPEG at a given max width. */
export function encodeJpeg(img: StretchedImage, maxWidth: number, quality = 82): Promise<Buffer> {
  return sharp(img.data, { raw: { width: img.width, height: img.height, channels: img.channels } })
    .resize({ width: maxWidth, withoutEnlargement: true })
    .jpeg({ quality })
    .toBuffer();
}

/** Convenience: decode a raw FITS light straight to a single stretched JPEG. */
export function fitsLightToJpeg(fits: Buffer, opts: FitsToJpegOptions = {}): Promise<Buffer> {
  return encodeJpeg(stretchFitsLight(fits, opts), opts.maxWidth ?? 1200, opts.quality ?? 82);
}
