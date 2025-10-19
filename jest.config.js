const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Base configuration shared by all test types
const baseConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/__tests__/helpers/'
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}

// All tests configuration (default)
const allTestsConfig = {
  ...baseConfig,
  testMatch: [
    '**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)',
    '**/*.(test|spec).(js|jsx|ts|tsx)'
  ],
  displayName: 'All Tests',
}

// Unit tests configuration
const unitTestsConfig = {
  ...baseConfig,
  testMatch: [
    '**/__tests__/unit/**/*.(test|spec).(js|jsx|ts|tsx)'
  ],
  displayName: 'Unit Tests',
  testEnvironment: 'node', // Unit tests typically don't need DOM
}

// Integration tests configuration
const integrationTestsConfig = {
  ...baseConfig,
  testMatch: [
    '**/__tests__/integration/**/*.(test|spec).(js|jsx|ts|tsx)'
  ],
  displayName: 'Integration Tests',
}

// Legacy tests configuration (for remaining old tests)
const legacyTestsConfig = {
  ...baseConfig,
  testMatch: [
    '**/__tests__/auth/**/*.(test|spec).(js|jsx|ts|tsx)',
    '**/__tests__/components/**/*.(test|spec).(js|jsx|ts|tsx)'
  ],
  displayName: 'Legacy Tests',
}

// Export the configuration based on environment variable
const testType = process.env.TEST_TYPE || 'all';

let config;
switch (testType) {
  case 'unit':
    config = unitTestsConfig;
    break;
  case 'integration':
    config = integrationTestsConfig;
    break;
  case 'legacy':
    config = legacyTestsConfig;
    break;
  default:
    config = allTestsConfig;
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(config)