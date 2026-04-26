// Subset focused on Africa + the largest diaspora destinations. Each entry is
// kept minimal so the bundle stays small. Add more here as needed — order
// inside the same continent group is alphabetical by `name`.
export interface Country {
  iso2: string;
  name: string;
  dialCode: string; // without leading "+"
  flag: string;
}

export const COUNTRIES: Country[] = [
  // Africa
  { iso2: 'DZ', name: 'Algerie', dialCode: '213', flag: '🇩🇿' },
  { iso2: 'AO', name: 'Angola', dialCode: '244', flag: '🇦🇴' },
  { iso2: 'BJ', name: 'Benin', dialCode: '229', flag: '🇧🇯' },
  { iso2: 'BW', name: 'Botswana', dialCode: '267', flag: '🇧🇼' },
  { iso2: 'BF', name: 'Burkina Faso', dialCode: '226', flag: '🇧🇫' },
  { iso2: 'BI', name: 'Burundi', dialCode: '257', flag: '🇧🇮' },
  { iso2: 'CM', name: 'Cameroun', dialCode: '237', flag: '🇨🇲' },
  { iso2: 'CV', name: 'Cap-Vert', dialCode: '238', flag: '🇨🇻' },
  { iso2: 'CF', name: 'Centrafrique', dialCode: '236', flag: '🇨🇫' },
  { iso2: 'TD', name: 'Tchad', dialCode: '235', flag: '🇹🇩' },
  { iso2: 'KM', name: 'Comores', dialCode: '269', flag: '🇰🇲' },
  { iso2: 'CG', name: 'Congo', dialCode: '242', flag: '🇨🇬' },
  { iso2: 'CD', name: 'RD Congo', dialCode: '243', flag: '🇨🇩' },
  { iso2: 'CI', name: "Cote d'Ivoire", dialCode: '225', flag: '🇨🇮' },
  { iso2: 'DJ', name: 'Djibouti', dialCode: '253', flag: '🇩🇯' },
  { iso2: 'EG', name: 'Egypte', dialCode: '20', flag: '🇪🇬' },
  { iso2: 'GQ', name: 'Guinee equatoriale', dialCode: '240', flag: '🇬🇶' },
  { iso2: 'ER', name: 'Erythree', dialCode: '291', flag: '🇪🇷' },
  { iso2: 'SZ', name: 'Eswatini', dialCode: '268', flag: '🇸🇿' },
  { iso2: 'ET', name: 'Ethiopie', dialCode: '251', flag: '🇪🇹' },
  { iso2: 'GA', name: 'Gabon', dialCode: '241', flag: '🇬🇦' },
  { iso2: 'GM', name: 'Gambie', dialCode: '220', flag: '🇬🇲' },
  { iso2: 'GH', name: 'Ghana', dialCode: '233', flag: '🇬🇭' },
  { iso2: 'GN', name: 'Guinee', dialCode: '224', flag: '🇬🇳' },
  { iso2: 'GW', name: 'Guinee-Bissau', dialCode: '245', flag: '🇬🇼' },
  { iso2: 'KE', name: 'Kenya', dialCode: '254', flag: '🇰🇪' },
  { iso2: 'LS', name: 'Lesotho', dialCode: '266', flag: '🇱🇸' },
  { iso2: 'LR', name: 'Liberia', dialCode: '231', flag: '🇱🇷' },
  { iso2: 'LY', name: 'Libye', dialCode: '218', flag: '🇱🇾' },
  { iso2: 'MG', name: 'Madagascar', dialCode: '261', flag: '🇲🇬' },
  { iso2: 'MW', name: 'Malawi', dialCode: '265', flag: '🇲🇼' },
  { iso2: 'ML', name: 'Mali', dialCode: '223', flag: '🇲🇱' },
  { iso2: 'MR', name: 'Mauritanie', dialCode: '222', flag: '🇲🇷' },
  { iso2: 'MU', name: 'Maurice', dialCode: '230', flag: '🇲🇺' },
  { iso2: 'MA', name: 'Maroc', dialCode: '212', flag: '🇲🇦' },
  { iso2: 'MZ', name: 'Mozambique', dialCode: '258', flag: '🇲🇿' },
  { iso2: 'NA', name: 'Namibie', dialCode: '264', flag: '🇳🇦' },
  { iso2: 'NE', name: 'Niger', dialCode: '227', flag: '🇳🇪' },
  { iso2: 'NG', name: 'Nigeria', dialCode: '234', flag: '🇳🇬' },
  { iso2: 'RW', name: 'Rwanda', dialCode: '250', flag: '🇷🇼' },
  { iso2: 'ST', name: 'Sao Tome-et-Principe', dialCode: '239', flag: '🇸🇹' },
  { iso2: 'SN', name: 'Senegal', dialCode: '221', flag: '🇸🇳' },
  { iso2: 'SC', name: 'Seychelles', dialCode: '248', flag: '🇸🇨' },
  { iso2: 'SL', name: 'Sierra Leone', dialCode: '232', flag: '🇸🇱' },
  { iso2: 'SO', name: 'Somalie', dialCode: '252', flag: '🇸🇴' },
  { iso2: 'ZA', name: 'Afrique du Sud', dialCode: '27', flag: '🇿🇦' },
  { iso2: 'SS', name: 'Soudan du Sud', dialCode: '211', flag: '🇸🇸' },
  { iso2: 'SD', name: 'Soudan', dialCode: '249', flag: '🇸🇩' },
  { iso2: 'TZ', name: 'Tanzanie', dialCode: '255', flag: '🇹🇿' },
  { iso2: 'TG', name: 'Togo', dialCode: '228', flag: '🇹🇬' },
  { iso2: 'TN', name: 'Tunisie', dialCode: '216', flag: '🇹🇳' },
  { iso2: 'UG', name: 'Ouganda', dialCode: '256', flag: '🇺🇬' },
  { iso2: 'ZM', name: 'Zambie', dialCode: '260', flag: '🇿🇲' },
  { iso2: 'ZW', name: 'Zimbabwe', dialCode: '263', flag: '🇿🇼' },

  // Diaspora
  { iso2: 'FR', name: 'France', dialCode: '33', flag: '🇫🇷' },
  { iso2: 'BE', name: 'Belgique', dialCode: '32', flag: '🇧🇪' },
  { iso2: 'CA', name: 'Canada', dialCode: '1', flag: '🇨🇦' },
  { iso2: 'US', name: 'Etats-Unis', dialCode: '1', flag: '🇺🇸' },
  { iso2: 'GB', name: 'Royaume-Uni', dialCode: '44', flag: '🇬🇧' },
  { iso2: 'DE', name: 'Allemagne', dialCode: '49', flag: '🇩🇪' },
  { iso2: 'IT', name: 'Italie', dialCode: '39', flag: '🇮🇹' },
  { iso2: 'ES', name: 'Espagne', dialCode: '34', flag: '🇪🇸' },
  { iso2: 'PT', name: 'Portugal', dialCode: '351', flag: '🇵🇹' },
  { iso2: 'NL', name: 'Pays-Bas', dialCode: '31', flag: '🇳🇱' },
  { iso2: 'CH', name: 'Suisse', dialCode: '41', flag: '🇨🇭' },
  { iso2: 'AE', name: 'Emirats arabes unis', dialCode: '971', flag: '🇦🇪' },
  { iso2: 'SA', name: 'Arabie saoudite', dialCode: '966', flag: '🇸🇦' },
  { iso2: 'CN', name: 'Chine', dialCode: '86', flag: '🇨🇳' },
  { iso2: 'IN', name: 'Inde', dialCode: '91', flag: '🇮🇳' },
  { iso2: 'AU', name: 'Australie', dialCode: '61', flag: '🇦🇺' },
];

