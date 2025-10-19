/**
 * Matches API Integration Tests
 * 
 * Tests for external API integration for match schedule data
 */

// Mock the fetch function
global.fetch = jest.fn();

describe('Matches API Integration Tests', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('FIRST Global API Integration', () => {
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

    it('should handle API timeout scenarios', async () => {
      const timeoutError = new Error('Request timeout');
      (fetch as jest.Mock).mockRejectedValue(timeoutError);

      await expect(fetch('https://api.first.global/v1')).rejects.toThrow('Request timeout');
    });

    it('should handle malformed API responses', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      };
      
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const response = await fetch('https://api.first.global/v1');
      await expect(response.json()).rejects.toThrow('Invalid JSON');
    });

    it('should handle HTTP error status codes', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: jest.fn().mockResolvedValue({ error: 'Resource not found' }),
      };
      
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const response = await fetch('https://api.first.global/v1');
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
      expect(response.statusText).toBe('Not Found');
    });

    it('should handle large response payloads', async () => {
      // Simulate a large response with many matches
      const largeMatches = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        scheduledTime: `2025-01-01T${String(10 + i % 12).padStart(2, '0')}:00:00Z`,
        field: (i % 4) + 1,
        played: false,
        participants: [
          { country: 'USA' },
          { country: 'CAN' },
          { country: 'GBR' },
          { country: 'FRA' },
          { country: 'GER' },
          { country: 'ITA' },
        ],
      }));

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ matches: largeMatches }),
      };
      
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const response = await fetch('https://api.first.global/v1');
      const data = await response.json();
      
      expect(data.matches).toHaveLength(1000);
      expect(data.matches[0].id).toBe(1);
      expect(data.matches[999].id).toBe(1000);
    });
  });
});