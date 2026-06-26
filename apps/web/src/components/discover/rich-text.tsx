import { Fragment } from 'react';
import { cn } from '@/lib/utils';

/** Renders inline **bold** segments within a single line. */
function renderInline(line: string): React.ReactNode {
  const parts = line.split('**');
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-charcoal">
        {part}
      </strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

interface RichTextProps {
  text: string;
  className?: string;
  /** When set, only the first N non-empty lines are shown, with an ellipsis. */
  maxLines?: number;
}

/**
 * Lightweight reader for the markdown-ish cultural bodies. Lines that are wholly
 * wrapped in `**…**` (e.g. `**Origine**`) become small section headings; inline
 * `**bold**` is emphasised. Intentionally tiny — no heavy markdown dependency.
 * Truncation happens at line granularity so emphasis markers stay balanced.
 */
export function RichText({ text, className, maxLines }: RichTextProps) {
  const allLines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const truncated = typeof maxLines === 'number' && allLines.length > maxLines;
  const lines = truncated ? allLines.slice(0, maxLines) : allLines;

  return (
    <div className={cn('space-y-1.5', className)}>
      {lines.map((line, i) => {
        const isLast = i === lines.length - 1;
        const suffix = truncated && isLast ? '…' : '';
        const heading = /^\*\*(.+?)\*\*:?$/.exec(line);
        if (heading) {
          return (
            <p key={i} className="pt-1 text-sm font-bold text-charcoal">
              {heading[1]}
              {suffix}
            </p>
          );
        }
        return (
          <p key={i} className="text-sm leading-relaxed text-charcoal/80">
            {renderInline(line)}
            {suffix}
          </p>
        );
      })}
    </div>
  );
}
