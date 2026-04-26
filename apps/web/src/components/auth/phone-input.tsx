'use client';

import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CountrySelect } from './country-select';
import { detectOperator, isValidE164Phone } from '@/lib/utils/phone';
import { DEFAULT_COUNTRY, splitE164, type Country } from '@/lib/utils/countries';

interface PhoneInputProps {
  value: string;
  onChange: (fullNumber: string) => void;
  disabled?: boolean;
  label?: string;
  /** Inline form errors (e.g. validation messages) — rendered under the field. */
  error?: string;
}

export function PhoneInput({ value, onChange, disabled, label, error }: PhoneInputProps) {
  // Derive the (country, local) split from the canonical E.164 value passed in.
  // The split lives in component state so the user can change country without
  // the parent forcing it back; on every change we propagate the recomposed
  // E.164 string upward, which is the only thing the API and validation see.
  const initial = useMemo(() => {
    if (value && value.startsWith('+') && value.length > 1) return splitE164(value);
    return { country: DEFAULT_COUNTRY, localPart: '' };
  }, []);

  const [country, setCountry] = useState<Country>(initial.country);
  const [localPart, setLocalPart] = useState<string>(initial.localPart);

  // If the parent rewrites `value` from the outside (e.g. form reset, prefill),
  // sync our split state — but only when the canonical doesn't already match.
  useEffect(() => {
    if (!value) {
      setLocalPart('');
      return;
    }
    const composed = `+${country.dialCode}${localPart}`;
    if (composed === value) return;
    const split = splitE164(value);
    setCountry(split.country);
    setLocalPart(split.localPart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function emit(nextCountry: Country, nextLocal: string) {
    const cleanedLocal = nextLocal.replace(/\D/g, '').slice(0, 14);
    setLocalPart(cleanedLocal);
    setCountry(nextCountry);
    onChange(cleanedLocal ? `+${nextCountry.dialCode}${cleanedLocal}` : '');
  }

  const fullE164 = localPart ? `+${country.dialCode}${localPart}` : '';
  const operator = country.iso2 === 'CM' ? detectOperator(fullE164) : null;
  const isValid = !fullE164 || isValidE164Phone(fullE164);

  return (
    <div className="space-y-2">
      <Label htmlFor="phone-local">{label ?? 'Ton numero de telephone'}</Label>
      <div className="flex items-stretch gap-2">
        <CountrySelect
          value={country}
          onChange={(c) => emit(c, localPart)}
          disabled={disabled}
        />
        <div className="relative flex-1">
          <Input
            id="phone-local"
            type="tel"
            inputMode="numeric"
            placeholder="6XX XX XX XX"
            value={localPart}
            onChange={(e) => emit(country, e.target.value)}
            disabled={disabled}
            maxLength={14}
            autoComplete="tel-national"
          />
          {operator && (
            <Badge
              variant="secondary"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
            >
              {operator}
            </Badge>
          )}
        </div>
      </div>
      {error ? (
        <p className="text-xs text-error">{error}</p>
      ) : !isValid ? (
        <p className="text-xs text-error">Numero incomplet ou invalide.</p>
      ) : (
        <p className="text-xs text-charcoal/55">
          Selectionne ton pays puis entre ton numero local.
        </p>
      )}
    </div>
  );
}
