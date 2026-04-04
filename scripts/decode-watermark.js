#!/usr/bin/env node
/**
 * Unity Stream — LSB Watermark Decoder
 *
 * Usage:
 *   node scripts/decode-watermark.js <path-to-image.png>
 *
 * Given a PNG or JPEG screenshot captured from a Unity Stream session,
 * reads the LSB steganographic payload embedded at pixel offsets (4, 10)
 * and prints the userId that was logged in during that session.
 *
 * Requires:  npm install jimp
 * Run from the project root directory.
 *
 * Example:
 *   node scripts/decode-watermark.js ~/Desktop/leaked-frame.png
 *   → Extracted userId: admin
 */

const path = require('path');

async function main() {
  const imagePath = process.argv[2];
  if (!imagePath) {
    console.error('Usage: node scripts/decode-watermark.js <image.png>');
    process.exit(1);
  }

  let Jimp;
  try {
    Jimp = require('jimp');
  } catch {
    console.error('Error: jimp not installed. Run: npm install jimp');
    process.exit(1);
  }

  const absPath = path.resolve(imagePath);
  console.log(`Reading: ${absPath}`);

  let image;
  try {
    image = await Jimp.read(absPath);
  } catch (err) {
    console.error(`Failed to open image: ${err.message}`);
    process.exit(1);
  }

  const { width, height } = image.bitmap;
  console.log(`Image size: ${width}×${height}`);

  // ── Match the same patch coordinates as embedLSB() ──────────────────
  const startX = 4;
  const startY = 10;

  /**
   * Get the red channel value of pixel (x, y).
   * Jimp stores pixels as RGBA 32-bit integers.
   */
  function getRed(x, y) {
    const px = image.getPixelColor(x, y);
    return (px >>> 24) & 0xff; // Jimp RGBA: R is bits 31-24
  }

  // ── Read 16-bit length header (2 bytes = 16 bits = 16 pixels) ───────
  let lenBits = '';
  for (let bit = 0; bit < 16; bit++) {
    const px = startX + bit;
    const py = startY;
    if (px >= width || py >= height) {
      console.error('Image too small — no watermark found at expected offset.');
      process.exit(1);
    }
    lenBits += (getRed(px, py) & 1).toString();
  }

  const highByte  = parseInt(lenBits.slice(0, 8), 2);
  const lowByte   = parseInt(lenBits.slice(8, 16), 2);
  const payloadLen = highByte * 256 + lowByte;

  if (payloadLen === 0 || payloadLen > 512) {
    console.log('No valid LSB watermark detected in this image.');
    console.log('(payload length header read as', payloadLen, ')');
    process.exit(0);
  }

  console.log(`Payload length: ${payloadLen} bytes`);

  // ── Read payloadLen bytes ────────────────────────────────────────────
  const resultBytes = new Uint8Array(payloadLen);

  for (let i = 0; i < payloadLen; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) {
      const bitIndex = (2 + i) * 8 + b;
      // Pixels are laid out linearly: bit → (startX + bitIndex, startY)
      const px = startX + bitIndex;
      const py = startY;
      if (px >= width) {
        console.error('Image too narrow to hold full payload.');
        process.exit(1);
      }
      byte = (byte << 1) | (getRed(px, py) & 1);
    }
    resultBytes[i] = byte;
  }

  let userId;
  try {
    userId = new TextDecoder().decode(resultBytes);
  } catch {
    console.log('Failed to decode payload as UTF-8. Image may be compressed.');
    process.exit(1);
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Extracted userId: ${userId}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('Cross-reference with server session logs to confirm.');
}

main();
