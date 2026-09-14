'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GitMerge, Check, X, ExternalLink } from 'lucide-react';
import {
  fetchMergeRequests,
  updateMergeRequestStatus,
  MergeRequestData,
} from '@/lib/mergeRequests';
import { useAuth } from '@/app/context/AuthContext';
import { formatRelativeTime, avatarColor } from '@/lib/format';
import styles from './merges.module.css';

type Scope = 'received' | 'submitted';

const STATUS_BADGE: Record<string, string> = {
  pending: styles.statusPending,
  approved: styles.statusApproved,
  rejected: styles.statusRejected,
  cancelled: styles.statusCancelled,
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export default function MergeRequestsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Scope>('received');
  const [requests, setRequests] = useState<MergeRequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchMergeRequests({ scope: tab })
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
  }, [tab, reloadKey]);

  const handleStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const feedback =
        status === 'rejected'
          ? window.prompt?.('Reason for rejection (optional):') || undefined
          : undefined;
      await updateMergeRequestStatus(id, { status, feedback });
      setReloadKey((k) => k + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update request');
    }
  };

  const openDetail = (id: string) => router.push(`/merge-requests/${id}`);

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Merge Requests</h1>
      <p className={styles.pageSubtitle}>
        Review contributions and track your submissions
      </p>

      <div className={styles.tabs}>
        <button
          onClick={() => setTab('received')}
          className={`${styles.tab} ${tab === 'received' ? styles.activeTab : ''}`}
        >
          Received
        </button>
        <button
          onClick={() => setTab('submitted')}
          className={`${styles.tab} ${tab === 'submitted' ? styles.activeTab : ''}`}
        >
          Submitted
        </button>
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
          {tab === 'received'
            ? 'No merge requests on your repositories yet.'
            : "You haven't submitted any merge requests yet."}
        </div>
      )}

      <div className={styles.list}>
        {requests.map((mr) => {
          const badge = STATUS_BADGE[mr.status] || STATUS_BADGE.pending;
          const isOwner = user && mr.repo.ownerId && user.userId === mr.repo.ownerId;

          return (
            <div
              key={mr.id}
              role="button"
              tabIndex={0}
              onClick={() => openDetail(mr.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openDetail(mr.id);
                }
              }}
              className={styles.item}
            >
              <div className={styles.itemHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <h3 className={styles.itemTitle}>
                    <GitMerge size={16} style={{ verticalAlign: '-2px', marginRight: 6, color: '#6b7280' }} />
                    {mr.title}
                  </h3>
                  <span className={`${styles.statusBadge} ${badge}`}>
                    {STATUS_LABEL[mr.status] || 'Pending'}
                  </span>
                </div>

                {isOwner && mr.status === 'pending' && (
                  <div className={styles.statusActions}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleStatus(mr.id, 'approved');
                      }}
                      className={`${styles.statusAction} ${styles.approveAction}`}
                      title="Approve"
                    >
                      <Check size={14} /> Approve
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleStatus(mr.id, 'rejected');
                      }}
                      className={`${styles.statusAction} ${styles.rejectAction}`}
                      title="Reject"
                    >
                      <X size={14} /> Reject
                    </button>
                  </div>
                )}
              </div>

              <div className={styles.itemMeta}>
                <span
                  className={styles.avatar}
                  style={{ background: avatarColor(mr.submitter.username) }}
                >
                  {mr.submitter.username.slice(0, 2).toUpperCase()}
                </span>
                <span>
                  {mr.submitter.username} proposed a change to{' '}
                  <Link
                    href={`/repos/${mr.repo.id}/merge-requests`}
                    className={styles.metaLink}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {mr.repo.name}
                  </Link>
                  {' '}· {mr.note.section.title}
                </span>
                <span className={styles.itemTime}>{formatRelativeTime(mr.createdAt)}</span>
                <Link
                  href={`/merge-requests/${mr.id}`}
                  className={styles.fullLink}
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink size={12} /> Full view
                </Link>
              </div>

              {mr.description && <p className={styles.itemDescription}>{mr.description}</p>}

              {mr.feedback && (
                <div className={styles.feedback}>
                  <strong>Reviewer feedback:</strong> {mr.feedback}
                </div>
              )}

              <button
                onClick={() => openDetail(mr.id)}
                className={styles.expandButton}
              >
                Show proposed changes ({mr.comments.length} comment{mr.comments.length !== 1 ? 's' : ''})
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}