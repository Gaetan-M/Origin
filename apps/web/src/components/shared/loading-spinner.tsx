import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  className?: string;
  size?: number;
}

/**
 * Small-scale spinner for inline usage. Keeps the plain Loader2 icon so it
 * fits inside buttons, cards, and tight spaces.
 */
export function LoadingSpinner({ className, size = 24 }: LoadingSpinnerProps) {
  return <Loader2 className={cn('animate-spin text-forest', className)} size={size} />;
}

/**
 * Branded full-page loader: the Origin tree logo sits in the middle with a
 * soft pulsing halo behind it. Meant to be used whenever a route boundary
 * or Suspense fallback needs to cover the whole viewport.
 */
export function FullPageSpinner() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <div className="relative">
        <div
          className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-ochre/30 via-terracotta/20 to-forest/25 blur-2xl anim-pulse-soft"
          aria-hidden
        />
        <Image
          src="/origin-logo.png"
          alt="Origin"
          width={72}
          height={112}
          priority
          className="anim-float h-16 w-auto"
        />
      </div>
      <div className="flex items-center gap-2 text-sm font-medium tracking-wide text-charcoal/55">
        <span className="h-1.5 w-1.5 rounded-full bg-forest anim-pulse-soft" />
        Chargement
      </div>
    </div>
  );
}
