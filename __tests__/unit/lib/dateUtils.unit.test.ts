/**
 * Unit Tests for Date Utilities - dateUtils.ts
 * 
 * Tests for pure date utility functions that don't require external dependencies.
 * These are true unit tests that test individual functions in isolation.
 */

describe('Date Utilities - Unit Tests', () => {
  
  describe('getCurrentUTCTimestamp', () => {
    let getCurrentUTCTimestamp: () => string;
    
    beforeAll(async () => {
      const dateUtilsModule = await import('../../../src/lib/dateUtils');
      getCurrentUTCTimestamp = dateUtilsModule.getCurrentUTCTimestamp;
    });

    it('should return a valid ISO string', () => {
      const timestamp = getCurrentUTCTimestamp();
      
      expect(typeof timestamp).toBe('string');
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should return current time (within reasonable tolerance)', () => {
      const before = new Date().getTime();
      const timestamp = getCurrentUTCTimestamp();
      const after = new Date().getTime();
      const timestampTime = new Date(timestamp).getTime();
      
      expect(timestampTime).toBeGreaterThanOrEqual(before - 1000); // Allow 1s tolerance
      expect(timestampTime).toBeLessThanOrEqual(after + 1000);
    });

    test('should return different values on consecutive calls with delay', async () => {
      const timestamp1 = getCurrentUTCTimestamp();
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
      const timestamp2 = getCurrentUTCTimestamp();
      
      expect(timestamp1).not.toBe(timestamp2);
    });
  });

  describe('formatRequestDate', () => {
    let formatRequestDate: (dateInput: string | Date) => string;
    
    beforeAll(async () => {
      const dateUtilsModule = await import('../../../src/lib/dateUtils');
      formatRequestDate = dateUtilsModule.formatRequestDate;
    });

    it('should format valid date string correctly', () => {
      const dateString = '2024-01-15T14:30:00Z';
      const result = formatRequestDate(dateString);
      
      expect(typeof result).toBe('string');
      expect(result).not.toBe('Invalid Date');
      // Result should contain day and time format
      expect(result).toMatch(/\w{3}\s+\d{2}:\d{2}/);
    });

    it('should format Date object correctly', () => {
      const date = new Date('2024-01-15T14:30:00Z');
      const result = formatRequestDate(date);
      
      expect(typeof result).toBe('string');
      expect(result).not.toBe('Invalid Date');
      expect(result).toMatch(/\w{3}\s+\d{2}:\d{2}/);
    });

    it('should handle date string without timezone', () => {
      const dateString = '2024-01-15T14:30:00';
      const result = formatRequestDate(dateString);
      
      expect(typeof result).toBe('string');
      expect(result).not.toBe('Invalid Date');
    });

    it('should return "Invalid Date" for invalid input', () => {
      expect(formatRequestDate('invalid-date')).toBe('Invalid Date');
      expect(formatRequestDate('2024-13-45')).toBe('Invalid Date');
      expect(formatRequestDate('')).toBe('Invalid Date');
    });

    it('should handle edge case dates', () => {
      // Test leap year
      const leapYear = formatRequestDate('2024-02-29T12:00:00Z');
      expect(leapYear).not.toBe('Invalid Date');
      
      // Test end of year
      const endOfYear = formatRequestDate('2024-12-31T23:59:59Z');
      expect(endOfYear).not.toBe('Invalid Date');
    });
  });

  describe('formatDate', () => {
    let formatDate: (dateString: string | undefined | null) => string;
    
    beforeAll(async () => {
      const dateUtilsModule = await import('../../../src/lib/dateUtils');
      formatDate = dateUtilsModule.formatDate;
    });

    it('should format valid date string', () => {
      const result = formatDate('2024-01-15T14:30:00Z');
      
      expect(typeof result).toBe('string');
      expect(result).not.toBe('N/A');
    });

    it('should return "N/A" for null input', () => {
      expect(formatDate(null)).toBe('N/A');
    });

    it('should return "Invalid Date" for invalid date string', () => {
      expect(formatDate('invalid-date')).toBe('Invalid Date');
    });

    it('should return "N/A" for empty/null/undefined date string', () => {
      expect(formatDate('')).toBe('N/A');
      expect(formatDate(null)).toBe('N/A');
      expect(formatDate(undefined)).toBe('N/A');
    });

    it('should handle various valid date formats', () => {
      const formats = [
        '2024-01-15T14:30:00Z',
        '2024-01-15T14:30:00.000Z',
        '2024-01-15',
      ];
      
      formats.forEach(format => {
        const result = formatDate(format);
        expect(result).not.toBe('N/A');
        expect(typeof result).toBe('string');
      });
    });
  });
});