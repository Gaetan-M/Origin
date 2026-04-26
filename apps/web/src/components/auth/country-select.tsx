'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { COUNTRIES, type Country } from '@/lib/utils/countries';
import { cn } from '@/lib/utils';

interface CountrySelectProps {
  value: Country;
  onChange: (country: Country) => void;
  disabled?: boolean;
}

export function CountrySelect({ value, onChange, disabled }: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q.replace(/^\+/, '')) ||
        c.iso2.toLowerCase().includes(q),
    );
  }, [search]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        aria-label="Selectionner un pays"
        aria-expanded={open}
        disabled={disabled}
        className={cn(
          'flex h-10 items-center gap-1.5 rounded-md border border-[var(--input)] bg-[var(--muted)] px-2.5 text-sm font-medium transition-colors hover:bg-sand/60 disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        <span className="text-base leading-none">{value.flag}</span>
        <span className="tabular-nums">+{value.dialCode}</span>
        <ChevronDown className="h-3.5 w-3.5 text-charcoal/55" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-md border border-[var(--input)] bg-white shadow-elevated">
          <div className="flex items-center gap-2 border-b border-[var(--input)] px-3 py-2">
            <Search className="h-4 w-4 text-charcoal/40" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pays, indicatif, code..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-charcoal/40"
            />
          </div>
          <ul className="max-h-72 overflow-y-auto py-1" role="listbox">
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-charcoal/55">
                Aucun pays
              </li>
            ) : (
              filtered.map((c) => {
                const selected = c.iso2 === value.iso2;
                return (
                  <li key={c.iso2}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        onChange(c);
                        setOpen(false);
                        setSearch('');
                      }}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-sand/60',
                        selected && 'bg-forest/[0.08]',
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="text-base leading-none">{c.flag}</span>
                        <span className="truncate">{c.name}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2 text-xs text-charcoal/55">
                        <span className="tabular-nums">+{c.dialCode}</span>
                        {selected && <Check className="h-3.5 w-3.5 text-forest" />}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
