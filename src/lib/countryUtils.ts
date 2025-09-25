import { countries } from '@/data/countries';

/**
 * Get country name from country code
 * @param countryCode - The 3-letter country code (e.g., 'USA', 'CAN')
 * @returns The country name or the country code if not found
 */
export function getCountryName(countryCode: string): string {
  if (!countryCode) return '';
  
  const country = countries.find(c => c.code.toUpperCase() === countryCode.toUpperCase());
  return country ? country.name : countryCode;
}

/**
 * Validate if a country code exists
 * @param countryCode - The 3-letter country code to validate
 * @returns true if the country code exists, false otherwise
 */
export function isValidCountryCode(countryCode: string): boolean {
  if (!countryCode) return false;
  
  return countries.some(c => c.code.toUpperCase() === countryCode.toUpperCase());
}

/**
 * Get all available country codes
 * @returns Array of all country codes
 */
export function getAllCountryCodes(): string[] {
  return countries.map(c => c.code);
}