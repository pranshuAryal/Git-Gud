import { RepoBrowser } from '@/components/RepoBrowser';

export default function DiscoverPage() {
  return (
    <RepoBrowser
      title="Discover"
      subtitle="Browse public repositories from the Git-Gud community"
      scope="discover"
      searchable
      emptyMessage="No public repositories found."
    />
  );
}