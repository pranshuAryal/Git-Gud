'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GitMerge, MessageSquare, Check, X, ExternalLink } from 'lucide-react';
import {
  fetchMergeRequests,
  fetchMergeRequest,
  updateMergeRequestStatus,
  addMergeRequestComment,
  MergeRequestData,
  FlatDiffRow,
} from '@/lib/mergeRequests';
import { useAuth } from '@/app/context/AuthContext';
import { DiffView } from '@/components/DiffView';
import { formatRelativeTime, avatarColor } from '@/lib/format';
import styles from './merges.module.css';

type Scope = 'received' | 'submitted';

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

export default function MergeRequestsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Scope>('received');
  const [requests, setRequests] = useState<MergeRequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [diffs, setDiffs] = useState<Record<string, FlatDiffRow[]>>({});
  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting] = useState(false);
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

  const handleComment = async (mrId: string) => {
    if (!commentText.trim()) return;
    setCommenting(true);
    try {
      await addMergeRequestComment(mrId, commentText.trim());
      setCommentText('');
      setReloadKey((k) => k + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setCommenting(false);
    }
  };

  const handleExpand = (mrId: string) => {
    setExpandedId((current) => (current === mrId ? null : mrId));
    if (!diffs[mrId]) {
      fetchMergeRequest(mrId)
        .then((data) => setDiffs((prev) => ({ ...prev, [mrId]: data.diff ?? [] })))
        .catch(() => setDiffs((prev) => ({ ...prev, [mrId]: [] })));
    }
  };

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
          const expanded = expandedId === mr.id;

          return (
            <div key={mr.id} className={styles.item}>
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
                      onClick={() => handleStatus(mr.id, 'approved')}
                      className={`${styles.statusAction} ${styles.approveAction}`}
                      title="Approve"
                    >
                      <Check size={14} /> Approve
                    </button>
                    <button
                      onClick={() => handleStatus(mr.id, 'rejected')}
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
                  <Link href={`/repos/${mr.repo.id}/merge-requests`} className={styles.metaLink}>
                    {mr.repo.name}
                  </Link>
                  {' '}· {mr.note.section.title}
                </span>
                <span className={styles.itemTime}>{formatRelativeTime(mr.createdAt)}</span>
                <Link
                  href={`/repos/${mr.repo.id}/merge-requests/${mr.id}`}
                  className={styles.fullLink}
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

              <button onClick={() => handleExpand(mr.id)} className={styles.expandButton}>
                {expanded
                  ? 'Hide proposed changes'
                  : `Show proposed changes (${mr.comments.length} comment${mr.comments.length !== 1 ? 's' : ''})`}
              </button>

              {expanded && (
                <div className={styles.diff}>
                  <DiffView rows={diffs[mr.id] ?? []} />
                </div>
              )}

              {expanded && (
                <div className={styles.comments}>
                  {mr.comments.map((c) => (
                    <div key={c.id} className={styles.comment}>
                      <span
                        className={styles.commentAvatar}
                        style={{ background: avatarColor(c.author.username) }}
                      >
                        {c.author.username.slice(0, 2).toUpperCase()}
                      </span>
                      <div className={styles.commentBody}>
                        <div className={styles.commentMeta}>
                          <span className={styles.commentAuthor}>{c.author.username}</span>
                          <span className={styles.commentTime}>{formatRelativeTime(c.createdAt)}</span>
                        </div>
                        <p className={styles.commentText}>{c.content}</p>
                      </div>
                    </div>
                  ))}

                  <div className={styles.commentInputRow}>
                    <input
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleComment(mr.id);
                        }
                      }}
                      placeholder="Add a comment…"
                      className={styles.commentInput}
                    />
                    <button
                      onClick={() => handleComment(mr.id)}
                      disabled={commenting || !commentText.trim()}
                      className={styles.commentButton}
                    >
                      <MessageSquare size={13} /> Comment
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}