/**
 * אופטימיזציית תמונה: כיווץ לגודל מקסימלי (ברירת מחדל 30KB).
 * מחזיר buffer בפורמט WebP (או JPEG אם WebP נכשל) והרחבה מתאימה.
 */

const sharp = require("sharp");

const MAX_BYTES = 30 * 1024; // 30KB
const MAX_WIDTH = 600;
const MAX_HEIGHT = 600;

/**
 * @param {Buffer | ArrayBuffer | Uint8Array} input - קלט תמונה
 * @param {number} maxBytes - גודל מקסימלי בבייטים (ברירת מחדל 30KB)
 * @returns {Promise<{ buffer: Buffer, ext: string }>}
 */
async function optimizeImage(input, maxBytes = MAX_BYTES) {
  const buf = Buffer.isBuffer(input)
    ? input
    : Buffer.from(input instanceof ArrayBuffer ? input : input.buffer);

  let pipeline = sharp(buf)
    .rotate() // תיקון EXIF orientation
    .resize(MAX_WIDTH, MAX_HEIGHT, { fit: "inside", withoutEnlargement: true });

  // ננסה קודם WebP (איכות טובה יותר בגודל קטן)
  for (const attempt of [
    { format: "webp", options: { quality: 75 } },
    { format: "webp", options: { quality: 60 } },
    { format: "webp", options: { quality: 45 } },
    { format: "webp", options: { quality: 30 } },
    { format: "jpeg", options: { quality: 80, mozjpeg: true } },
    { format: "jpeg", options: { quality: 60, mozjpeg: true } },
    { format: "jpeg", options: { quality: 40, mozjpeg: true } },
    { format: "jpeg", options: { quality: 25, mozjpeg: true } },
  ]) {
    const clone = pipeline.clone();
    const out =
      attempt.format === "webp"
        ? await clone.webp(attempt.options).toBuffer({ resolveWithObject: true })
        : await clone.jpeg(attempt.options).toBuffer({ resolveWithObject: true });

    if (out.info.size <= maxBytes) {
      return {
        buffer: out.data,
        ext: attempt.format === "webp" ? ".webp" : ".jpg",
      };
    }
  }

  // אם עדיין גדול מדי – נקטין מידות ונרד באיכות עד מתחת ל־maxBytes
  const meta = await sharp(buf).metadata();
  let w = Math.min(meta.width || MAX_WIDTH, 400);
  let h = Math.min(meta.height || MAX_HEIGHT, 400);
  for (const q of [25, 20, 15, 10]) {
    const resized = sharp(buf)
      .rotate()
      .resize(w, h, { fit: "inside", withoutEnlargement: true });
    const out = await resized
      .webp({ quality: q })
      .toBuffer({ resolveWithObject: true });
    if (out.info.size <= maxBytes) {
      return { buffer: out.data, ext: ".webp" };
    }
  }
  // קיצון: מידות קטנות מאוד
  w = Math.min(w, 200);
  h = Math.min(h, 200);
  const final = await sharp(buf)
    .rotate()
    .resize(w, h, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 10 })
    .toBuffer({ resolveWithObject: true });
  return {
    buffer: final.data,
    ext: ".webp",
  };
}

module.exports = { optimizeImage, MAX_IMAGE_BYTES: MAX_BYTES };