export const DEFAULT_COUNTRY: Country =
  COUNTRIES.find((c) => c.iso2 === 'CM') ?? COUNTRIES[0];

export function findCountryByDialCode(dialCode: string): Country | null {
  // Iterate by dialCode length descending so "1242" (Bahamas if added) won't
  // be eaten by "1" (US/Canada). Multi-country dial codes like "1" return the
  // first match in the array order — good enough for input prefix detection.
  const sorted = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  return sorted.find((c) => c.dialCode === dialCode) ?? null;
}

export function findCountryByIso2(iso2: string): Country | null {
  return COUNTRIES.find((c) => c.iso2.toLowerCase() === iso2.toLowerCase()) ?? null;
}

/**
 * Splits an E.164 string like "+237690000000" into { dialCode: '237',
 * localPart: '690000000' }. Falls back to the default country if no match.
 */
export function splitE164(e164: string): { country: Country; localPart: string } {
  if (e164.startsWith('+')) {
    const digits = e164.slice(1);
    // Try lengths 3, 2, 1 in that order to match the longest known dial code.
    for (const len of [3, 2, 1]) {
      const candidate = digits.slice(0, len);
      const c = findCountryByDialCode(candidate);
      if (c) return { country: c, localPart: digits.slice(len) };
    }
  }
  return { country: DEFAULT_COUNTRY, localPart: e164.replace(/^\+?\d{0,4}/, '') };
}
