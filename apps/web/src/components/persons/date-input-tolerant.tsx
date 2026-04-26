'use client';

import { useState } from 'react';
import { DatePrecision } from '@origin/shared-types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface DateInputTolerantProps {
  label: string;
  date: string | undefined;
  precision: DatePrecision;
  yearApproximate: number | undefined;
  onChangeDate: (date: string | undefined) => void;
  onChangePrecision: (precision: DatePrecision) => void;
  onChangeYear: (year: number | undefined) => void;
}

const DECADES = [1940, 1950, 1960, 1970, 1980, 1990, 2000];

export function DateInputTolerant({
  label,
  date,
  precision,
  yearApproximate,
  onChangeDate,
  onChangePrecision,
  onChangeYear,
}: DateInputTolerantProps) {
  const [mode, setMode] = useState<'exact' | 'year' | 'decade' | 'unknown'>(
    precision === DatePrecision.EXACT || precision === DatePrecision.MONTH
      ? 'exact'
      : precision === DatePrecision.YEAR || precision === DatePrecision.APPROXIMATE
        ? 'year'
        : precision === DatePrecision.DECADE
          ? 'decade'
          : 'unknown',
  );

  function handleModeChange(m: typeof mode) {
    setMode(m);
    if (m === 'unknown') {
      onChangePrecision(DatePrecision.UNKNOWN);
      onChangeDate(undefined);
      onChangeYear(undefined);
    } else if (m === 'exact') {
      onChangePrecision(DatePrecision.EXACT);
    } else if (m === 'year') {
      onChangePrecision(DatePrecision.APPROXIMATE);
    } else if (m === 'decade') {
      onChangePrecision(DatePrecision.DECADE);
    }
  }

  return (
    <div className="space-y-3">
      <Label>{label}</Label>

      <div className="flex flex-wrap gap-2">
        {(['exact', 'year', 'decade', 'unknown'] as const).map((m) => (
          <Button
            key={m}
            type="button"
            variant={mode === m ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleModeChange(m)}
          >
            {m === 'exact' ? 'Date precise' : m === 'year' ? 'Annee' : m === 'decade' ? 'Decennie' : 'Je ne sais pas'}
          </Button>
        ))}
      </div>

      {mode === 'exact' && (
        <Input
          type="date"
          value={date ?? ''}
          onChange={(e) => onChangeDate(e.target.value || undefined)}
        />
      )}

      {mode === 'year' && (
        <Input
          type="number"
          placeholder="Ex: 1965"
          min={1800}
          max={2100}
          value={yearApproximate ?? ''}
          onChange={(e) => onChangeYear(e.target.value ? Number(e.target.value) : undefined)}
        />
      )}

      {mode === 'decade' && (
        <div className="flex flex-wrap gap-2">
          {DECADES.map((d) => (
            <Button
              key={d}
              type="button"
              variant={yearApproximate === d ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                onChangeYear(d);
                onChangePrecision(DatePrecision.DECADE);
              }}
            >
              {d}s
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
