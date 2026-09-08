'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Plus } from 'lucide-react';
import styles from './dashboard.module.css';
import { fetchRepositories, RepoCardData } from '@/lib/repositories';
import { RepoCard } from '@/components/RepoCard';

const PREVIEW_LIMIT = 4;

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);
  return debounced;
}

function RepoSection({
  title,
  viewAllHref,
  scope,
  search,
}: {
  title: string;
  viewAllHref: string;
  scope: 'owned' | 'forked';
  search: string;
}) {
  const [repos, setRepos] = useState<RepoCardData[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchRepositories({ scope, limit: PREVIEW_LIMIT, search: search || undefined })
      .then((data) => {
        if (cancelled) return;
        setRepos(data.items);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Something went wrong');
      });

    return () => {
      cancelled = true;
    };
  }, [scope, search]);

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <Link href={viewAllHref} className={styles.viewAllLink}>
          View all
        </Link>
      </div>

      {error && <p className={styles.errorBanner}>{error}</p>}

      {!error && repos === null && (
        <div className={styles.grid}>
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
        </div>
      )}

      {!error && repos !== null && repos.length === 0 && (
        <div className={styles.emptyState}>
          {scope === 'owned'
            ? "You haven't created any repositories yet."
            : "You haven't forked any repositories yet."}
        </div>
      )}

      {!error && repos !== null && repos.length > 0 && (
        <div className={styles.grid}>
          {repos.map((repo) => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function DashboardPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  return (
    <div className={styles.page}>
      <div className={styles.topRow}>
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your repositories..."
            className={styles.searchInput}
          />
        </div>

        <Link href="/dashboard/new-repo" className={styles.newRepoButton}>
          <Plus size={16} />
          New repository
        </Link>
      </div>

      <RepoSection title="Your Repositories" viewAllHref="/my-repositories" scope="owned" search={debouncedSearch} />
      <RepoSection title="Your Forks" viewAllHref="/my-forks" scope="forked" search={debouncedSearch} />
    </div>
  );
}