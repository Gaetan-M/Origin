// Generic E.164 validator: starts with +, country code 1-3 digits (no leading 0),
// total 8-16 chars including the +. Covers any country.
const E164_RE = /^\+[1-9]\d{6,14}$/;

export function isValidE164Phone(phone: string): boolean {
  return E164_RE.test(phone);
}

// Kept as an alias so existing call sites keep compiling. Now validates any country.
export function isValidCameroonPhone(phone: string): boolean {
  return isValidE164Phone(phone);
}

export function formatPhoneDisplay(phone: string): string {
  if (!isValidE164Phone(phone)) return phone;
  // Cameroon-style spacing kept for +237 since UI strings depend on it; for
  // all other countries we just group 3 digits at a time after the country code.
  if (phone.startsWith('+237')) {
    const local = phone.slice(4);
    if (local.length === 9) {
      return `+237 ${local.slice(0, 1)} ${local.slice(1, 3)} ${local.slice(3, 5)} ${local.slice(5, 7)} ${local.slice(7, 9)}`;
    }
    if (local.length === 8) {
      return `+237 ${local.slice(0, 2)} ${local.slice(2, 4)} ${local.slice(4, 6)} ${local.slice(6, 8)}`;
    }
  }
  // Generic grouping: split country code (best effort: 1-3 digits) then groups of 3.
  const cc = detectCountryCode(phone) ?? phone.slice(1, 4);
  const rest = phone.slice(1 + cc.length);
  const grouped = rest.match(/.{1,3}/g)?.join(' ') ?? rest;
  return `+${cc} ${grouped}`;
}

export function detectOperator(phone: string): string | null {
  if (!phone.startsWith('+237')) return null;
  const local = phone.replace('+237', '');
  if (/^6[5-9]/.test(local)) return 'MTN';
  if (/^6[0-4]/.test(local)) return 'Orange';
  if (/^2[0-9]/.test(local)) return 'Camtel';
  return null;
}

// Best-effort detection of the country dial code from an E.164 string.
// Not exhaustive; falls back to null for unknown codes (caller should
// then assume a 1-3 digit prefix as needed).
const KNOWN_COUNTRY_CODES = [
  '1', '7', '20', '27', '30', '31', '32', '33', '34', '36', '39', '40',
  '41', '43', '44', '45', '46', '47', '48', '49', '51', '52', '53', '54',
  '55', '56', '57', '58', '60', '61', '62', '63', '64', '65', '66', '81',
  '82', '84', '86', '90', '91', '92', '93', '94', '95', '98',
  '210', '211', '212', '213', '216', '218', '220', '221', '222', '223',
  '224', '225', '226', '227', '228', '229', '230', '231', '232', '233',
  '234', '235', '236', '237', '238', '239', '240', '241', '242', '243',
  '244', '245', '246', '248', '249', '250', '251', '252', '253', '254',
  '255', '256', '257', '258', '260', '261', '262', '263', '264', '265',
  '266', '267', '268', '269', '290', '291', '297', '298', '299',
  '350', '351', '352', '353', '354', '355', '356', '357', '358', '359',
  '370', '371', '372', '373', '374', '375', '376', '377', '378', '380',
  '381', '382', '383', '385', '386', '387', '389', '420', '421', '423',
];

export function detectCountryCode(phone: string): string | null {
  if (!phone.startsWith('+')) return null;
  const digits = phone.slice(1);
  for (const len of [3, 2, 1]) {
    const candidate = digits.slice(0, len);
    if (KNOWN_COUNTRY_CODES.includes(candidate)) return candidate;
  }
  return null;
}
