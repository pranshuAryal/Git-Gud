'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { GitMerge, ArrowLeft } from 'lucide-react';
import { fetchMergeRequests, MergeRequestData } from '@/lib/mergeRequests';
import { formatRelativeTime, avatarColor } from '@/lib/format';
import styles from './mergeRequests.module.css';

type StatusTab = 'all' | 'pending' | 'approved' | 'rejected';

const TABS: { value: StatusTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const STATUS_BADGE: Record<string, string> = {
  pending: styles.statusPending,
  approved: styles.statusApproved,
  rejected: styles.statusRejected,
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

export default function RepoMergeRequestsPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<StatusTab>('all');
  const [requests, setRequests] = useState<MergeRequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMergeRequests({
      repoId: id,
      ...(tab !== 'all' ? { status: tab } : {}),
    })
      .then((data) => {
        if (!cancelled) setRequests(data);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load merge requests');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, tab]);

  const changeTab = (next: StatusTab) => {
    setTab(next);
    setLoading(true);
    setError(null);
  };

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <Link href={`/repos/${id}`} className={styles.backLink}>
          <ArrowLeft size={13} /> Back to repository
        </Link>
      </div>

      <h1 className={styles.pageTitle}>Merge Requests</h1>
      <p className={styles.pageSubtitle}>Contributions proposed for this repository</p>

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => changeTab(t.value)}
            className={`${styles.tab} ${tab === t.value ? styles.activeTab : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {loading && (
        <div className={styles.loadingSkeleton}>
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLine} />
        </div>
      )}

      {!loading && requests.length === 0 && (
        <div className={styles.emptyState}>
          {tab === 'all'
            ? 'No merge requests have been submitted for this repository yet.'
            : `No ${tab} merge requests.`}
        </div>
      )}

      <div className={styles.list}>
        {requests.map((mr) => (
          <Link
            key={mr.id}
            href={`/merge-requests/${mr.id}`}
            className={styles.item}
          >
            <div className={styles.itemHeader}>
              <h3 className={styles.itemTitle}>
                <GitMerge size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: '#6b7280' }} />
                {mr.title}
              </h3>
              <span className={`${styles.statusBadge} ${STATUS_BADGE[mr.status] || STATUS_BADGE.pending}`}>
                {STATUS_LABEL[mr.status] || 'Pending'}
              </span>
            </div>
            <div className={styles.itemMeta}>
              <span
                className={styles.avatar}
                style={{ background: avatarColor(mr.submitter.username) }}
              >
                {mr.submitter.username.slice(0, 2).toUpperCase()}
              </span>
              <span>
                <strong>{mr.submitter.username}</strong> · section{' '}
                <strong>{mr.note.section.title}</strong>
              </span>
              <span className={styles.itemTime}>{formatRelativeTime(mr.createdAt)}</span>
            </div>
            {mr.description && <p className={styles.itemDescription}>{mr.description}</p>}
            {mr.feedback && (
              <div className={styles.feedback}>
                <strong>Reviewer feedback:</strong> {mr.feedback}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}