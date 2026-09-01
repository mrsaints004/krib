/**
 * Server-side content filter for in-app messages.
 *
 * Purpose: catch attempts to move a deal off-platform (phone numbers,
 * WhatsApp handles, email addresses) BEFORE a message is stored/delivered.
 *
 * Honest limitation: this cannot catch everything — someone can say
 * "zero eight one, four five..." spelled out, or send it as an image.
 * It stops the casual majority; it is not a security boundary on its
 * own. The real deterrent is the escrow/reputation design in
 * ARCHITECTURE.md, not this filter. Treat this as one layer, not THE
 * defense.
 *
 * IMPORTANT: this must only ever run server-side (in the /api/messages
 * route, using the service-role Supabase client). There is deliberately
 * no RLS insert policy for `messages` on the `authenticated` role, so
 * this filter cannot be bypassed by calling Supabase directly from
 * the browser.
 */

const REDACTION = "[removed — contact details can't be shared before booking]";

export interface FilterResult {
  content: string; // redacted version, safe to display
  wasFlagged: boolean;
}

/**
 * Map of common Cyrillic/Greek homoglyphs to their Latin equivalents.
 * Used to defeat homoglyph attacks where e.g. Cyrillic 'а' (U+0430)
 * is substituted for Latin 'a' to bypass email/URL regex.
 */
const HOMOGLYPH_MAP: Record<string, string> = {
  // Cyrillic → Latin
  "\u0430": "a", // а
  "\u0435": "e", // е
  "\u043E": "o", // о
  "\u0440": "p", // р
  "\u0441": "c", // с
  "\u0443": "y", // у
  "\u0445": "x", // х
  "\u0456": "i", // і
  "\u0458": "j", // ј
  "\u04BB": "h", // һ
  "\u0410": "A", // А
  "\u0412": "B", // В
  "\u0415": "E", // Е
  "\u041A": "K", // К
  "\u041C": "M", // М
  "\u041D": "H", // Н
  "\u041E": "O", // О
  "\u0420": "P", // Р
  "\u0421": "C", // С
  "\u0422": "T", // Т
  "\u0425": "X", // Х
  // Greek → Latin
  "\u03B1": "a", // α
  "\u03BF": "o", // ο
  "\u03B5": "e", // ε
  "\u0391": "A", // Α
  "\u0392": "B", // Β
  "\u0395": "E", // Ε
  "\u0397": "H", // Η
  "\u039A": "K", // Κ
  "\u039C": "M", // Μ
  "\u039D": "N", // Ν
  "\u039F": "O", // Ο
  "\u03A1": "P", // Ρ
  "\u03A4": "T", // Τ
  "\u03A7": "X", // Χ
};

/**
 * Strip characters that can be used to break regex matching:
 * - Zero-width joiners/non-joiners (U+200B-200F)
 * - Directional marks (U+202A-202E, U+2066-2069)
 * - BOM (U+FEFF)
 * - Other Unicode format characters (Cf category)
 * - Soft hyphen (U+00AD)
 */
function stripInvisibleChars(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF\u00AD\u034F\u180E]/g, "");
}

/**
 * Replace common homoglyphs with their Latin equivalents.
 */
function normalizeHomoglyphs(text: string): string {
  let result = "";
  for (const char of text) {
    result += HOMOGLYPH_MAP[char] ?? char;
  }
  return result;
}

export function filterMessageContent(rawContent: string): FilterResult {
  // Step 1: NFKD normalization (fullwidth digits, accented chars → base form)
  let content = rawContent.normalize("NFKD");

  // Step 2: Strip zero-width and invisible characters
  content = stripInvisibleChars(content);

  // Step 3: Normalize Cyrillic/Greek homoglyphs to Latin
  content = normalizeHomoglyphs(content);

  let wasFlagged = false;

  // Create fresh RegExp instances each call to avoid /g statefulness issues
  const patterns = [
    /(\+?234|0)[\s\-.]?[789]\d{1}[\s\-.]?\d{3}[\s\-.]?\d{3,4}/g,     // Nigerian phone
    /\b\d{3}[\s.\-]?\d{3}[\s.\-]?\d{4}\b/g,                            // Generic phone
    /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,              // Email
    /\b(whats\s?app|wa\.me|telegram|t\.me|imo|signal|instagram|ig:|@[a-z0-9_]{4,})\b/gi, // Platforms
    /\b(zero|one|two|three|four|five|six|seven|eight|nine)(\s+(zero|one|two|three|four|five|six|seven|eight|nine)){6,}\b/gi, // Spelled-out digits
  ];

  for (const pattern of patterns) {
    const replaced = content.replace(pattern, REDACTION);
    if (replaced !== content) {
      wasFlagged = true;
      content = replaced;
    }
  }

  // Return the filtered content (based on normalized version)
  // but apply the same redactions. Since we normalized for detection,
  // the redacted version uses the normalized text.
  return { content, wasFlagged };
}
