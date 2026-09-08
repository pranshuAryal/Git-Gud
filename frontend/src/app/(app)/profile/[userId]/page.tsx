'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchProfile, ProfileData } from '@/lib/api';
import { RepoCard } from '@/components/RepoCard';
import { formatRelativeTime } from '@/lib/format';
import styles from '../../shared/pageStyles.module.css';
import profileStyles from './profile.module.css';
import { useAuth } from '@/app/context/AuthContext';

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();

  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchProfile(userId)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load profile');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeletonCard} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.page}>
        <div className={styles.errorBanner}>{error || 'User not found'}</div>
      </div>
    );
  }

  const { profile, counts } = data;
  const isOwnProfile = user?.userId === profile.id;

  const statItems = [
    { label: 'Repositories', value: counts.repositories },
    { label: 'Forks made', value: counts.forksMade },
    { label: 'Stars received', value: counts.starsReceived },
    { label: 'MRs received', value: counts.mergeRequestsReceived },
    { label: 'MRs submitted', value: counts.mergeRequestsSubmitted },
  ];

  return (
    <div className={styles.page}>
      <div className={profileStyles.profileHeader}>
        <div className={profileStyles.avatar}>
          {profile.username.slice(0, 2).toUpperCase()}
        </div>
        <div className={profileStyles.identity}>
          <h1 className={profileStyles.username}>
            {profile.username}
            {data.isSelf && <span className={profileStyles.youBadge}>you</span>}
          </h1>
          <p className={profileStyles.joined}>
            Joined {formatRelativeTime(profile.createdAt)} · @{profile.id.slice(0, 8)}
          </p>
        </div>
      </div>

      <div className={profileStyles.statsGrid}>
        {statItems.map((s) => (
          <div key={s.label} className={profileStyles.statCard}>
            <div className={profileStyles.statValue}>{s.value}</div>
            <div className={profileStyles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      <section className={profileStyles.reposSection}>
        <h2 className={profileStyles.reposTitle}>
          {isOwnProfile ? 'Your repositories' : `${profile.username}'s repositories`}
        </h2>
        {data.repositories.length === 0 ? (
          <div className={styles.emptyState}>No repositories yet.</div>
        ) : (
          <div className={styles.grid}>
            {data.repositories.map((repo) => (
              <RepoCard key={repo.id} repo={repo} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}