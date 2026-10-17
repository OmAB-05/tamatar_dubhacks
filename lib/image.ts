import { AppError } from "@/lib/errors";

// The UI downscales to 1568 px on the long edge (context.md §5); allow some slack.
export const MAX_IMAGE_BYTES = 2_800_000; // decoded; base64 adds ~1/3, staying under Vercel's 4.5 MB
export const MAX_IMAGE_EDGE = 2048;
const MIN_IMAGE_EDGE = 64;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

export type ValidImage = { base64: string; width: number; height: number; bytes: number };

export function decodePng(imageBase64: string): ValidImage {
  if (imageBase64.startsWith("data:")) {
    throw new AppError("invalid_request", "imageBase64 must not include a data: prefix");
  }
  // Upper bound on decoded size before allocating anything.
  if ((imageBase64.length * 3) / 4 > MAX_IMAGE_BYTES + 3) {
    throw new AppError("payload_too_large", `Image exceeds ${MAX_IMAGE_BYTES} bytes`);
  }
  if (imageBase64.length % 4 !== 0 || !BASE64_RE.test(imageBase64)) {
    throw new AppError("invalid_request", "imageBase64 is not valid base64");
  }
  const buf = Buffer.from(imageBase64, "base64");
  if (buf.length < 33 || !PNG_SIGNATURE.every((b, i) => buf[i] === b)) {
    throw new AppError("invalid_request", "Image is not a PNG");
  }
  // IHDR is always the first chunk: width/height are big-endian u32 at bytes 16 and 20.
  if (buf.toString("ascii", 12, 16) !== "IHDR") {
    throw new AppError("invalid_request", "PNG is missing its IHDR header");
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  if (Math.max(width, height) > MAX_IMAGE_EDGE) {
    throw new AppError("payload_too_large", `Image edge exceeds ${MAX_IMAGE_EDGE} px`);
  }
  if (Math.min(width, height) < MIN_IMAGE_EDGE) {
    throw new AppError("invalid_request", `Image edge is below ${MIN_IMAGE_EDGE} px`);
  }
  return { base64: imageBase64, width, height, bytes: buf.length };
}
