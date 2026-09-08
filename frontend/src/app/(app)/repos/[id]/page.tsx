'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Star,
  GitFork,
  Globe,
  Lock,
  Clock,
  FileText,
  Pencil,
  History,
  ArrowLeft,
  X,
} from 'lucide-react';
import {
  fetchRepository,
  RepositoryDetail,
  starRepository,
  unstarRepository,
  checkStarred,
  forkRepository,
} from '@/lib/api';
import { fetchMergeRequests, MergeRequestData } from '@/lib/mergeRequests';
import {
  fetchNoteVersions,
  VersionData,
} from '@/lib/notes';
import { useAuth } from '@/app/context/AuthContext';
import { NoteEditor } from '@/components/NoteEditor';
import { SectionTree } from '@/components/SectionTree';
import { buildTree, flattenTree } from '@/lib/sections';
import { formatRelativeTime, avatarColor } from '@/lib/format';
import styles from './repoView.module.css';

function pickFirstLeaf(sections: RepositoryDetail['sections']) {
  const tree = buildTree(sections);
  const flat = flattenTree(tree);
  return flat.find((f) => f.node.note)?.node ?? flat[0]?.node ?? null;
}

export default function RepoViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [repo, setRepo] = useState<RepositoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [isStarred, setIsStarred] = useState(false);
  const [starCount, setStarCount] = useState(0);
  const [forking, setForking] = useState(false);
  const [forkedUrl, setForkedUrl] = useState<string | null>(null);
  const [openMergeRequests, setOpenMergeRequests] = useState<MergeRequestData[]>([]);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyVersions, setHistoryVersions] = useState<VersionData[]>([]);
  const [historySelectedId, setHistorySelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    let redirecting = false;

    fetchRepository(id)
      .then(async (data) => {
        if (cancelled) return;
        // Owners use the dedicated editor page instead.
        if (user && data.editable) {
          redirecting = true;
          router.replace(`/repos/${id}/edit`);
          return;
        }
        setRepo(data);
        setStarCount(data._count.stars);
        setSelectedSectionId(pickFirstLeaf(data.sections)?.id ?? null);

        const starred = await checkStarred(data.id).catch(() => ({ starred: false }));
        if (cancelled) return;
        setIsStarred(starred.starred);

        const mrs = await fetchMergeRequests({ repoId: data.id }).catch(
          () => [] as MergeRequestData[],
        );
        if (!cancelled) {
          setOpenMergeRequests(mrs.filter((m) => m.status === 'pending'));
        }
      })
      .catch((err) => {
        if (!cancelled && err instanceof Error) setError(err.message);
      })
      .finally(() => {
        if (!cancelled && !redirecting) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, user, authLoading, router]);

  const selectedSection = repo?.sections.find((s) => s.id === selectedSectionId);
  const selectedNote = selectedSection?.note ?? null;
  const isFork = !!repo?.forkedFrom;

  const handleStar = async () => {
    if (!repo) return;
    try {
      if (isStarred) {
        await unstarRepository(repo.id);
        setIsStarred(false);
        setStarCount((c) => c - 1);
      } else {
        await starRepository(repo.id);
        setIsStarred(true);
        setStarCount((c) => c + 1);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFork = async () => {
    if (!repo || forking) return;
    setForking(true);
    try {
      const result = await forkRepository(repo.id);
      setForkedUrl(`/repos/${result.id}/edit`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to fork');
    } finally {
      setForking(false);
    }
  };

  const openHistory = async () => {
    if (!repo || !selectedNote) return;
    try {
      const versions = await fetchNoteVersions(repo.id, selectedNote.id).catch(
        () => [] as VersionData[],
      );
      setHistoryVersions(versions);
      setHistorySelectedId(null);
      setHistoryOpen(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to load history');
    }
  };

  const selectedHistoryVersion =
    historyVersions.find((v) => v.id === historySelectedId) ?? null;

  if (authLoading || loading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeleton}> </div>
        <div className={styles.skeleton}> </div>
        <div className={styles.skeleton}> </div>
      </div>
    );
  }

  if (error || !repo) {
    return (
      <div className={styles.page}>
        <div className={styles.errorBanner}>{error || 'Repository not found'}</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Fork success banner */}
      {forkedUrl && (
        <Link href={forkedUrl} className={styles.forkSuccessBanner}>
          <GitFork size={16} /> Repository forked! Click to open your fork.
        </Link>
      )}

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard" className={styles.breadcrumbLink}>
          <ArrowLeft size={13} /> Dashboard
        </Link>
        <span className={styles.breadcrumbSep}>/</span>
        <Link href={`/profile/${repo.owner.id}`} className={styles.breadcrumbLink}>
          {repo.owner.username}
        </Link>
        <span className={styles.breadcrumbSep}>/</span>
        <span className={styles.breadcrumbCurrent}>{repo.name}</span>
        {isFork && <span className={styles.forkBadge}>YOUR FORK</span>}
      </div>

      {/* Header */}
      <div className={styles.repoHeader}>
        <div
          className={styles.avatar}
          style={{ background: avatarColor(repo.owner.username) }}
        >
          {repo.name.slice(0, 2).toUpperCase()}
        </div>
        <div className={styles.repoHeaderContent}>
          <div className={styles.repoTitleRow}>
            <span className={styles.repoOwner}>{repo.owner.username}</span>
            <span className={styles.repoTitleSep}>/</span>
            <h1 className={styles.repoTitle}>{repo.name}</h1>
          </div>
          <p className={styles.repoDescription}>
            {repo.description || 'No description provided.'}
          </p>
          <div className={styles.repoMetaRow}>
            <span className={`${styles.visibilityBadge} ${repo.isPublic ? styles.publicBadge : styles.privateBadge}`}>
              {repo.isPublic ? <Globe size={12} /> : <Lock size={12} />}
              {repo.isPublic ? 'Public' : 'Private'}
            </span>
            <span className={styles.metaBadge}>
              <Star size={13} /> {starCount}
            </span>
            <span className={styles.metaBadge}>
              <GitFork size={13} /> {repo._count.forksMade}
            </span>
            <span className={styles.metaBadge}>
              <Clock size={13} /> Updated {formatRelativeTime(repo.updatedAt)}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.contentArea}>
        {/* Left: About panel */}
        <aside className={styles.aboutPanel}>
          <h3 className={styles.panelTitle}>About</h3>
          <div className={styles.aboutBlock}>
            <div className={styles.aboutRow}>
              <span className={styles.aboutLabel}>Owner</span>
              <Link href={`/profile/${repo.owner.id}`} className={styles.aboutLink}>
                {repo.owner.username}
              </Link>
            </div>
            <div className={styles.aboutRow}>
              <span className={styles.aboutLabel}>Sections</span>
              <span className={styles.aboutValue}>{repo._count.sections}</span>
            </div>
            <div className={styles.aboutRow}>
              <span className={styles.aboutLabel}>Stars</span>
              <span className={styles.aboutValue}>{starCount}</span>
            </div>
            <div className={styles.aboutRow}>
              <span className={styles.aboutLabel}>Forks</span>
              <span className={styles.aboutValue}>{repo._count.forksMade}</span>
            </div>
          </div>

          <div className={styles.aboutActions}>
            <button
              onClick={handleStar}
              className={`${styles.starButton} ${isStarred ? styles.starred : ''}`}
            >
              <Star size={14} fill={isStarred ? 'currentColor' : 'none'} />
              {isStarred ? 'Starred' : 'Star'}
            </button>
            <button onClick={handleFork} disabled={forking} className={styles.forkButton}>
              <GitFork size={14} />
              {forking ? 'Forking…' : 'Fork'}
            </button>
            {repo.editable && (
              <Link href={`/repos/${repo.id}/edit`} className={styles.editButton}>
                <Pencil size={13} /> Edit
              </Link>
            )}
          </div>

          <div className={styles.aboutBlock}>
            <h4 className={styles.aboutSubtitle}>Open Merge Requests</h4>
            {openMergeRequests.length === 0 ? (
              <p className={styles.aboutEmpty}>No open merge requests</p>
            ) : (
              <ul className={styles.mrList}>
                {openMergeRequests.map((mr) => (
                  <li key={mr.id}>
                    <Link
                      href={`/repos/${repo.id}/merge-requests/${mr.id}`}
                      className={styles.mrLink}
                      title={mr.description || mr.title}
                    >
                      <span className={styles.mrTitle}>{mr.title}</span>
                      <span className={styles.mrSection}>{mr.note.section.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Center: Note */}
        <div className={styles.notePanel}>
          {selectedSection ? (
            selectedNote ? (
              <>
                <div className={styles.noteHeader}>
                  <span className={styles.noteSectionLabel}>{selectedSection.title}</span>
                  <button onClick={openHistory} className={styles.historyButton}>
                    <History size={13} /> History
                  </button>
                </div>
                <div className={styles.noteContent}>
                  <NoteEditor content={selectedNote.content} editable={false} />
                </div>
              </>
            ) : (
              <div className={styles.emptyNote}>
                <FileText size={28} className={styles.emptyNoteIcon} />
                <p className={styles.emptyNoteText}>Select a section to view its note.</p>
              </div>
            )
          ) : (
            <div className={styles.emptyNote}>
              <FileText size={28} className={styles.emptyNoteIcon} />
              <p className={styles.emptyNoteText}>
                {repo.sections.length > 0
                  ? 'Select a section from the tree to view its note.'
                  : 'This repository has no content yet.'}
              </p>
            </div>
          )}
        </div>

        {/* Right: Section tree */}
        <aside className={styles.treePanel}>
          <h3 className={styles.panelTitle}>
            <GitFork size={14} className={styles.panelIcon} /> Sections
          </h3>
          <SectionTree
            sections={repo.sections}
            selectedId={selectedSectionId}
            onSelect={setSelectedSectionId}
            onAddSection={() => {}}
            onDeleteSection={() => {}}
            onCreateNote={() => {}}
          />
        </aside>
      </div>

      {/* History modal */}
      {historyOpen && (
        <div className={styles.modalOverlay} onClick={() => setHistoryOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>History</h2>
              <button
                className={styles.modalClose}
                onClick={() => setHistoryOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            {selectedHistoryVersion ? (
              <>
                <div className={styles.historyVersionPreview}>
                  <div className={styles.historyVersionMeta}>
                    <span className={styles.historyVersionAuthor}>
                      {selectedHistoryVersion.editor.username}
                    </span>
                    <span className={styles.historyVersionTime}>
                      {formatRelativeTime(selectedHistoryVersion.createdAt)}
                    </span>
                    {selectedHistoryVersion.changeSummary && (
                      <span className={styles.historyVersionSummary}>
                        — {selectedHistoryVersion.changeSummary}
                      </span>
                    )}
                  </div>
                  <button
                    className={styles.historyBack}
                    onClick={() => setHistorySelectedId(null)}
                  >
                    ← Back to versions
                  </button>
                </div>
                <div className={styles.historyVersionBody}>
                  <NoteEditor content={selectedHistoryVersion.content} editable={false} />
                </div>
              </>
            ) : (
              <div className={styles.historyList}>
                {historyVersions.length === 0 && (
                  <p className={styles.historyEmpty}>No versions recorded yet.</p>
                )}
                {historyVersions.map((v, i) => (
                  <button
                    key={v.id}
                    className={styles.historyItem}
                    onClick={() => setHistorySelectedId(v.id)}
                  >
                    <span className={styles.historyVersionNumber}>#{historyVersions.length - i}</span>
                    <span className={styles.historyItemBody}>
                      <span className={styles.historyItemAuthor}>{v.editor.username}</span>
                      <span className={styles.historyItemTime}>
                        {formatRelativeTime(v.createdAt)}
                      </span>
                      {v.changeSummary && (
                        <span className={styles.historyItemSummary}>— {v.changeSummary}</span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}