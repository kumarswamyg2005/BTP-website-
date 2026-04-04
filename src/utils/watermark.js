/**
 * Unity Stream — Invisible Watermark Utilities
 *
 * Visual watermark: draws 3 semi-transparent text stamps at random
 * positions/angles on a canvas element overlay.
 *
 * Steganographic watermark: encodes userId into the LSB of specific
 * pixels in a captured video frame, producing an invisible data payload
 * that survives screen recording. Use decode-watermark.js to extract.
 */

// ── Visual watermark ──────────────────────────────────────────────────────

/**
 * Draw 3 invisible watermark stamps on the given canvas.
 * Called on mount and every 8-12 seconds with a random interval.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {string} userId  — must come from auth context, never a URL param
 */
export function drawWatermark(canvas, userId) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const timestamp = new Date().toISOString();
  const text = `USR:${userId} | ${timestamp} | UNITY STREAM`;

  // Draw 3 stamps at independent random positions so cropping is impossible
  for (let i = 0; i < 3; i++) {
    const x     = Math.random() * (canvas.width  * 0.6) + canvas.width  * 0.1;
    const y     = Math.random() * (canvas.height * 0.6) + canvas.height * 0.2;
    const angle = (Math.random() * 50 - 25) * (Math.PI / 180);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.font         = '14px monospace';
    ctx.fillStyle    = 'rgba(255, 255, 255, 0.05)'; // 0.05 opacity — invisible to naked eye
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }
}

// ── LSB steganographic watermark ─────────────────────────────────────────

/**
 * Encode userId into the least-significant bit of red channel pixels
 * at a fixed grid pattern in the top-left 200×200 region of the canvas.
 *
 * Pixel positions are deterministic (row 10 + bit index * 3) so the
 * decoder knows exactly where to look without a key.
 *
 * Call this after drawImage(videoElement) has rendered a frame.
 *
 * @param {HTMLCanvasElement} canvas  — must contain a full video frame
 * @param {string} userId
 */
export function embedLSB(canvas, userId) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Encode userId as UTF-8 binary string, prefixed with length (2 bytes)
  const bytes   = new TextEncoder().encode(userId);
  const payload = new Uint8Array(2 + bytes.length);
  payload[0] = (bytes.length >> 8) & 0xff;
  payload[1] =  bytes.length       & 0xff;
  payload.set(bytes, 2);

  // Total bits to embed
  const totalBits = payload.length * 8;

  // Work on a 200×200 patch starting at (4, 10) — well inside any frame
  const startX = 4;
  const startY = 10;
  const patchW = 200;

  const imageData = ctx.getImageData(startX, startY, patchW, patchW);
  const d = imageData.data; // RGBA flat array

  for (let bit = 0; bit < totalBits; bit++) {
    const byteIdx = Math.floor(bit / 8);
    const bitIdx  = 7 - (bit % 8);
    const bitVal  = (payload[byteIdx] >> bitIdx) & 1;

    // Each bit lives in the red channel (offset 0) of pixel `bit`
    const pixelOffset = bit * 4; // RGBA stride
    if (pixelOffset + 1 >= d.length) break;

    // Clear LSB, then set it
    d[pixelOffset] = (d[pixelOffset] & 0xfe) | bitVal;
  }

  ctx.putImageData(imageData, startX, startY);
}

/**
 * Read the LSB payload from a canvas that contains a captured frame.
 * Returns the userId string, or null if decoding fails.
 *
 * @param {HTMLCanvasElement} canvas
 * @returns {string|null}
 */
export function extractLSB(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const startX = 4;
  const startY = 10;
  const patchW = 200;
  const imageData = ctx.getImageData(startX, startY, patchW, patchW);
  const d = imageData.data;

  // Read first 16 bits → length header (2 bytes)
  let lenBits = '';
  for (let bit = 0; bit < 16; bit++) {
    lenBits += (d[bit * 4] & 1).toString();
  }
  const payloadLen = parseInt(lenBits.slice(0, 8), 2) * 256
                   + parseInt(lenBits.slice(8, 16), 2);

  if (payloadLen === 0 || payloadLen > 512) return null;

  // Read payloadLen bytes
  const result = new Uint8Array(payloadLen);
  for (let i = 0; i < payloadLen; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) {
      const bit = (2 + i) * 8 + b;
      byte = (byte << 1) | (d[bit * 4] & 1);
    }
    result[i] = byte;
  }

  try {
    return new TextDecoder().decode(result);
  } catch {
    return null;
  }
}
