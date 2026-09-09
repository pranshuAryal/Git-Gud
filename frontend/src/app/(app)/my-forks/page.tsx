import { RepoBrowser } from '@/components/RepoBrowser';

export default function MyForksPage() {
  return (
    <RepoBrowser
      title="My Forks"
      subtitle="Repositories you've forked and made your own"
      scope="forked"
      searchable
      emptyMessage="You haven't forked any repositories yet. Discover something interesting to fork."
    />
  );
}