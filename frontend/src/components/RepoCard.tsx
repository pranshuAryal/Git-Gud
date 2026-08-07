'use client';

import Link from 'next/link';
import { Star, GitFork, Clock, Globe, Lock } from 'lucide-react';
import styles from './CSS/repoCard.module.css';
import { RepoCardData } from '@/lib/repositories';
import { formatRelativeTime } from '@/lib/format';

export function RepoCard({ repo }: { repo: RepoCardData }) {
  const isFork = !!repo.forkedFrom;

  return (
    <Link href={`/repos/${repo.id}`} className={styles.card}>
      <div className={styles.header}>
        <div className={`${styles.iconBadge} ${isFork ? styles.iconBadgeFork : styles.iconBadgeOwned}`}>
          {isFork ? (
            <GitFork size={18} />
          ) : repo.isPublic ? (
            <Globe size={18} />
          ) : (
            <Lock size={18} />
          )}
        </div>

        <div className={styles.titleBlock}>
          <h3 className={styles.title}>{repo.name}</h3>
          {isFork && repo.forkedFrom && (
            <p className={styles.forkedFrom}>Forked from @{repo.forkedFrom.owner.username}</p>
          )}
        </div>
      </div>

      <p className={styles.description}>{repo.description || 'No description provided.'}</p>

      <div className={styles.statsRow}>
        <div className={styles.statsGroup}>
          <span className={styles.statItem}>
            <Star size={13} /> {repo._count.stars}
          </span>
          <span className={styles.statItem}>
            <GitFork size={13} /> {repo._count.forksMade}
          </span>
        </div>
        <span className={styles.statItem}>
          <Clock size={13} /> Updated {formatRelativeTime(repo.updatedAt)}
        </span>
      </div>
    </Link>
  );
}