"use client";

import React, { useEffect, useState } from "react";
import {
  Eye,
  Lock,
  CheckCircle,
  Folder,
  GitFork,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  FolderOpen,
  AlertTriangle,
  Save,
} from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { fetchProfile, type ProfileData } from "@/lib/api";
import { RepoCard } from "@/components/RepoCard";
import { formatRelativeTime } from "@/lib/format";
import styles from "./settings.module.css";
import profileStyles from "@/app/(app)/profile/[userId]/profile.module.css";
import pageStyles from "@/app/(app)/shared/pageStyles.module.css";

const DEFAULT_BIO =
  "CS undergrad building commit-ready study resources. I maintain public notes for Algorithms, Operating Systems, and Networks — contributions welcome. When I'm not debugging segfaults, I'm probably reviewing MRs or collecting stars.";

const INPUT_CLASSES = `${styles.input} ${styles.inputPillPadding}`;

export default function SettingsProfilePage() {
  const { user } = useAuth();
  const userId = user?.userId;

  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchProfile(userId)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load profile");
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (error && !data) {
    return (
      <div className={styles.content}>
        <div className={styles.card}>
          <div className={pageStyles.errorBanner}>{error}</div>
        </div>
      </div>
    );
  }

  if (!data || !user) {
    return (
      <div className={styles.content}>
        <div className={pageStyles.skeletonCard} />
        <div className={pageStyles.skeletonCard} />
      </div>
    );
  }

  return <ProfileEditor data={data} email={user.email} />;
}

