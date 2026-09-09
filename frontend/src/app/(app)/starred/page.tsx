import { RepoBrowser } from '@/components/RepoBrowser';

export default function StarredPage() {
  return (
    <RepoBrowser
      title="Starred"
      subtitle="Repositories you've starred for quick access"
      scope="starred"
      searchable
      emptyMessage="You haven't starred any repositories yet. Browse Discover to find useful notes."
    />
  );
}