import { normalizePhone, isValidPhone } from '../../src/utils/phoneUtils.js';

describe('Phone Utilities Unit Tests', () => {
  describe('normalizePhone', () => {
    it('normalizes international numbers with leading plus', () => {
      expect(normalizePhone('+1 (555) 123-4567')).toBe('+15551234567');
      expect(normalizePhone('+91 98765-43210')).toBe('+919876543210');
      expect(normalizePhone('+44 20 7946 0958')).toBe('+442079460958');
    });

    it('normalizes domestic numbers without leading plus', () => {
      expect(normalizePhone('(555) 123-4567')).toBe('5551234567');
      expect(normalizePhone('555.123.4567')).toBe('5551234567');
      expect(normalizePhone('9876543210')).toBe('9876543210');
    });

    it('returns null for null, undefined, or empty strings', () => {
      expect(normalizePhone(null)).toBeNull();
      expect(normalizePhone(undefined)).toBeNull();
      expect(normalizePhone('')).toBeNull();
      expect(normalizePhone('   ')).toBeNull();
    });
  });

  describe('isValidPhone', () => {
    it('accepts valid phone numbers in diverse standard formats', () => {
      expect(isValidPhone('+1-555-123-4567')).toBe(true);
      expect(isValidPhone('+91 98765 43210')).toBe(true);
      expect(isValidPhone('(555) 123-4567')).toBe(true);
      expect(isValidPhone('5551234567')).toBe(true);
      expect(isValidPhone('+442079460958')).toBe(true);
    });

    it('rejects phone numbers with too few or too many digits', () => {
      expect(isValidPhone('12345')).toBe(false); // only 5 digits
      expect(isValidPhone('12345678901234567890')).toBe(false); // 20 digits exceeds E.164 max
    });

    it('rejects phone numbers with alphabetic characters or symbols', () => {
      expect(isValidPhone('555-CALL-NOW')).toBe(false);
      expect(isValidPhone('invalid_phone')).toBe(false);
      expect(isValidPhone('')).toBe(false);
    });
  });
});
