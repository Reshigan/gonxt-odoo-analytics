// ═══════════════════════════════════════════════════════════════
// GONXT Analytics — Formatters Unit Tests
// ═══════════════════════════════════════════════════════════════

import { fmtZAR, fmtZARFull, fmtPct, fmtNum, fmtDate } from '../src/lib/formatters';

describe('Formatters', () => {
  describe('fmtZAR', () => {
    it('should format small numbers correctly', () => {
      expect(fmtZAR(100)).toBe('R 100');
      expect(fmtZAR(999)).toBe('R 999');
    });

    it('should format thousands correctly', () => {
      expect(fmtZAR(1000)).toBe('R 1K');
      expect(fmtZAR(1500)).toBe('R 2K');
      expect(fmtZAR(999999)).toBe('R 1,000K');
    });

    it('should format millions correctly', () => {
      expect(fmtZAR(1000000)).toBe('R 1.0M');
      expect(fmtZAR(1500000)).toBe('R 1.5M');
      expect(fmtZAR(999999999)).toBe('R 1,000.0M');
    });

    it('should handle negative numbers', () => {
      expect(fmtZAR(-1000)).toBe('-R 1K');
      expect(fmtZAR(-1500000)).toBe('-R 1.5M');
    });

    it('should handle null and undefined', () => {
      expect(fmtZAR(null)).toBe('—');
      expect(fmtZAR(undefined)).toBe('—');
    });
  });

  describe('fmtZARFull', () => {
    it('should format currency with two decimal places', () => {
      expect(fmtZARFull(100)).toBe('R 100.00');
      expect(fmtZARFull(100.5)).toBe('R 100.50');
      expect(fmtZARFull(100.555)).toBe('R 100.56');
    });

    it('should handle null and undefined', () => {
      expect(fmtZARFull(null)).toBe('—');
      expect(fmtZARFull(undefined)).toBe('—');
    });
  });

  describe('fmtPct', () => {
    it('should format percentages with signs', () => {
      expect(fmtPct(5.5)).toBe('+5.5%');
      expect(fmtPct(-3.2)).toBe('-3.2%');
      expect(fmtPct(0)).toBe('+0.0%');
    });

    it('should handle null and undefined', () => {
      expect(fmtPct(null)).toBe('—');
      expect(fmtPct(undefined)).toBe('—');
    });
  });

  describe('fmtNum', () => {
    it('should format numbers with commas', () => {
      expect(fmtNum(1000)).toBe('1,000');
      expect(fmtNum(1000000)).toBe('1,000,000');
      expect(fmtNum(1234567.89)).toBe('1,234,567.89');
    });

    it('should handle null and undefined', () => {
      expect(fmtNum(null)).toBe('—');
      expect(fmtNum(undefined)).toBe('—');
    });
  });

  describe('fmtDate', () => {
    it('should format ISO dates correctly', () => {
      expect(fmtDate('2026-03-15')).toBe('15/03/2026');
      expect(fmtDate('2026-01-01')).toBe('01/01/2026');
    });

    it('should handle invalid dates', () => {
      expect(fmtDate('')).toBe('—');
      expect(fmtDate(null as any)).toBe('—');
      expect(fmtDate(undefined as any)).toBe('—');
    });
  });
});