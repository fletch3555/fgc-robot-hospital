/**
 * Countries Data Unit Tests
 * 
 * Tests for static country data structure and filtering logic
 */

import { countries } from '@/data/countries';

describe('Countries Data Unit Tests', () => {
  describe('Countries data structure', () => {
    it('should have country data available', () => {
      expect(countries).toBeDefined();
      expect(Array.isArray(countries)).toBe(true);
      expect(countries.length).toBeGreaterThan(0);
    });

    it('should have required country properties', () => {
      const country = countries[0];
      expect(country).toHaveProperty('code');
      expect(country).toHaveProperty('name');
      expect(typeof country.code).toBe('string');
      expect(typeof country.name).toBe('string');
    });

    it('should have unique country codes', () => {
      const codes = countries.map(country => country.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it('should have non-empty country names', () => {
      countries.forEach(country => {
        expect(country.name.trim()).toBeTruthy();
        expect(country.code.trim()).toBeTruthy();
      });
    });
  });

  describe('Match data filtering logic', () => {
    const mockMatches = [
      {
        id: 1,
        label: 1,
        red1: { code: 'USA', name: 'United States', value: 'usa', label: 'United States', short: 'usa' },
        red2: { code: 'CAN', name: 'Canada', value: 'can', label: 'Canada', short: 'can' },
        red3: { code: 'GBR', name: 'United Kingdom', value: 'gbr', label: 'United Kingdom', short: 'gbr' },
        blue1: { code: 'FRA', name: 'France', value: 'fra', label: 'France', short: 'fra' },
        blue2: { code: 'GER', name: 'Germany', value: 'ger', label: 'Germany', short: 'ger' },
        blue3: { code: 'ITA', name: 'Italy', value: 'ita', label: 'Italy', short: 'ita' },
        scheduledTime: '10:00 Mon',
        field: 1,
      },
      {
        id: 2,
        label: 2,
        red1: { code: 'JPN', name: 'Japan', value: 'jpn', label: 'Japan', short: 'jpn' },
        red2: { code: 'KOR', name: 'South Korea', value: 'kor', label: 'South Korea', short: 'kor' },
        red3: { code: 'CHN', name: 'China', value: 'chn', label: 'China', short: 'chn' },
        blue1: { code: 'USA', name: 'United States', value: 'usa', label: 'United States', short: 'usa' },
        blue2: { code: 'AUS', name: 'Australia', value: 'aus', label: 'Australia', short: 'aus' },
        blue3: { code: 'NZL', name: 'New Zealand', value: 'nzl', label: 'New Zealand', short: 'nzl' },
        scheduledTime: '10:15 Mon',
        field: 2,
      },
    ];

    it('should filter matches by country correctly', () => {
      // Test filtering for USA (appears in both matches)
      const usaMatches = mockMatches.filter(match => 
        match.red1.code === 'USA' || match.red2.code === 'USA' || match.red3.code === 'USA' ||
        match.blue1.code === 'USA' || match.blue2.code === 'USA' || match.blue3.code === 'USA'
      );
      expect(usaMatches).toHaveLength(2);

      // Test filtering for JPN (appears in only one match)
      const jpnMatches = mockMatches.filter(match => 
        match.red1.code === 'JPN' || match.red2.code === 'JPN' || match.red3.code === 'JPN' ||
        match.blue1.code === 'JPN' || match.blue2.code === 'JPN' || match.blue3.code === 'JPN'
      );
      expect(jpnMatches).toHaveLength(1);
      expect(jpnMatches[0].id).toBe(2);
    });

    it('should extract unique countries from matches', () => {
      const countrySet = new Set<string>();
      mockMatches.forEach(match => {
        countrySet.add(match.red1.code);
        countrySet.add(match.red2.code);
        countrySet.add(match.red3.code);
        countrySet.add(match.blue1.code);
        countrySet.add(match.blue2.code);
        countrySet.add(match.blue3.code);
      });

      const uniqueCountries = Array.from(countrySet);
      expect(uniqueCountries).toHaveLength(11); // Should have 11 unique countries
      expect(uniqueCountries).toContain('USA');
      expect(uniqueCountries).toContain('CAN');
      expect(uniqueCountries).toContain('JPN');
    });

    it('should handle empty matches array', () => {
      const emptyMatches: unknown[] = [];
      const countrySet = new Set<string>();
      emptyMatches.forEach(match => {
        const matchObj = match as { red1?: { code?: string }; blue1?: { code?: string } };
        if (matchObj.red1?.code) countrySet.add(matchObj.red1.code);
        if (matchObj.blue1?.code) countrySet.add(matchObj.blue1.code);
      });

      expect(Array.from(countrySet)).toHaveLength(0);
    });

    it('should handle matches with missing country data', () => {
      const incompleteMatches = [
        {
          id: 1,
          red1: { code: 'USA' },
          red2: { code: '' }, // Empty code
          red3: null, // Missing team
          blue1: { code: 'CAN' },
          blue2: { code: 'GBR' },
          blue3: { code: 'FRA' },
        },
      ];

      const validCodes = incompleteMatches
        .flatMap(match => [
          match.red1?.code,
          match.red2?.code,
          (match.red3 as { code?: string } | null)?.code,
          match.blue1?.code,
          match.blue2?.code,
          match.blue3?.code,
        ])
        .filter(code => code && code.trim().length > 0);

      expect(validCodes).toHaveLength(4); // USA, CAN, GBR, FRA
      expect(validCodes).toContain('USA');
      expect(validCodes).toContain('CAN');
      expect(validCodes).toContain('GBR');
      expect(validCodes).toContain('FRA');
    });
  });
});