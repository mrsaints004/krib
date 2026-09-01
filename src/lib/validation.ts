export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_LISTING_PHOTOS = 8;
export const MAX_PASSWORD_LENGTH = 256;

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

// Shared constants
export const AMENITY_OPTIONS = [
  "Running water",
  "Electricity (prepaid)",
  "Tiled floor",
  "Wardrobe",
  "Ceiling fan",
  "Bathroom (en-suite)",
  "Kitchen",
  "Security gate",
  "Parking space",
  "Study table",
  "Bed frame",
  "Mattress",
];

export const UNIVERSITY_OPTIONS = [
  { code: "FUOYE", label: "Federal University Oye-Ekiti (FUOYE)" },
  { code: "EKSU", label: "Ekiti State University (EKSU)" },
  { code: "FUTES", label: "Federal University of Technology, Akure (FUTES)" },
  { code: "BOUESTI", label: "Bamidele Olumilua University (BOUESTI)" },
] as const;

// File extension allowlists (defense-in-depth alongside MIME check)
const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const ALLOWED_DOC_EXTENSIONS = [...ALLOWED_IMAGE_EXTENSIONS, ".pdf"];

function getFileExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot).toLowerCase() : "";
}

/**
 * Magic byte signatures for file type verification.
 * Checks actual file contents to prevent MIME type spoofing.
 */
const MAGIC_BYTES: Record<string, { offset: number; bytes: number[] }[]> = {
  "image/jpeg": [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  "image/png": [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47] }],
  "image/gif": [
    { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x37] }, // GIF87a
    { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x39] }, // GIF89a
  ],
  "image/webp": [
    { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },
  ],
  "application/pdf": [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }], // %PDF
};

const WEBP_SIGNATURE = [0x57, 0x45, 0x42, 0x50]; // "WEBP"

async function matchesMagicBytes(
  file: File,
  mimeType: string
): Promise<boolean> {
  const signatures = MAGIC_BYTES[mimeType];
  if (!signatures) return true;

  const headerSize = Math.max(
    ...signatures.map((s) => s.offset + s.bytes.length),
    12
  );
  const buffer = new Uint8Array(await file.slice(0, headerSize).arrayBuffer());

  const basicMatch = signatures.some((sig) =>
    sig.bytes.every((byte, i) => buffer[sig.offset + i] === byte)
  );

  if (!basicMatch) return false;

  if (mimeType === "image/webp") {
    return WEBP_SIGNATURE.every((byte, i) => buffer[8 + i] === byte);
  }

  return true;
}

export async function validateFileUpload(
  file: File,
  allowedTypes: string[],
  maxSize: number = MAX_FILE_SIZE,
): Promise<{ valid: boolean; error?: string }> {
  if (!allowedTypes.includes(file.type)) {
    const allowed = allowedTypes
      .map((t) => t.split("/")[1]?.toUpperCase() ?? t)
      .join(", ");
    return { valid: false, error: `Invalid file type. Allowed: ${allowed}` };
  }

  const ext = getFileExtension(file.name);
  const allowedExts = allowedTypes.includes("application/pdf")
    ? ALLOWED_DOC_EXTENSIONS
    : ALLOWED_IMAGE_EXTENSIONS;
  if (!allowedExts.includes(ext)) {
    return { valid: false, error: `Invalid file extension: ${ext}` };
  }

  if (file.size === 0) {
    return { valid: false, error: "File is empty." };
  }

  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024));
    return { valid: false, error: `File too large. Maximum size is ${maxMB} MB.` };
  }

  const magicValid = await matchesMagicBytes(file, file.type);
  if (!magicValid) {
    return { valid: false, error: "File contents do not match the file type. The file may be corrupted or spoofed." };
  }

  return { valid: true };
}

/**
 * Generates a safe filename for storage uploads.
 * Strips the original filename and uses a cryptographically random UUID
 * to prevent path traversal and encoding issues.
 */
export function sanitizeFilename(originalName: string): string {
  const ext = getFileExtension(originalName);
  const safeExt = ext.replace(/[^a-z0-9.]/g, "");
  const random = crypto.randomUUID();
  return `${random}${safeExt}`;
}

/**
 * Validates a Nigerian phone number.
 * Accepts: 08012345678, +2348012345678, 2348012345678, 0801 234 5678
 * Covers all valid Nigerian mobile prefixes (070x-091x).
 */
export function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, "");
  // Nigerian mobile: starts with 0, +234, or 234, followed by 7-9, then 9 more digits
  return /^(\+?234|0)[789]\d{9}$/.test(cleaned);
}

export function sanitizeText(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

/**
 * Validates password strength.
 * Requires: 12+ characters (max 256), at least one uppercase, one lowercase, one digit.
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length > MAX_PASSWORD_LENGTH) {
    return { valid: false, error: `Password must be at most ${MAX_PASSWORD_LENGTH} characters.` };
  }
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

/**
 * Validates that a photo URL is a safe HTTPS URL pointing to
 * the expected Supabase storage domain.
 */
export function isValidPhotoUrl(url: string | undefined): boolean {
  if (!url || !url.startsWith("https://")) return false;
  try {
    const parsed = new URL(url);
    // Check against specific project hostname, not just any .supabase.co
    const expectedHost = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : null;

    const hostnameValid = expectedHost
      ? parsed.hostname === expectedHost
      : parsed.hostname.endsWith(".supabase.co");

    return (
      hostnameValid &&
      parsed.pathname.startsWith("/storage/v1/object/public/")
    );
  } catch {
    return false;
  }
}
