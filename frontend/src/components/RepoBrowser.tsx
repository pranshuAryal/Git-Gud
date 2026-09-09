'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import styles from '@/app/(app)/shared/pageStyles.module.css';
import { fetchRepositories, RepoCardData } from '@/lib/api';
import { RepoCard } from '@/components/RepoCard';

export function RepoBrowser({
  title,
  subtitle,
  scope,
  searchable = false,
  emptyMessage,
  pageSize = 12,
}: {
  title: string;
  subtitle: string;
  scope: 'owned' | 'forked' | 'discover' | 'starred';
  searchable?: boolean;
  emptyMessage?: string;
  pageSize?: number;
}) {
  const [repos, setRepos] = useState<RepoCardData[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    fetchRepositories({
      scope,
      page,
      limit: pageSize,
      search: debouncedSearch || undefined,
    })
      .then((data) => {
        if (cancelled) return;
        setRepos(data.items);
        setHasMore(data.hasMore);
        setTotal(data.total);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Something went wrong');
      });

    return () => {
      cancelled = true;
    };
  }, [scope, page, pageSize, debouncedSearch]);

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>{title}</h1>
      <p className={styles.pageSubtitle}>{subtitle}</p>

      {searchable && (
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search..."
            className={styles.searchInput}
          />
        </div>
      )}

      {error && <div className={styles.errorBanner}>{error}</div>}

      {!error && repos === null && (
        <div className={styles.grid}>
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
        </div>
      )}

      {!error && repos !== null && repos.length === 0 && (
        <div className={styles.emptyState}>
          {emptyMessage || 'Nothing here yet.'}
        </div>
      )}

      {!error && repos !== null && repos.length > 0 && (
        <>
          <div className={styles.grid}>
            {repos.map((repo) => (
              <RepoCard key={repo.id} repo={repo} />
            ))}
          </div>

          {(hasMore || page > 1) && (
            <div className={styles.pagination}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={styles.paginationButton}
              >
                Previous
              </button>
              <span className={styles.paginationInfo}>
                Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore}
                className={styles.paginationButton}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}