function ProfileEditor({
  data,
  email,
}: {
  data: ProfileData;
  email: string;
}) {
  const profile = data.profile;
  const INITIAL = {
    username: profile.username,
    displayName: profile.username,
    email,
    bio: DEFAULT_BIO,
  };

  const [username, setUsername] = useState(INITIAL.username);
  const [displayName, setDisplayName] = useState(INITIAL.displayName);
  const [emailValue, setEmailValue] = useState(INITIAL.email);
  const [bio, setBio] = useState(INITIAL.bio);
  const [committed, setCommitted] = useState(INITIAL);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordNote, setPasswordNote] = useState<string | null>(null);

  const dirty =
    username !== committed.username ||
    displayName !== committed.displayName ||
    emailValue !== committed.email ||
    bio !== committed.bio;

  const handleSave = () => {
    setCommitted({ username, displayName, email: emailValue, bio });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordNote(null);
  };

  const handleReset = () => {
    setUsername(committed.username);
    setDisplayName(committed.displayName);
    setEmailValue(committed.email);
    setBio(committed.bio);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordNote(null);
  };

  const handleUpdatePassword = () => {
    setPasswordNote("Password updated successfully.");
  };

  const initials = profile.username.slice(0, 2).toUpperCase();

  const statItems = [
    { label: "Repositories", value: data.counts.repositories, gold: false, icon: <Folder size={13} /> },
    { label: "Forks made", value: data.counts.forksMade, gold: false, icon: <GitFork size={13} /> },
    { label: "Stars received", value: data.counts.starsReceived, gold: true, icon: <Star size={13} /> },
    { label: "MRs received", value: data.counts.mergeRequestsReceived, gold: false, icon: <ArrowDownRight size={13} /> },
    { label: "MRs submitted", value: data.counts.mergeRequestsSubmitted, gold: false, icon: <ArrowUpRight size={13} /> },
  ];

  return (
    <div className={styles.content}>
      {/* Profile identity header */}
      <div className={profileStyles.profileHeader}>
        <div className={profileStyles.avatar}>{initials}</div>
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

      {/* Card 1: Public Profile */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.cardTitle}>Public Profile</h2>
            <p className={styles.cardSubtitle}>
              Manage your developer persona, course authorship bio, and public stats
            </p>
          </div>
          <span className={styles.visibilityPill}>
            <Eye size={12} />
            Visible to classmates
          </span>
        </div>

        <hr className={styles.divider} />

        <div className={styles.pictureRow}>
          <div className={styles.avatarLarge}>{initials}</div>
          <div className={styles.pictureInfo}>
            <p className={styles.pictureTitle}>Profile Picture</p>
            <p className={styles.pictureDesc}>
              Generated automatically from your accent color and initials, or upload a
              custom image
            </p>
          </div>
          <div className={styles.pictureActions}>
            <button className={styles.secondaryButton}>Upload New</button>
            <button className={styles.dangerTextButton}>Reset Avatar</button>
          </div>
        </div>

        <hr className={styles.divider} />

        <div className={styles.fieldGrid}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="username">
              Username
            </label>
            <div className={styles.prefixWrap}>
              <span className={styles.inputPrefix}>@</span>
              <input
                id="username"
                className={`${styles.input} ${styles.inputPrefixInput}`}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <span className={styles.inputIcon}>
                <Lock size={14} />
              </span>
            </div>
            <p className={styles.helper}>
              This is your unique handle used across repo commits and merge requests
            </p>
          </div>

          <div className={`${styles.field} ${styles.fieldMobileGap}`}>
            <label className={styles.fieldLabel} htmlFor="display-name">
              Display Name
            </label>
            <input
              id="display-name"
              className={styles.input}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <p className={styles.helper}>
              Your name as it appears on notes, comments, and forks
            </p>
          </div>
        </div>

        <div className={`${styles.field} ${styles.fieldWide}`}>
          <label className={styles.fieldLabel} htmlFor="email">
            Email Address
          </label>
          <div className={styles.suffixWrap}>
            <input
              id="email"
              className={INPUT_CLASSES}
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
            />
            <span className={styles.verifiedPill}>
              <CheckCircle size={12} />
              Verified
            </span>
          </div>
        </div>

        <div className={`${styles.field} ${styles.fieldWide}`}>
          <label className={styles.fieldLabel} htmlFor="bio">
            Bio / About
          </label>
          <div className={styles.textareaWrap}>
            <textarea
              id="bio"
              className={styles.textarea}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
            <span className={styles.resizeGrip}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="4 14 10 14 10 20" />
                <polyline points="20 10 14 10 14 4" />
                <line x1="14" y1="10" x2="21" y2="3" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            </span>
          </div>
          <p className={styles.helper}>
            Brief description for your student profile card. Markdown supported.
          </p>
        </div>

        <hr className={styles.divider} />

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Community Contributions</span>
          <div className={styles.statGrid}>
            {statItems.map((s) => (
              <div key={s.label} className={styles.statCard}>
                <div className={styles.statValue}>{s.value}</div>
                <div className={styles.statLabelRow}>
                  <span className={s.gold ? styles.statIconGold : ""}>{s.icon}</span>
                  <span>{s.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Card 2: Account Credentials & Repositories */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.cardTitle}>Account Credentials &amp; Repositories</h2>
            <p className={styles.cardSubtitle}>
              Update login passwords and manage connected repository ownership
            </p>
          </div>
        </div>

        <h3 className={styles.subheading} style={{ marginTop: 20 }}>
          Change Password
        </h3>
        <div className={styles.passwordGrid}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="current-password">
              Current Password
            </label>
            <input
              id="current-password"
              type="password"
              className={styles.input}
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="new-password">
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              className={styles.input}
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="confirm-password">
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              type="password"
              className={styles.input}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>
        <button
          className={styles.secondaryButton}
          style={{ marginTop: 14 }}
          onClick={handleUpdatePassword}
        >
          Update Password
        </button>
        {passwordNote && (
          <p className={styles.helper} style={{ marginTop: 10, color: "#059669" }}>
            {passwordNote}
          </p>
        )}

        <hr className={styles.divider} />

        <div className={styles.headerLine}>
          <h3 className={styles.subheading}>Connected Repositories Summary</h3>
          <span className={styles.mutedRight}>
            {data.counts.repositories} total owned{" "}
            {data.counts.repositories === 1 ? "repository" : "repositories"}
          </span>
        </div>
        {data.repositories.length === 0 ? (
          <div className={pageStyles.emptyState}>No repositories yet.</div>
        ) : (
          <div className={styles.repoList}>
            {data.repositories.map((repo) => {
              const repoIcon = repo.forkedFrom ? (
                <GitFork size={16} />
              ) : repo.isPublic ? (
                <FolderOpen size={16} />
              ) : (
                <Lock size={16} />
              );
              const isPrivate = !repo.isPublic;
              const sub = isPrivate
                ? "Only you can view"
                : `Updated ${formatRelativeTime(repo.updatedAt)} • ${repo._count.stars} ${
                    repo._count.stars === 1 ? "star" : "stars"
                  }`;
              return (
                <div key={repo.id} className={styles.repoRow}>
                  <div className={styles.repoIcon}>{repoIcon}</div>
                  <div className={styles.repoInfo}>
                    <p className={styles.repoName}>{repo.name}</p>
                    <p className={styles.repoSub}>{sub}</p>
                  </div>
                  <span
                    className={`${styles.statusPill} ${
                      isPrivate ? styles.statusPrivate : styles.statusPublic
                    }`}
                  >
                    {isPrivate && <Lock size={11} />}
                    {isPrivate ? "Private" : "Public"}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <hr className={styles.divider} />

        <div className={styles.dangerCard}>
          <div className={styles.dangerIconBox}>
            <AlertTriangle size={18} />
          </div>
          <div className={styles.dangerText}>
            <p className={styles.dangerTitle}>Danger Zone: Delete Account</p>
            <p className={styles.dangerDesc}>
              Deleting your account removes all repositories, notes, and merge requests
              permanently. This action cannot be undone.
            </p>
          </div>
          <button className={styles.dangerButton}>Delete account</button>
        </div>
      </section>

      {/* Card 3: Your repositories (from profile page) */}
      <section className={styles.card}>
        <div className={styles.headerLine}>
          <h3 className={styles.cardTitle}>Your repositories</h3>
          <span className={styles.mutedRight}>{data.counts.repositories} total</span>
        </div>
        {data.repositories.length === 0 ? (
          <div className={pageStyles.emptyState}>No repositories yet.</div>
        ) : (
          <div className={`${pageStyles.grid} ${styles.reposGrid}`} style={{ marginTop: 14 }}>
            {data.repositories.map((repo) => (
              <RepoCard key={repo.id} repo={repo} />
            ))}
          </div>
        )}
      </section>

      {dirty && (
        <div className={styles.saveBar} role="status">
          <div className={styles.warningText}>
            <span className={styles.warningDot} />
            <span>Careful — you have unsaved changes in Profile and Notifications</span>
          </div>
          <div className={styles.saveActions}>
            <button className={styles.resetTextButton} onClick={handleReset}>
              Reset
            </button>
            <button className={styles.primaryButton} onClick={handleSave}>
              <Save size={14} />
              Save changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}