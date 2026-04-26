'use client';

import { ZoomIn, ZoomOut, Maximize2, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface TreeControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecenter: () => void;
  degrees: number;
  onDegreesChange: (d: number) => void;
  view: 'tree' | 'list';
  onViewChange: (v: 'tree' | 'list') => void;
  showUnions: boolean;
  onToggleUnions: () => void;
}

export function TreeControls({
  onZoomIn,
  onZoomOut,
  onRecenter,
  degrees,
  onDegreesChange,
  view,
  onViewChange,
  showUnions,
  onToggleUnions,
}: TreeControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-lg border bg-white p-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRecenter}>
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      <Select value={String(degrees)} onValueChange={(v) => onDegreesChange(Number(v))}>
        <SelectTrigger className="h-9 w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">1 degre</SelectItem>
          <SelectItem value="2">2 degres</SelectItem>
          <SelectItem value="3">3 degres</SelectItem>
          <SelectItem value="4">4 degres</SelectItem>
        </SelectContent>
      </Select>

      <Tabs value={view} onValueChange={(v) => onViewChange(v as 'tree' | 'list')}>
        <TabsList className="h-9">
          <TabsTrigger value="tree" className="text-xs">Arbre</TabsTrigger>
          <TabsTrigger value="list" className="text-xs">Liste</TabsTrigger>
        </TabsList>
      </Tabs>

      <Button
        variant="outline"
        size="sm"
        onClick={onToggleUnions}
        aria-pressed={showUnions}
        title={showUnions ? 'Masquer les unions' : 'Afficher les unions'}
        className={cn(
          'h-9 gap-2',
          showUnions && 'border-[#C8663B] bg-[#C8663B]/10 text-[#C8663B] hover:bg-[#C8663B]/15',
        )}
      >
        <Heart className={cn('h-4 w-4', showUnions && 'fill-[#C8663B]')} />
        Unions
      </Button>
    </div>
  );
}
