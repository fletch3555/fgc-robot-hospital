import { getCurrentSeason } from '@/lib/season';

export type CountryInfo = {
  code: string;
  name: string;
  /** ISO 3166-1 alpha-2 code, for flag lookup; this app's own `code` is an
   * IOC/NOC-style code (matching FIRST Global Challenge's convention), which
   * often differs from ISO codes -- e.g. 'ANT' here is Antigua and Barbuda,
   * not the ISO meaning of that string. null for the one non-country entry
   * ('Hope', FGC's composite/no-nation team). */
  iso2: string | null;
};

export const countries: CountryInfo[] = [
  { code: 'AFG', name: 'Afghanistan', iso2: 'AF' },
  { code: 'ALB', name: 'Albania', iso2: 'AL' },
  { code: 'ALG', name: 'Algeria', iso2: 'DZ' },
  { code: 'ASA', name: 'American Samoa', iso2: 'AS' },
  { code: 'AND', name: 'Andorra', iso2: 'AD' },
  { code: 'ANG', name: 'Angola', iso2: 'AO' },
  { code: 'ANT', name: 'Antigua and Barbuda', iso2: 'AG' },
  { code: 'ARG', name: 'Argentina', iso2: 'AR' },
  { code: 'ARM', name: 'Armenia', iso2: 'AM' },
  { code: 'ARU', name: 'Aruba', iso2: 'AW' },
  { code: 'AUS', name: 'Australia', iso2: 'AU' },
  { code: 'AUT', name: 'Austria', iso2: 'AT' },
  { code: 'AZE', name: 'Azerbaijan', iso2: 'AZ' },
  { code: 'BAH', name: 'Bahamas', iso2: 'BS' },
  { code: 'BRN', name: 'Bahrain', iso2: 'BH' },
  { code: 'BAN', name: 'Bangladesh', iso2: 'BD' },
  { code: 'BAR', name: 'Barbados', iso2: 'BB' },
  { code: 'BLR', name: 'Belarus', iso2: 'BY' },
  { code: 'BEL', name: 'Belgium', iso2: 'BE' },
  { code: 'BIZ', name: 'Belize', iso2: 'BZ' },
  { code: 'BEN', name: 'Benin', iso2: 'BJ' },
  { code: 'BER', name: 'Bermuda', iso2: 'BM' },
  { code: 'BHU', name: 'Bhutan', iso2: 'BT' },
  { code: 'BOL', name: 'Bolivia', iso2: 'BO' },
  { code: 'BIH', name: 'Bosnia and Herzegovina', iso2: 'BA' },
  { code: 'BOT', name: 'Botswana', iso2: 'BW' },
  { code: 'BRA', name: 'Brazil', iso2: 'BR' },
  { code: 'IVB', name: 'British Virgin Islands', iso2: 'VG' },
  { code: 'BRU', name: 'Brunei Darussalam', iso2: 'BN' },
  { code: 'BUL', name: 'Bulgaria', iso2: 'BG' },
  { code: 'BUR', name: 'Burkina Faso', iso2: 'BF' },
  { code: 'BDI', name: 'Burundi', iso2: 'BI' },
  { code: 'CPV', name: 'Cabo Verde', iso2: 'CV' },
  { code: 'CAM', name: 'Cambodia', iso2: 'KH' },
  { code: 'CMR', name: 'Cameroon', iso2: 'CM' },
  { code: 'CAN', name: 'Canada', iso2: 'CA' },
  { code: 'CAY', name: 'Cayman Islands', iso2: 'KY' },
  { code: 'CAF', name: 'Central African Republic', iso2: 'CF' },
  { code: 'CHA', name: 'Chad', iso2: 'TD' },
  { code: 'CHI', name: 'Chile', iso2: 'CL' },
  { code: 'TPE', name: 'Chinese Taipei', iso2: 'TW' },
  { code: 'COL', name: 'Colombia', iso2: 'CO' },
  { code: 'COM', name: 'Comoros', iso2: 'KM' },
  { code: 'CGO', name: 'Congo', iso2: 'CG' },
  { code: 'COK', name: 'Cook Islands', iso2: 'CK' },
  { code: 'CRC', name: 'Costa Rica', iso2: 'CR' },
  { code: 'CIV', name: 'Côte d\'Ivoire', iso2: 'CI' },
  { code: 'CRO', name: 'Croatia', iso2: 'HR' },
  { code: 'CUB', name: 'Cuba', iso2: 'CU' },
  { code: 'CYP', name: 'Cyprus', iso2: 'CY' },
  { code: 'CZE', name: 'Czechia', iso2: 'CZ' },
  { code: 'PRK', name: 'Democratic People\'s Republic of Korea', iso2: 'KP' },
  { code: 'COD', name: 'Democratic Republic of the Congo', iso2: 'CD' },
  { code: 'DEN', name: 'Denmark', iso2: 'DK' },
  { code: 'DJI', name: 'Djibouti', iso2: 'DJ' },
  { code: 'DMA', name: 'Dominica', iso2: 'DM' },
  { code: 'DOM', name: 'Dominican Republic', iso2: 'DO' },
  { code: 'ECU', name: 'Ecuador', iso2: 'EC' },
  { code: 'EGY', name: 'Egypt', iso2: 'EG' },
  { code: 'ESA', name: 'El Salvador', iso2: 'SV' },
  { code: 'GEQ', name: 'Equatorial Guinea', iso2: 'GQ' },
  { code: 'ERI', name: 'Eritrea', iso2: 'ER' },
  { code: 'EST', name: 'Estonia', iso2: 'EE' },
  { code: 'SWZ', name: 'Eswatini', iso2: 'SZ' },
  { code: 'ETH', name: 'Ethiopia', iso2: 'ET' },
  { code: 'FSM', name: 'Federated States of Micronesia', iso2: 'FM' },
  { code: 'FIJ', name: 'Fiji', iso2: 'FJ' },
  { code: 'FIN', name: 'Finland', iso2: 'FI' },
  { code: 'FRA', name: 'France', iso2: 'FR' },
  { code: 'GAB', name: 'Gabon', iso2: 'GA' },
  { code: 'GAM', name: 'Gambia', iso2: 'GM' },
  { code: 'GEO', name: 'Georgia', iso2: 'GE' },
  { code: 'GER', name: 'Germany', iso2: 'DE' },
  { code: 'GHA', name: 'Ghana', iso2: 'GH' },
  { code: 'GBR', name: 'Great Britain', iso2: 'GB' },
  { code: 'GRE', name: 'Greece', iso2: 'GR' },
  { code: 'GRN', name: 'Grenada', iso2: 'GD' },
  { code: 'GUM', name: 'Guam', iso2: 'GU' },
  { code: 'GUA', name: 'Guatemala', iso2: 'GT' },
  { code: 'GUI', name: 'Guinea', iso2: 'GN' },
  { code: 'GBS', name: 'Guinea-Bissau', iso2: 'GW' },
  { code: 'GUY', name: 'Guyana', iso2: 'GY' },
  { code: 'HAI', name: 'Haiti', iso2: 'HT' },
  { code: 'HON', name: 'Honduras', iso2: 'HN' },
  { code: 'HKG', name: 'Hong Kong, China', iso2: 'HK' },
  { code: 'HPE', name: 'Hope', iso2: null },
  { code: 'HUN', name: 'Hungary', iso2: 'HU' },
  { code: 'ISL', name: 'Iceland', iso2: 'IS' },
  { code: 'IND', name: 'India', iso2: 'IN' },
  { code: 'INA', name: 'Indonesia', iso2: 'ID' },
  { code: 'IRQ', name: 'Iraq', iso2: 'IQ' },
  { code: 'IRL', name: 'Ireland', iso2: 'IE' },
  { code: 'IRI', name: 'Islamic Republic of Iran', iso2: 'IR' },
  { code: 'ISR', name: 'Israel', iso2: 'IL' },
  { code: 'ITA', name: 'Italy', iso2: 'IT' },
  { code: 'JAM', name: 'Jamaica', iso2: 'JM' },
  { code: 'JPN', name: 'Japan', iso2: 'JP' },
  { code: 'JOR', name: 'Jordan', iso2: 'JO' },
  { code: 'KAZ', name: 'Kazakhstan', iso2: 'KZ' },
  { code: 'KEN', name: 'Kenya', iso2: 'KE' },
  { code: 'KIR', name: 'Kiribati', iso2: 'KI' },
  { code: 'KOS', name: 'Kosovo', iso2: 'XK' },
  { code: 'KUW', name: 'Kuwait', iso2: 'KW' },
  { code: 'KGZ', name: 'Kyrgyzstan', iso2: 'KG' },
  { code: 'LAO', name: 'Lao People\'s Democratic Republic', iso2: 'LA' },
  { code: 'LAT', name: 'Latvia', iso2: 'LV' },
  { code: 'LBN', name: 'Lebanon', iso2: 'LB' },
  { code: 'LES', name: 'Lesotho', iso2: 'LS' },
  { code: 'LBR', name: 'Liberia', iso2: 'LR' },
  { code: 'LBA', name: 'Libya', iso2: 'LY' },
  { code: 'LIE', name: 'Liechtenstein', iso2: 'LI' },
  { code: 'LTU', name: 'Lithuania', iso2: 'LT' },
  { code: 'LUX', name: 'Luxembourg', iso2: 'LU' },
  { code: 'MAD', name: 'Madagascar', iso2: 'MG' },
  { code: 'MAW', name: 'Malawi', iso2: 'MW' },
  { code: 'MAS', name: 'Malaysia', iso2: 'MY' },
  { code: 'MDV', name: 'Maldives', iso2: 'MV' },
  { code: 'MLI', name: 'Mali', iso2: 'ML' },
  { code: 'MLT', name: 'Malta', iso2: 'MT' },
  { code: 'MHL', name: 'Marshall Islands', iso2: 'MH' },
  { code: 'MTN', name: 'Mauritania', iso2: 'MR' },
  { code: 'MRI', name: 'Mauritius', iso2: 'MU' },
  { code: 'MEX', name: 'Mexico', iso2: 'MX' },
  { code: 'MON', name: 'Monaco', iso2: 'MC' },
  { code: 'MGL', name: 'Mongolia', iso2: 'MN' },
  { code: 'MNE', name: 'Montenegro', iso2: 'ME' },
  { code: 'MAR', name: 'Morocco', iso2: 'MA' },
  { code: 'MOZ', name: 'Mozambique', iso2: 'MZ' },
  { code: 'MYA', name: 'Myanmar', iso2: 'MM' },
  { code: 'NAM', name: 'Namibia', iso2: 'NA' },
  { code: 'NRU', name: 'Nauru', iso2: 'NR' },
  { code: 'NEP', name: 'Nepal', iso2: 'NP' },
  { code: 'NED', name: 'Netherlands', iso2: 'NL' },
  { code: 'NZL', name: 'New Zealand', iso2: 'NZ' },
  { code: 'NCA', name: 'Nicaragua', iso2: 'NI' },
  { code: 'NIG', name: 'Niger', iso2: 'NE' },
  { code: 'NGR', name: 'Nigeria', iso2: 'NG' },
  { code: 'MKD', name: 'North Macedonia', iso2: 'MK' },
  { code: 'NOR', name: 'Norway', iso2: 'NO' },
  { code: 'OMA', name: 'Oman', iso2: 'OM' },
  { code: 'PAK', name: 'Pakistan', iso2: 'PK' },
  { code: 'PLW', name: 'Palau', iso2: 'PW' },
  { code: 'PLE', name: 'Palestine', iso2: 'PS' },
  { code: 'PAN', name: 'Panama', iso2: 'PA' },
  { code: 'PNG', name: 'Papua New Guinea', iso2: 'PG' },
  { code: 'PAR', name: 'Paraguay', iso2: 'PY' },
  { code: 'CHN', name: 'People\'s Republic of China', iso2: 'CN' },
  { code: 'PER', name: 'Peru', iso2: 'PE' },
  { code: 'PHI', name: 'Philippines', iso2: 'PH' },
  { code: 'POL', name: 'Poland', iso2: 'PL' },
  { code: 'POR', name: 'Portugal', iso2: 'PT' },
  { code: 'PUR', name: 'Puerto Rico', iso2: 'PR' },
  { code: 'QAT', name: 'Qatar', iso2: 'QA' },
  { code: 'KOR', name: 'Republic of Korea', iso2: 'KR' },
  { code: 'MDA', name: 'Republic of Moldova', iso2: 'MD' },
  { code: 'ROU', name: 'Romania', iso2: 'RO' },
  { code: 'RUS', name: 'Russian Federation', iso2: 'RU' },
  { code: 'RWA', name: 'Rwanda', iso2: 'RW' },
  { code: 'SKN', name: 'Saint Kitts and Nevis', iso2: 'KN' },
  { code: 'LCA', name: 'Saint Lucia', iso2: 'LC' },
  { code: 'VIN', name: 'Saint Vincent and the Grenadines', iso2: 'VC' },
  { code: 'SAM', name: 'Samoa', iso2: 'WS' },
  { code: 'SMR', name: 'San Marino', iso2: 'SM' },
  { code: 'STP', name: 'São Tomé and Príncipe', iso2: 'ST' },
  { code: 'KSA', name: 'Saudi Arabia', iso2: 'SA' },
  { code: 'SEN', name: 'Senegal', iso2: 'SN' },
  { code: 'SRB', name: 'Serbia', iso2: 'RS' },
  { code: 'SEY', name: 'Seychelles', iso2: 'SC' },
  { code: 'SLE', name: 'Sierra Leone', iso2: 'SL' },
  { code: 'SGP', name: 'Singapore', iso2: 'SG' },
  { code: 'SVK', name: 'Slovakia', iso2: 'SK' },
  { code: 'SLO', name: 'Slovenia', iso2: 'SI' },
  { code: 'SOL', name: 'Solomon Islands', iso2: 'SB' },
  { code: 'SOM', name: 'Somalia', iso2: 'SO' },
  { code: 'RSA', name: 'South Africa', iso2: 'ZA' },
  { code: 'SSD', name: 'South Sudan', iso2: 'SS' },
  { code: 'ESP', name: 'Spain', iso2: 'ES' },
  { code: 'SRI', name: 'Sri Lanka', iso2: 'LK' },
  { code: 'SUD', name: 'Sudan', iso2: 'SD' },
  { code: 'SUR', name: 'Suriname', iso2: 'SR' },
  { code: 'SWE', name: 'Sweden', iso2: 'SE' },
  { code: 'SUI', name: 'Switzerland', iso2: 'CH' },
  { code: 'SYR', name: 'Syrian Arab Republic', iso2: 'SY' },
  { code: 'TJK', name: 'Tajikistan', iso2: 'TJ' },
  { code: 'THA', name: 'Thailand', iso2: 'TH' },
  { code: 'TLS', name: 'Timor-Leste', iso2: 'TL' },
  { code: 'TOG', name: 'Togo', iso2: 'TG' },
  { code: 'TGA', name: 'Tonga', iso2: 'TO' },
  { code: 'TTO', name: 'Trinidad and Tobago', iso2: 'TT' },
  { code: 'TUN', name: 'Tunisia', iso2: 'TN' },
  { code: 'TUR', name: 'Türkiye', iso2: 'TR' },
  { code: 'TKM', name: 'Turkmenistan', iso2: 'TM' },
  { code: 'TUV', name: 'Tuvalu', iso2: 'TV' },
  { code: 'ISV', name: 'U.S. Virgin Islands', iso2: 'VI' },
  { code: 'UGA', name: 'Uganda', iso2: 'UG' },
  { code: 'UKR', name: 'Ukraine', iso2: 'UA' },
  { code: 'UAE', name: 'United Arab Emirates', iso2: 'AE' },
  { code: 'TAN', name: 'United Republic of Tanzania', iso2: 'TZ' },
  { code: 'USA', name: 'United States of America', iso2: 'US' },
  { code: 'URU', name: 'Uruguay', iso2: 'UY' },
  { code: 'UZB', name: 'Uzbekistan', iso2: 'UZ' },
  { code: 'VAN', name: 'Vanuatu', iso2: 'VU' },
  { code: 'VEN', name: 'Venezuela', iso2: 'VE' },
  { code: 'VIE', name: 'Vietnam', iso2: 'VN' },
  { code: 'YEM', name: 'Yemen', iso2: 'YE' },
  { code: 'ZAM', name: 'Zambia', iso2: 'ZM' },
  { code: 'ZIM', name: 'Zimbabwe', iso2: 'ZW' },

].sort((a, b) => a.name.localeCompare(b.name));

