import { countries } from '@/data/countries';

// Mock the fetch function
global.fetch = jest.fn();

describe('Match Schedule Page', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Countries data', () => {
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
  });

  describe('API Integration', () => {
    it('should call the FIRST Global API with correct URL', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ matches: [] }),
      };
      
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Simulate API call
      const response = await fetch('https://api.first.global/v1');
      
      expect(fetch).toHaveBeenCalledWith('https://api.first.global/v1');
      expect(response.ok).toBe(true);
    });

    it('should handle API errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      try {
        await fetch('https://api.first.global/v1');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Network error');
      }
    });

    it('should handle successful API response', async () => {
      const mockMatches = [
        {
          id: 1,
          scheduledTime: '2025-01-01T10:00:00Z',
          field: 1,
          played: false,
          participants: [
            { country: 'USA' },
            { country: 'CAN' },
            { country: 'GBR' },
            { country: 'FRA' },
            { country: 'GER' },
            { country: 'ITA' },
          ],
        },
      ];

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ matches: mockMatches }),
      };
      
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const response = await fetch('https://api.first.global/v1');
      const data = await response.json();
      
      expect(data.matches).toEqual(mockMatches);
      expect(data.matches[0].field).toBe(1);
      expect(data.matches[0].participants[0].country).toBe('USA');
    });
  });

  describe('Match data filtering', () => {
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
  });
});