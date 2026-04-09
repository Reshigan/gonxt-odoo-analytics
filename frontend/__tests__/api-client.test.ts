// ═══════════════════════════════════════════════════════════════
// GONXT Analytics — API Client Unit Tests
// ═══════════════════════════════════════════════════════════════

import { buildQuery } from '../src/lib/api-client';

// Mock fetch globally for tests
global.fetch = jest.fn();

describe('API Client', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  describe('buildQuery', () => {
    it('should build query string from parameters', () => {
      const params = { company_id: 1, year: 2026, month: 3 };
      expect(buildQuery(params)).toBe('?company_id=1&year=2026&month=3');
    });

    it('should filter out null and empty values', () => {
      const params = { company_id: 1, month: null, day: undefined, name: '' };
      expect(buildQuery(params)).toBe('?company_id=1');
    });

    it('should return empty string when no valid parameters', () => {
      const params = { month: null, day: undefined };
      expect(buildQuery(params)).toBe('');
    });

    it('should handle special characters in values', () => {
      const params = { search: 'test & value', sort: 'name-desc' };
      expect(buildQuery(params)).toBe('?search=test%20%26%20value&sort=name-desc');
    });
  });

  // Additional tests would be implemented for the apiFetch function
  // but they require proper mocking of fetch and localStorage
});