import { RepoBrowser } from '@/components/RepoBrowser';

export default function MyRepositoriesPage() {
  return (
    <RepoBrowser
      title="My Repositories"
      subtitle="All repositories you've created"
      scope="owned"
      searchable
      emptyMessage="You haven't created any repositories yet. Head to the dashboard to make one."
    />
  );
}