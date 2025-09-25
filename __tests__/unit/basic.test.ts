// Simple test to verify Jest is working
describe('Basic Jest Setup', () => {
  it('should be able to run tests', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle async operations', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });
});