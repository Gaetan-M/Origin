'use client';

import { LifeStatus } from '@origin/shared-types';
import { cn } from '@/lib/utils';

interface LifeStatusSelectorProps {
  value: LifeStatus | undefined;
  onChange: (status: LifeStatus) => void;
}

const OPTIONS = [
  { value: LifeStatus.ALIVE, emoji: '\uD83C\uDF3F', label: 'En vie', color: 'border-forest bg-forest/5 text-forest' },
  { value: LifeStatus.DECEASED, emoji: '\uD83D\uDD4A\uFE0F', label: 'Decede(e)', color: 'border-gray-400 bg-gray-50 text-gray-600' },
  { value: LifeStatus.UNKNOWN, emoji: '\u2753', label: 'Ne sait pas', color: 'border-ochre bg-ochre/5 text-ochre' },
];

export function LifeStatusSelector({ value, onChange }: LifeStatusSelectorProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all hover:shadow-card',
            value === opt.value ? opt.color : 'border-transparent bg-white',
          )}
        >
          <span className="text-2xl">{opt.emoji}</span>
          <span className="text-sm font-medium">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
