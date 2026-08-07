export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_LISTING_PHOTOS = 8;

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export const ALLOWED_DOC_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  "application/pdf",
];

// File extension allowlists (defense-in-depth alongside MIME check)
const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const ALLOWED_DOC_EXTENSIONS = [...ALLOWED_IMAGE_EXTENSIONS, ".pdf"];

function getFileExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot).toLowerCase() : "";
}

export function validateFileUpload(
  file: File,
  allowedTypes: string[],
  maxSize: number = MAX_FILE_SIZE,
): { valid: boolean; error?: string } {
  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    const allowed = allowedTypes
      .map((t) => t.split("/")[1]?.toUpperCase() ?? t)
      .join(", ");
    return { valid: false, error: `Invalid file type. Allowed: ${allowed}` };
  }

  // Check file extension matches (prevents MIME spoofing)
  const ext = getFileExtension(file.name);
  const allowedExts = allowedTypes.includes("application/pdf")
    ? ALLOWED_DOC_EXTENSIONS
    : ALLOWED_IMAGE_EXTENSIONS;
  if (!allowedExts.includes(ext)) {
    return { valid: false, error: `Invalid file extension: ${ext}` };
  }

  // Check file size
  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024));
    return { valid: false, error: `File too large. Maximum size is ${maxMB} MB.` };
  }

  // Reject empty files
  if (file.size === 0) {
    return { valid: false, error: "File is empty." };
  }

  return { valid: true };
}

/**
 * Generates a safe filename for storage uploads.
 * Strips the original filename and uses a UUID-like random string
 * to prevent path traversal and encoding issues.
 */
export function sanitizeFilename(originalName: string): string {
  const ext = getFileExtension(originalName);
  const safeExt = ext.replace(/[^a-z0-9.]/g, "");
  const random = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  return `${random}${safeExt}`;
}

/**
 * Validates a Nigerian phone number.
 * Accepts: 08012345678, +2348012345678, 2348012345678, 0801 234 5678
 */
export function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, "");
  // Nigerian mobile: 070x, 080x, 081x, 090x, 091x
  return /^(\+?234|0)[789][01]\d{8}$/.test(cleaned);
}

export function sanitizeText(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

/**
 * Validates password strength.
 * Requires: 12+ characters, at least one uppercase, one lowercase, one digit.
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 12) {
    return { valid: false, error: "Password must be at least 12 characters." };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one uppercase letter." };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one lowercase letter." };
  }
  if (!/\d/.test(password)) {
    return { valid: false, error: "Password must contain at least one number." };
  }
  return { valid: true };
}