// Helper functions for team management
export const getTeamByCountryCode = (code: string): CountryInfo | undefined => {
  return countries.find(country => country.code === code);
};

// Teams participating in each season's event, by code. `countries` above is
// the full catalog and must stay complete: it's the lookup table for names and
// flags on existing requests, spare parts and match data, which can reference
// any code from any season. This list only controls which teams are offered
// when creating something new. Add a new entry each season (once the
// participant list is published); the one matching EVENT_SEASON is used
// (see getCurrentSeason). Until a season's list exists, all teams are selectable.
const PARTICIPANTS_BY_SEASON: Record<number, readonly string[]> = {
  2025: [
    'AFG', 'ALB', 'ALG', 'ASA', 'ANG', 'ANT', 'ARG', 'ARM', 'ARU', 'AUS', // 10
    'AUT', 'AZE', 'BAH', 'BAN', 'BAR', 'BLR', 'BIZ', 'BEN', 'BER', 'BHU', // 20
    'BOL', 'BIH', 'BOT', 'BRA', 'IVB', 'BRU', 'BUL', 'BUR', 'BDI', 'CPV', // 30
    'CAM', 'CMR', 'CAN', 'CAY', 'CAF', 'CHA', 'CHI', 'TPE', 'COL', 'COM', // 40
    'CGO', 'COK', 'CRC', 'CIV', 'CRO', 'CUB', 'CYP', 'CZE', 'COD', 'DEN', // 50
    'DJI', 'DMA', 'DOM', 'ECU', 'EGY', 'ESA', 'GEQ', 'ERI', 'EST', 'SWZ', // 60
    'ETH', 'FSM', 'FIJ', 'FIN', 'FRA', 'GAB', 'GAM', 'GEO', 'GER', 'GHA', // 70
    'GBR', 'GRE', 'GRN', 'GUM', 'GUA', 'GUI', 'GBS', 'GUY', 'HAI', 'HON', // 80
    'HKG', 'HPE', 'HUN', 'IND', 'INA', 'IRQ', 'IRL', 'IRI', 'ISR', 'ITA', // 90
    'JAM', 'JPN', 'JOR', 'KAZ', 'KEN', 'KIR', 'KOS', 'KGZ', 'LAO', 'LAT', // 100
    'LBN', 'LES', 'LBR', 'LBA', 'LTU', 'LUX', 'MAD', 'MAW', 'MAS', 'MDV', // 110
    'MLI', 'MLT', 'MHL', 'MTN', 'MRI', 'MEX', 'MGL', 'MNE', 'MAR', 'MOZ', // 120
    'MYA', 'NAM', 'NEP', 'NED', 'NCA', 'NIG', 'NGR', 'MKD', 'NOR', 'OMA', // 130
    'PAK', 'PLE', 'PAN', 'PNG', 'PAR', 'CHN', 'PER', 'PHI', 'POL', 'POR', // 140
    'PUR', 'QAT', 'KOR', 'MDA', 'ROU', 'RWA', 'SKN', 'LCA', 'VIN', 'SMR', // 150
    'STP', 'KSA', 'SEN', 'SRB', 'SEY', 'SLE', 'SVK', 'SLO', 'SOL', 'SOM', // 160
    'RSA', 'SSD', 'ESP', 'SRI', 'SUD', 'SUR', 'SWE', 'SUI', 'SYR', 'TJK', // 170
    'TLS', 'TOG', 'TGA', 'TTO', 'TUN', 'TUR', 'TKM', 'ISV', 'UGA', 'UKR', // 180
    'UAE', 'TAN', 'USA', 'UZB', 'VAN', 'VEN', 'VIE', 'YEM', 'ZAM', 'ZIM', // 190
  ],
  2026: [
    'AFG', 'ALB', 'ALG', 'ASA', 'ANG', 'ANT', 'ARG', 'ARU', 'AUS', 'AUT', // 10
    'AZE', 'BAH', 'BRN', 'BAN', 'BAR', 'BLR', 'BEL', 'BIZ', 'BEN', 'BER', // 20
    'BHU', 'BOL', 'BIH', 'BOT', 'BRA', 'IVB', 'BRU', 'BUL', 'BUR', 'CPV', // 30
    'CAM', 'CMR', 'CAN', 'CAY', 'CAF', 'CHA', 'CHI', 'TPE', 'COL', 'COM', // 40
    'CGO', 'COK', 'CRC', 'CIV', 'CRO', 'CUB', 'CZE', 'PRK', 'COD', 'DEN', // 50
    'DJI', 'DMA', 'DOM', 'ECU', 'EGY', 'ESA', 'GEQ', 'ERI', 'EST', 'SWZ', // 60
    'ETH', 'FSM', 'FIJ', 'FIN', 'FRA', 'GAB', 'GAM', 'GEO', 'GER', 'GHA', // 70
    'GBR', 'GRE', 'GRN', 'GUM', 'GUA', 'GUI', 'GBS', 'GUY', 'HAI', 'HON', // 80
    'HKG', 'HPE', 'HUN', 'IND', 'INA', 'IRQ', 'IRL', 'IRI', 'ISR', 'ITA', // 90
    'JAM', 'JPN', 'JOR', 'KAZ', 'KEN', 'KIR', 'KOS', 'KGZ', 'LAO', 'LAT', // 100
    'LBN', 'LES', 'LBR', 'LBA', 'LTU', 'LUX', 'MAD', 'MAW', 'MAS', 'MDV', // 110
    'MLI', 'MLT', 'MHL', 'MTN', 'MRI', 'MEX', 'MGL', 'MNE', 'MAR', 'MOZ', // 120
    'MYA', 'NAM', 'NEP', 'NED', 'NCA', 'NIG', 'NGR', 'MKD', 'NOR', 'OMA', // 130
    'PAK', 'PLE', 'PAN', 'PNG', 'PAR', 'CHN', 'PER', 'PHI', 'POL', 'POR', // 140
    'PUR', 'QAT', 'KOR', 'MDA', 'ROU', 'RUS', 'RWA', 'SKN', 'LCA', 'VIN', // 150
    'STP', 'SEN', 'SRB', 'SEY', 'SLE', 'SVK', 'SLO', 'SOL', 'SOM', 'RSA', // 160
    'SSD', 'ESP', 'SRI', 'SUD', 'SWE', 'SYR', 'TJK', 'THA', 'TLS', 'TOG', // 170
    'TGA', 'TTO', 'TUN', 'TUR', 'TKM', 'ISV', 'UGA', 'UKR', 'UAE', 'TAN', // 180
    'USA', 'URU', 'UZB', 'VAN', 'VEN', 'VIE', 'YEM', 'ZAM', 'ZIM',        // 190
  ],
};

