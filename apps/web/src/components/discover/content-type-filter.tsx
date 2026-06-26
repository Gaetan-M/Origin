'use client';

import { CULTURAL_CONTENT_TYPES } from '@/lib/api/cultural';
import type { CulturalContentType } from '@/lib/api/cultural';
import { cn } from '@/lib/utils';
import { useContentTypeLabel, useDiscoverT } from './discover-i18n';

interface ContentTypeFilterProps {
  value: CulturalContentType | null;
  onChange: (value: CulturalContentType | null) => void;
}

/** Horizontally-scrollable, low-data facet chips for the discovery feed. */
export function ContentTypeFilter({ value, onChange }: ContentTypeFilterProps) {
  const t = useDiscoverT();
  const typeLabel = useContentTypeLabel();

  return (
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <Chip active={value === null} onClick={() => onChange(null)} label={t('filterAll')} />
      {CULTURAL_CONTENT_TYPES.map((type) => (
        <Chip
          key={type}
          active={value === type}
          onClick={() => onChange(type)}
          label={typeLabel(type)}
        />
      ))}
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
        active
          ? 'border-forest bg-forest text-white'
          : 'border-sand bg-white text-charcoal/70 hover:bg-sand',
      )}
    >
      {label}
    </button>
  );
}
