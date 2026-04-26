'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ComboboxProps {
  value: string | undefined | null;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  id?: string;
  className?: string;
}

export function Combobox({ value, onChange, options, placeholder, id, className }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value ?? '');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = query
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase())).slice(0, 15)
    : options.slice(0, 15);

  useEffect(() => {
    setQuery(value ?? '');
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        inputRef.current && !inputRef.current.contains(e.target as Node) &&
        listRef.current && !listRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(option: string) {
    setQuery(option);
    onChange(option);
    setOpen(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    setOpen(true);
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          className,
        )}
      />
      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-white shadow-lg"
        >
          {filtered.map((option) => (
            <li
              key={option}
              onClick={() => handleSelect(option)}
              className={cn(
                'cursor-pointer px-3 py-2 text-sm hover:bg-forest/10',
                option === value && 'bg-forest/5 font-medium text-forest',
              )}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
