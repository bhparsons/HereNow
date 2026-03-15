/**
 * Shared validation utilities for profile fields.
 */

/**
 * Validates an email address using a standard regex pattern.
 */
export function isValidEmail(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value.trim());
}

/**
 * Validates a phone number. Accepts common formats:
 * - With or without country code (+1, 1, etc.)
 * - Dashes, spaces, parentheses, dots as separators
 * - Examples: +1 (555) 123-4567, 555-123-4567, +44 20 7946 0958, 5551234567
 */
export function isValidPhoneNumber(value: string): boolean {
  // Strip all formatting characters to get just digits and optional leading +
  const stripped = value.trim().replace(/[\s\-().]/g, '');
  // Must be digits, optionally starting with +
  const phoneRegex = /^\+?\d{7,15}$/;
  return phoneRegex.test(stripped);
}

/**
 * Validates a FaceTime contact value — must be either a valid email or phone number.
 */
export function validateFaceTimeContact(value: string): { valid: boolean; error?: string } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { valid: false, error: 'FaceTime contact is required' };
  }
  if (isValidEmail(trimmed)) {
    return { valid: true };
  }
  if (isValidPhoneNumber(trimmed)) {
    return { valid: true };
  }
  return { valid: false, error: 'Enter a valid email address or phone number' };
}
