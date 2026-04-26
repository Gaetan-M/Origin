import { LifeStatus } from '@origin/shared-types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, getAvatarColor } from '@/lib/utils/format-name';
import { cn } from '@/lib/utils';

interface PersonAvatarProps {
  id: string;
  displayName: string;
  lifeStatus: LifeStatus;
  photoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'h-10 w-10 text-xs',
  md: 'h-16 w-16 text-sm',
  lg: 'h-24 w-24 text-base',
  xl: 'h-40 w-40 text-2xl',
};

const BORDER_CLASSES = {
  sm: 'ring-2',
  md: 'ring-2',
  lg: 'ring-[3px]',
  xl: 'ring-4',
};

function getBorderColor(status: LifeStatus): string {
  switch (status) {
    case LifeStatus.ALIVE: return 'ring-forest';
    case LifeStatus.DECEASED: return 'ring-gray-400';
    case LifeStatus.UNKNOWN: return 'ring-ochre';
  }
}

export function PersonAvatar({ id, displayName, lifeStatus, photoUrl, size = 'md', className }: PersonAvatarProps) {
  const initials = getInitials(displayName);
  const color = getAvatarColor(id);

  return (
    <Avatar className={cn(SIZE_CLASSES[size], BORDER_CLASSES[size], getBorderColor(lifeStatus), className)}>
      {photoUrl && <AvatarImage src={photoUrl} alt={displayName} />}
      <AvatarFallback style={{ backgroundColor: color, color: 'white' }}>{initials}</AvatarFallback>
    </Avatar>
  );
}
