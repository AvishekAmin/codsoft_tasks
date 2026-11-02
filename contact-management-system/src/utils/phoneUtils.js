/**
 * Phone number normalization and validation utilities.
 * Conforms to clean E.164-style standard representation while safely preserving international codes.
 */

/**
 * Normalizes a phone number string:
 * - Trims leading/trailing whitespace
 * - Preserves leading '+' if present
 * - Strips internal separators like spaces, hyphens, parentheses, and dots
 * - Converts empty string to null
 *
 * Examples:
 * "+1 (555) 123-4567" -> "+15551234567"
 * "+91 98765-43210"   -> "+919876543210"
 * "555-123-4567"       -> "5551234567"
 *
 * @param {string|null|undefined} phone
 * @returns {string|null}
 */
export const normalizePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return null;
  const trimmed = phone.trim();
  if (!trimmed) return null;

  const hasLeadingPlus = trimmed.startsWith('+');
  // Strip all non-digit characters
  const digitsOnly = trimmed.replace(/\D/g, '');

  if (!digitsOnly) return null;

  return hasLeadingPlus ? `+${digitsOnly}` : digitsOnly;
};

/**
 * Validates whether a phone number matches standard telecommunication guidelines:
 * - Allows optional leading '+'
 * - Allows common punctuation in user input: spaces, hyphens, parentheses, dots
 * - Must contain between 7 and 15 digits (ITU-T E.164 standard)
 *
 * @param {string} phone
 * @returns {boolean}
 */
export const isValidPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  const trimmed = phone.trim();

  // Pattern allowing digits, optional leading +, and standard format symbols (), -, ., space
  const formatRegex = /^\+?[0-9\s\-\(\)\.]{7,25}$/;
  if (!formatRegex.test(trimmed)) return false;

  const digits = trimmed.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
};
