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

const NIGERIAN_PHONE_PATTERN =
  /(\+?234|0)[\s-]?[789]\d{1}[\s-]?\d{3}[\s-]?\d{3,4}/g;

const GENERIC_PHONE_PATTERN = /\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/g;

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const PLATFORM_MENTION_PATTERN =
  /\b(whats\s?app|wa\.me|telegram|t\.me|imo|signal|instagram|ig:|@[a-z0-9_]{4,})\b/gi;

const SPELLED_OUT_DIGITS_PATTERN =
  /\b(zero|one|two|three|four|five|six|seven|eight|nine)(\s+(zero|one|two|three|four|five|six|seven|eight|nine)){6,}\b/gi;

export interface FilterResult {
  content: string; // redacted version, safe to display
  wasFlagged: boolean;
}

export function filterMessageContent(rawContent: string): FilterResult {
  let content = rawContent;
  let wasFlagged = false;

  const patterns = [
    NIGERIAN_PHONE_PATTERN,
    GENERIC_PHONE_PATTERN,
    EMAIL_PATTERN,
    PLATFORM_MENTION_PATTERN,
    SPELLED_OUT_DIGITS_PATTERN,
  ];

  for (const pattern of patterns) {
    // Reset lastIndex before each use — /g regexes are stateful and
    // calling .test() then .replace() on the same regex would skip matches.
    pattern.lastIndex = 0;
    const replaced = content.replace(
      pattern,
      "[removed — contact details can't be shared before booking]"
    );
    if (replaced !== content) {
      wasFlagged = true;
      content = replaced;
    }
  }

  return { content, wasFlagged };
}
