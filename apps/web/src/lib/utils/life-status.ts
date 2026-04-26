import { LifeStatus } from '@origin/shared-types';

const LABELS_FR: Record<LifeStatus, string> = {
  [LifeStatus.ALIVE]: 'En vie',
  [LifeStatus.DECEASED]: 'Decede(e)',
  [LifeStatus.UNKNOWN]: 'Ne sait pas',
};

const LABELS_EN: Record<LifeStatus, string> = {
  [LifeStatus.ALIVE]: 'Alive',
  [LifeStatus.DECEASED]: 'Deceased',
  [LifeStatus.UNKNOWN]: 'Unknown',
};

export function getLifeStatusLabel(status: LifeStatus, locale = 'fr'): string {
  const labels = locale === 'en' ? LABELS_EN : LABELS_FR;
  return labels[status] ?? status;
}

export function getLifeStatusColor(status: LifeStatus): string {
  switch (status) {
    case LifeStatus.ALIVE: return 'text-forest';
    case LifeStatus.DECEASED: return 'text-gray-500';
    case LifeStatus.UNKNOWN: return 'text-ochre';
  }
}

export function getLifeStatusBorderColor(status: LifeStatus): string {
  switch (status) {
    case LifeStatus.ALIVE: return 'border-forest';
    case LifeStatus.DECEASED: return 'border-gray-400';
    case LifeStatus.UNKNOWN: return 'border-ochre';
  }
}
