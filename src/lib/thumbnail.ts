/**
 * Real deep-sky thumbnail from CDS hips2fits (DSS2 color survey).
 * Returns an image URL usable directly as an <img src>.
 */
export function skyThumb(ra: number, dec: number, w = 320, h = 200, fovDeg = 1.8) {
  return (
    `https://alasky.cds.unistra.fr/hips-image-services/hips2fits` +
    `?hips=CDS/P/DSS2/color&width=${w}&height=${h}&fov=${fovDeg}` +
    `&projection=TAN&coordsys=icrs&ra=${ra}&dec=${dec}&format=jpg`
  );
}
