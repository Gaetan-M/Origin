const AVATAR_COLORS = [
  '#2D7A4B', '#C8663B', '#D9A441', '#1E3A5F',
  '#7C3AED', '#DB2777', '#059669', '#D97706',
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function getInitials(displayName: string): string {
  if (!displayName) return '??';
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getAvatarColor(id: string): string {
  return AVATAR_COLORS[hashString(id) % AVATAR_COLORS.length];
}

export function formatDisplayName(displayName: string): string {
  return displayName;
}
