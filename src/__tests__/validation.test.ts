import { describe, it, expect } from "vitest";
import {
  validateFileUpload,
  sanitizeFilename,
  validatePhone,
  validatePassword,
  sanitizeText,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOC_TYPES,
} from "@/lib/validation";

describe("validatePhone", () => {
  it("accepts 080x format", () => {
    expect(validatePhone("08012345678")).toBe(true);
  });

  it("accepts +234 format", () => {
    expect(validatePhone("+2348012345678")).toBe(true);
  });

  it("accepts 234 without plus", () => {
    expect(validatePhone("2348012345678")).toBe(true);
  });

  it("accepts with spaces and dashes", () => {
    expect(validatePhone("080-1234-5678")).toBe(true);
    expect(validatePhone("080 1234 5678")).toBe(true);
  });

  it("rejects too-short numbers", () => {
    expect(validatePhone("0801234")).toBe(false);
  });

  it("rejects non-Nigerian numbers", () => {
    expect(validatePhone("0501234567")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validatePhone("")).toBe(false);
  });
});

describe("validatePassword", () => {
  it("rejects passwords shorter than 12 characters", () => {
    const result = validatePassword("Short1A");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("12 characters");
  });

  it("rejects passwords without uppercase", () => {
    const result = validatePassword("alllowercase1");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("uppercase");
  });

  it("rejects passwords without lowercase", () => {
    const result = validatePassword("ALLUPPERCASE1");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("lowercase");
  });

  it("rejects passwords without a digit", () => {
    const result = validatePassword("NoDigitsHere!");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("number");
  });

  it("accepts valid passwords", () => {
    const result = validatePassword("MyPassword123");
    expect(result.valid).toBe(true);
  });
});

describe("sanitizeFilename", () => {
  it("strips original filename and uses random string", () => {
    const result = sanitizeFilename("my-photo.jpg");
    expect(result).not.toContain("my-photo");
    expect(result).toMatch(/\.(jpg)$/);
  });

  it("handles filenames without extension", () => {
    const result = sanitizeFilename("noext");
    expect(result).toBeTruthy();
  });

  it("strips dangerous characters from extension", () => {
    const result = sanitizeFilename("file.j%pg");
    expect(result).not.toContain("%");
  });
});

describe("sanitizeText", () => {
  it("trims whitespace", () => {
    expect(sanitizeText("  hello  ")).toBe("hello");
  });

  it("collapses multiple spaces", () => {
    expect(sanitizeText("too   many   spaces")).toBe("too many spaces");
  });
});

describe("validateFileUpload", () => {
  function makeFile(name: string, type: string, size: number): File {
    const buffer = new ArrayBuffer(size);
    return new File([buffer], name, { type });
  }

  it("accepts valid JPEG image", () => {
    const file = makeFile("photo.jpg", "image/jpeg", 1024);
    expect(validateFileUpload(file, ALLOWED_IMAGE_TYPES).valid).toBe(true);
  });

  it("rejects invalid MIME type", () => {
    const file = makeFile("script.js", "application/javascript", 100);
    const result = validateFileUpload(file, ALLOWED_IMAGE_TYPES);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid file type");
  });

  it("rejects mismatched extension", () => {
    const file = makeFile("photo.exe", "image/jpeg", 1024);
    const result = validateFileUpload(file, ALLOWED_IMAGE_TYPES);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid file extension");
  });

  it("rejects files over size limit", () => {
    const file = makeFile("big.jpg", "image/jpeg", 11 * 1024 * 1024);
    const result = validateFileUpload(file, ALLOWED_IMAGE_TYPES);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("too large");
  });

  it("rejects empty files", () => {
    const file = makeFile("empty.jpg", "image/jpeg", 0);
    const result = validateFileUpload(file, ALLOWED_IMAGE_TYPES);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("empty");
  });

  it("accepts PDF for document types", () => {
    const file = makeFile("doc.pdf", "application/pdf", 1024);
    expect(validateFileUpload(file, ALLOWED_DOC_TYPES).valid).toBe(true);
  });
});
