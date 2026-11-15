import { describe, expect, it } from "vitest";
import { decodeAvatarDataUrl } from "@/lib/avatar";
import { avatarUrlFor, parseAvatarUrl } from "@/lib/storage";

const REAL_JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoLCw4NDhwQEBw7KCIoOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozv/wAARCAAIAAgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwCtRRRX3Byn/9k=";

const PREFIX = "data:image/jpeg;base64,";

function syntheticJpeg(width: number, height: number): Buffer {
  return Buffer.from([
    0xff, 0xd8, // SOI
    0xff, 0xc0, 0x00, 0x11, 0x08, // SOF0, length 17, precision 8
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
    0xff, 0xd9, // EOI
  ]);
}

describe("decodeAvatarDataUrl", () => {
  it("accepts a real JPEG data URL", () => {
    const buffer = decodeAvatarDataUrl(`${PREFIX}${REAL_JPEG_BASE64}`);
    expect(buffer.length).toBeGreaterThan(100);
    expect(buffer[0]).toBe(0xff);
    expect(buffer[1]).toBe(0xd8);
  });

  it("rejects non-JPEG payloads", () => {
    expect(() => decodeAvatarDataUrl("data:image/png;base64,iVBORw0KGgo=")).toThrow(
      "Choose a JPG photo.",
    );
  });

  it("rejects invalid JPEG bytes", () => {
    expect(() => decodeAvatarDataUrl(`${PREFIX}bm90LWEtanBlZw==`)).toThrow("Choose a JPG photo.");
  });

  it("rejects huge dimensions before they reach friends", () => {
    const huge = syntheticJpeg(5000, 5000).toString("base64");
    expect(() => decodeAvatarDataUrl(`${PREFIX}${huge}`)).toThrow("That photo is too big.");
  });

  it("accepts a normal square JPEG", () => {
    const square = syntheticJpeg(320, 320).toString("base64");
    expect(decodeAvatarDataUrl(`${PREFIX}${square}`).length).toBeGreaterThan(4);
  });
});

describe("avatar URL helpers", () => {
  it("round-trips the app avatar URL", () => {
    const version = "a".repeat(24);
    const url = avatarUrlFor("clx123", version);
    expect(url).toBe(`/api/avatars/clx123?v=${version}`);
    expect(parseAvatarUrl(url)).toEqual({ userId: "clx123", version });
  });

  it("ignores external or malformed avatar URLs", () => {
    expect(parseAvatarUrl("https://example.com/avatar.jpg")).toBeNull();
    expect(parseAvatarUrl("/api/avatars/clx123?v=short")).toBeNull();
    expect(parseAvatarUrl(null)).toBeNull();
  });
});
