import { ApiError } from "@/lib/api";

const JPEG_DATA_URL_PREFIX = "data:image/jpeg;base64,";
const MAX_AVATAR_BYTES = 600 * 1024;
const MAX_AVATAR_DIMENSION = 4096;

function jpegDimensions(buffer: Buffer): { width: number; height: number } | null {
  let offset = 2;

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    if (marker === undefined) return null;
    offset += 2;

    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }

    if (offset + 2 > buffer.length) return null;
    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) return null;

    const isStartOfFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);

    if (isStartOfFrame) {
      if (length < 7) return null;
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }

    offset += length;
  }

  return null;
}

/** Turns the browser-generated square JPEG into a safe buffer for storage. */
export function decodeAvatarDataUrl(image: string): Buffer {
  if (!image.startsWith(JPEG_DATA_URL_PREFIX)) {
    throw new ApiError(422, "Choose a JPG photo.", "INVALID_IMAGE");
  }

  const encoded = image.slice(JPEG_DATA_URL_PREFIX.length);
  const buffer = Buffer.from(encoded, "base64");

  if (buffer.length < 4 || buffer.length > MAX_AVATAR_BYTES) {
    throw new ApiError(422, "Photo is too large. Choose a smaller one.", "IMAGE_TOO_LARGE");
  }

  if (buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
    throw new ApiError(422, "Choose a JPG photo.", "INVALID_IMAGE");
  }

  const dimensions = jpegDimensions(buffer);
  if (
    !dimensions ||
    dimensions.width < 1 ||
    dimensions.height < 1 ||
    dimensions.width > MAX_AVATAR_DIMENSION ||
    dimensions.height > MAX_AVATAR_DIMENSION
  ) {
    throw new ApiError(422, "That photo is too big. Choose a smaller one.", "IMAGE_TOO_LARGE");
  }

  return buffer;
}
