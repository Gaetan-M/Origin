'use client';

import { useCallback, useMemo, useState } from 'react';
import Image from 'next/image';
import type { FamilyTree as FamilyTreeType, Person } from '@origin/shared-types';
import { TreeControls } from './tree-controls';
import { RadialTree } from './radial-tree';
import { ListTree } from './list-tree';
import { PersonSheet } from './person-sheet';
import { TreeLegend } from './tree-legend';

interface FamilyTreeProps {
  data: FamilyTreeType;
  degrees: number;
  onDegreesChange: (d: number) => void;
  /**
   * Invoked when the user clicks a spouse node and wants to re-center the
   * tree on that person instead of opening the details sheet.
   */
  onJumpToPerson?: (personId: string) => void;
}

// Labels that represent pure blood-line relations. Any neighbor carrying
// one of these (or an ANCESTOR_N / DESCENDANT_N variant) is kept in the
// tree; SPOUSE is kept only when it is a degree-1 direct spouse.
const BLOOD_LABELS = new Set([
  'PARENT',
  'GRANDPARENT',
  'GREAT_GRANDPARENT',
  'SIBLING',
  'CHILD',
  'GRANDCHILD',
  'GREAT_GRANDCHILD',
  'UNCLE_AUNT',
  'NEPHEW_NIECE',
  'COUSIN',
]);

export function FamilyTreeView({
  data,
  degrees,
  onDegreesChange,
  onJumpToPerson,
}: FamilyTreeProps) {
  const [zoom, setZoom] = useState(1);
  const [view, setView] = useState<'tree' | 'list'>('tree');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Union markers (double-line between married partners) are on by
  // default. The toggle stays available so the user can hide them for a
  // cleaner pedigree-only view when needed.
  const [showUnions, setShowUnions] = useState(true);

  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(z + 0.2, 3)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(z - 0.2, 0.3)), []);
  const handleRecenter = useCallback(() => setZoom(1), []);
  const handleToggleUnions = useCallback(() => setShowUnions((v) => !v), []);

  // Filtered view of the backend data: strip every neighbor that is
  // neither a direct blood relation nor a degree-1 spouse, and drop
  // unions whose partners are no longer visible.
  const visibleData = useMemo<FamilyTreeType>(() => {
    const visibleNeighbors = data.neighbors.filter((n) => {
      const label = n.relationshipLabel;
      if (label === 'SPOUSE') return n.degree === 1;
      if (BLOOD_LABELS.has(label)) return true;
      if (label.startsWith('ANCESTOR_') || label.startsWith('DESCENDANT_')) {
        return true;
      }
      // RELATIVE is the catch-all for complex paths that mix blood and
      // marriage edges — excluded.
      return false;
    });

    const visibleIds = new Set<string>([
      data.center.id,
      ...visibleNeighbors.map((n) => n.personId),
    ]);
    const visibleUnions = (data.unions ?? []).filter(
      (u) => visibleIds.has(u.personAId) && visibleIds.has(u.personBId),
    );

    return {
      center: data.center,
      neighbors: visibleNeighbors,
      unions: visibleUnions,
    };
  }, [data]);

  function handleSelectPerson(person: Person) {
    setSelectedPerson(person);
    setSheetOpen(true);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4">
        <TreeControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onRecenter={handleRecenter}
          degrees={degrees}
          onDegreesChange={onDegreesChange}
          view={view}
          onViewChange={setView}
          showUnions={showUnions}
          onToggleUnions={handleToggleUnions}
        />
      </div>

      <div className="relative flex-1 overflow-hidden rounded-xl border bg-white">
        {view === 'tree' ? (
          <div className="relative flex h-[calc(100vh-250px)] items-center justify-center">
            {/* Subtle Origin watermark: the brand silhouette, heavily
                blurred and at low opacity, anchored behind the canvas so
                the tree remains the hero. */}
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              aria-hidden
            >
              <Image
                src="/origin-logo.png"
                alt=""
                width={360}
                height={560}
                className="h-[70%] w-auto opacity-[0.06] blur-[1px] select-none"
                priority={false}
              />
            </div>
            <div className="relative h-full w-full">
              <RadialTree
                data={visibleData}
                zoom={zoom}
                onSelectPerson={handleSelectPerson}
                onJumpToPerson={onJumpToPerson}
                showUnions={showUnions}
              />
            </div>
          </div>
        ) : (
          <div className="max-h-[calc(100vh-250px)] overflow-y-auto p-4">
            <ListTree data={visibleData} onSelectPerson={handleSelectPerson} />
          </div>
        )}
      </div>

      {view === 'tree' && (
        <div className="mt-3">
          <TreeLegend />
        </div>
      )}

      <PersonSheet person={selectedPerson} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
