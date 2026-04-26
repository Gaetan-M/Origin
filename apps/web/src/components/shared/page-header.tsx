'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function PageHeader({ title, showBack, action }: PageHeaderProps) {
  const router = useRouter();

  return (
    <div className="mb-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {showBack && (
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-2xl font-bold text-charcoal">{title}</h1>
      </div>
      {action && (
        <Button onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}
