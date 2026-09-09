const AVATAR_COLORS = [
  "#7c3aed",
  "#059669",
  "#dc2626",
  "#d97706",
  "#2563eb",
];

export function avatarColor(username: string): string {
  if (!username) return AVATAR_COLORS[0];
  return AVATAR_COLORS[username.charCodeAt(0) % AVATAR_COLORS.length];
}

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}