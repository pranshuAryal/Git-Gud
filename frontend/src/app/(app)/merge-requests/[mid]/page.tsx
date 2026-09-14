'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { GitMerge, X, Check, Send, Ban } from 'lucide-react';
import {
  fetchMergeRequest,
  updateMergeRequestStatus,
  addMergeRequestComment,
  cancelMergeRequest,
  MergeRequestData,
} from '@/lib/mergeRequests';
import { useAuth } from '@/app/context/AuthContext';
import { DiffView } from '@/components/DiffView';
import { formatRelativeTime, avatarColor } from '@/lib/format';
import styles from './mrDetail.module.css';

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

export default function MergeRequestDetailPage() {
  const { mid } = useParams<{ mid: string }>();
  const { user } = useAuth();

  const [mr, setMr] = useState<MergeRequestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchMergeRequest(mid)
      .then((data) => {
        if (!cancelled) setMr(data);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load merge request');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mid, reloadKey]);

  const isOwner = user && mr && mr.repo.ownerId === user.userId;

  const isSubmitter = user && mr && mr.submittedBy === user.userId;

  const handleStatus = async (status: 'approved' | 'rejected') => {
    const feedback =
      status === 'rejected'
        ? window.prompt?.('Reason for rejection (optional):') || undefined
        : undefined;
    try {
      await updateMergeRequestStatus(mid, { status, feedback });
      setReloadKey((k) => k + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update request');
    }
  };

  const handleCancel = async () => {
    try {
      await cancelMergeRequest(mid);
      setReloadKey((k) => k + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel request');
    }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    setCommenting(true);
    try {
      await addMergeRequestComment(mid, commentText.trim());
      setCommentText('');
      setReloadKey((k) => k + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setCommenting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeletonLine} />
        <div className={styles.skeletonLine} />
      </div>
    );
  }

  if (error || !mr) {
    return (
      <div className={styles.page}>
        <div className={styles.errorBanner}>{error || 'Merge request not found'}</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href={`/repos/${mr.repo.id}`} className={styles.breadcrumbLink}>
          {mr.repo.name}
        </Link>
        <span className={styles.breadcrumbSep}>/</span>
        <Link href="/merges" className={styles.breadcrumbLink}>
          Merge requests
        </Link>
        <span className={styles.breadcrumbSep}>/</span>
        <span className={styles.breadcrumbCurrent}>#{mid.slice(0, 8)}</span>
      </div>

      {/* Header row: title + actions */}
      <div className={styles.headerRow}>
        <h1 className={styles.pageTitle}>
          <GitMerge size={18} style={{ verticalAlign: '-2px', marginRight: 8, color: '#6b7280' }} />
          {mr.title}
        </h1>

        {mr.status === 'pending' && (isOwner || isSubmitter) && (
          <div className={styles.headerActions}>
            {isOwner && (
              <>
                <button
                  onClick={() => handleStatus('rejected')}
                  className={`${styles.actionButton} ${styles.rejectAction}`}
                >
                  <X size={14} /> Reject
                </button>
                <button
                  onClick={() => handleStatus('approved')}
                  className={`${styles.actionButton} ${styles.approveAction}`}
                >
                  <Check size={14} /> Approve &amp; merge
                </button>
              </>
            )}
            {isSubmitter && (
              <button
                onClick={handleCancel}
                className={`${styles.actionButton} ${styles.cancelAction}`}
              >
                <Ban size={14} /> Cancel request
              </button>
            )}
          </div>
        )}
      </div>

      {/* Meta row */}
      <div className={styles.metaRow}>
        <span className={`${styles.statusBadge} ${STATUS_BADGE[mr.status] || STATUS_BADGE.pending}`}>
          {STATUS_LABEL[mr.status] || 'Pending'}
        </span>
        <span className={styles.byLine}>
          <span
            className={styles.avatar}
            style={{ background: avatarColor(mr.submitter.username) }}
          >
            {mr.submitter.username.slice(0, 2).toUpperCase()}
          </span>
          by <strong>@{mr.submitter.username}</strong>
        </span>
        <span>
          · section <strong>{mr.note.section.title}</strong>
        </span>
        <span className={styles.itemTime}>{formatRelativeTime(mr.createdAt)}</span>
      </div>

      {mr.status === 'approved' && (
        <div className={styles.appliedBanner}>
          <Check size={14} /> Changes applied and a new version was saved.
        </div>
      )}

      {mr.feedback && (
        <div className={styles.feedback}>
          <strong>Reviewer feedback:</strong> {mr.feedback}
        </div>
      )}

      {/* Description card */}
      {mr.description && <div className={styles.descriptionCard}>{mr.description}</div>}

      {/* Diff */}
      <div className={styles.diffSection}>
        <h3 className={styles.sectionLabel}>Changes — {mr.note.section.title}</h3>
        <DiffView rows={mr.diff ?? []} showHeader />
      </div>

      {/* Comments */}
      <div className={styles.commentsSection}>
        <h3 className={styles.sectionLabel}>Review Comments</h3>
        {mr.comments.length === 0 && <p className={styles.noComments}>No comments yet.</p>}
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
                handleComment();
              }
            }}
            placeholder="Leave a comment..."
            className={styles.commentInput}
          />
          <button
            onClick={handleComment}
            disabled={commenting || !commentText.trim()}
            className={styles.commentButton}
          >
            <Send size={13} /> Send
          </button>
        </div>
      </div>
    </div>
  );
}