/**
 * Codes participating in `season`, or null if no list has been added for it
 * yet -- in which case nothing is restricted (every catalog team is
 * selectable) rather than silently offering a different season's teams.
 */
export const getParticipantCodes = (season: number): ReadonlySet<string> | null => {
  const codes = PARTICIPANTS_BY_SEASON[season];
  return codes ? new Set(codes) : null;
};

export const getSelectableCountries = (season: number): CountryInfo[] => {
  const participants = getParticipantCodes(season);
  return participants ? countries.filter(c => participants.has(c.code)) : countries;
};

const currentSeason = getCurrentSeason();
const currentParticipants = getParticipantCodes(currentSeason);

/** Teams that can be picked when creating a request or spare part this season. */
export const selectableCountries: CountryInfo[] = getSelectableCountries(currentSeason);

export const isSelectableCountry = (code: string): boolean => {
  const normalizedCode = code.toUpperCase();
  return countries.some(country => country.code === normalizedCode) &&
    (!currentParticipants || currentParticipants.has(normalizedCode));
};

/**
 * Picker options: the selectable teams, plus `currentCode`'s team if it's
 * not among them (e.g. editing a record from a season that team attended),
 * so the current value never disappears from the picker.
 */
export const getCountryOptions = (currentCode?: string | null): CountryInfo[] => {
  if (!currentCode || isSelectableCountry(currentCode)) return selectableCountries;
  const current = getTeamByCountryCode(currentCode);
  return current ? [...selectableCountries, current] : selectableCountries;
};

// Strips combining diacritical marks after Unicode-decomposing accented
// characters, so a plain-ASCII search (e.g. "cote", "turkiye") still matches
// names like "Côte d'Ivoire" or "Türkiye" that a bare .toLowerCase() can't.
const normalize = (value: string): string =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Shared by searchTeams below and every country/team Autocomplete's
// filterOptions, so "matches" has one definition instead of each caller
// relying on its own getOptionLabel string to incidentally support code search.
export const matchesTeamQuery = (team: { code: string; name: string }, query: string): boolean => {
  const searchTerm = normalize(query.trim());
  if (!searchTerm) return true;
  return normalize(team.name).includes(searchTerm) || team.code.toLowerCase().includes(searchTerm);
};

export const searchTeams = (query: string): CountryInfo[] => {
  return countries.filter(country => matchesTeamQuery(country, query));
};
