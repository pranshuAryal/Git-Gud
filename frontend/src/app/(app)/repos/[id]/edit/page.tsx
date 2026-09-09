'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  GitMerge,
  ArrowLeft,
  CheckCircle,
  Eye,
  Pencil,
  Plus,
  X,
} from 'lucide-react';
import { fetchRepository, RepositoryDetail, createSection, deleteSection, createNote } from '@/lib/api';
import {
  saveNote,
  fetchNoteVersions,
  VersionData,
  normalizeNoteContent,
} from '@/lib/notes';
import { createMergeRequest } from '@/lib/mergeRequests';
import { useAuth } from '@/app/context/AuthContext';
import { NoteEditor } from '@/components/NoteEditor';
import { SectionTree } from '@/components/SectionTree';
import { formatRelativeTime } from '@/lib/format';
import styles from './repoEdit.module.css';

export default function RepoEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [repo, setRepo] = useState<RepositoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [workingContent, setWorkingContent] = useState<unknown>(null);
  const [versions, setVersions] = useState<VersionData[]>([]);
  const [versionsNoteId, setVersionsNoteId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [unsaved, setUnsaved] = useState(false);
  const [changeSummary, setChangeSummary] = useState('');
  const [previewing, setPreviewing] = useState(false);

  // Submit merge request (fork owners only)
  const [mrOpen, setMrOpen] = useState(false);
  const [mrTitle, setMrTitle] = useState('');
  const [mrDescription, setMrDescription] = useState('');
  const [submittingMr, setSubmittingMr] = useState(false);
  const [mrResultUrl, setMrResultUrl] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    let redirecting = false;

    fetchRepository(id)
      .then((data) => {
        if (cancelled) return;
        if (user && !data.editable) {
          redirecting = true;
          router.replace(`/repos/${id}`);
          return;
        }
        setRepo(data);
        const first = data.sections.find((s) => s.note) ?? data.sections[0];
        if (first) setSelectedSectionId(first.id);
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
  }, [id, user, authLoading, router, reloadKey]);

  const selectedSection = repo?.sections.find((s) => s.id === selectedSectionId);
  const selectedNote = selectedSection?.note ?? null;
  const isFork = !!repo?.forkedFrom;

  // Load versions when the selected note changes.
  useEffect(() => {
    if (!selectedNote) return;
    let cancelled = false;
    const noteId = selectedNote.id;
    fetchNoteVersions(id, noteId)
      .then((data) => {
        if (cancelled) return;
        setWorkingContent(normalizeNoteContent(selectedNote.content));
        setVersions(data);
        setVersionsNoteId(noteId);
        setSavedAt(selectedNote.updatedAt);
        setUnsaved(false);
        setPreviewing(false);
      })
      .catch(() => {
        if (cancelled) return;
        setWorkingContent(normalizeNoteContent(selectedNote.content));
        setVersions([]);
        setVersionsNoteId(noteId);
        setSavedAt(selectedNote.updatedAt);
        setUnsaved(false);
        setPreviewing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedNote, id]);

  const handleSave = async () => {
    if (!selectedNote) return;
    try {
      await saveNote(id, selectedNote.id, workingContent, changeSummary.trim() || undefined);
      setSavedAt(new Date().toISOString());
      setUnsaved(false);
      setChangeSummary('');
      const data = await fetchNoteVersions(id, selectedNote.id);
      setVersions(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save note');
    }
  };

  const handleChange = (content: unknown) => {
    setWorkingContent(content);
    setUnsaved(true);
  };

  const handleAddSection = async (title: string, parentId: string | null) => {
    if (!repo) return;
    try {
      await createSection(repo.id, { title, parentId });
      setReloadKey((k) => k + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add section');
      throw err;
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!repo) return;
    if (!confirm('Delete this section and its note?')) return;
    try {
      await deleteSection(repo.id, sectionId);
      if (selectedSectionId === sectionId) setSelectedSectionId(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete section');
    }
  };

  const handleCreateNote = async (sectionId: string) => {
    if (!repo) return;
    try {
      await createNote(repo.id, sectionId);
      setReloadKey((k) => k + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create note');
    }
  };

  const handleRestore = async (version: VersionData) => {
    setWorkingContent(version.content);
    setUnsaved(true);
    setChangeSummary(version.changeSummary ?? '');
  };

  const handleSubmitMergeRequest = async () => {
    if (!repo || !selectedNote) return;
    setSubmittingMr(true);
    try {
      const result = await createMergeRequest({
        repoId: repo.id,
        noteId: selectedNote.id,
        title: mrTitle.trim() || `Update ${selectedSection?.title ?? repo.name}`,
        description: mrDescription.trim() || undefined,
        content: workingContent,
      });
      setMrResultUrl(`/merge-requests/${result.id}`);
      setMrOpen(false);
      setMrTitle('');
      setMrDescription('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit merge request');
    } finally {
      setSubmittingMr(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
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

  const displayContent =
    selectedNote && workingContent !== null ? workingContent : selectedNote?.content;

  return (
    <div className={styles.page}>
      {/* MR success banner */}
      {mrResultUrl && (
        <Link href={mrResultUrl} className={styles.mrSuccessBanner}>
          <CheckCircle size={16} /> Merge request submitted! Click to view it.
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
        <span className={styles.editIndicator}>editing</span>
      </div>

      {/* Header */}
      <div className={styles.repoHeader}>
        <h1 className={styles.repoTitle}>
          <Pencil size={20} className={styles.headerIcon} />
          {repo.name}
        </h1>
        <Link href={`/repos/${repo.id}`} className={styles.viewReadLink}>
          <Eye size={13} /> View published
        </Link>
      </div>

      <div className={styles.contentArea}>
        {/* Left: Section tree */}
        <aside className={styles.treePanel}>
          <h3 className={styles.panelTitle}>Sections</h3>
          <SectionTree
            sections={repo.sections}
            selectedId={selectedSectionId}
            onSelect={setSelectedSectionId}
            editable
            onAddSection={handleAddSection}
            onDeleteSection={handleDeleteSection}
            onCreateNote={handleCreateNote}
          />
        </aside>

        {/* Center: Editor */}
        <div className={styles.editorPanel}>
          {selectedSection && selectedNote ? (
            <>
              <div className={styles.editorHeader}>
                <div>
                  <span className={styles.editorSectionTitle}>{selectedSection.title}</span>
                  {savedAt && (
                    <span className={`${styles.savedIndicator} ${unsaved ? styles.unsaved : ''}`}>
                      {unsaved ? 'editing…' : `saved ${formatRelativeTime(savedAt)}`}
                    </span>
                  )}
                </div>
                <div className={styles.editorActions}>
                  <button
                    onClick={() => setPreviewing((p) => !p)}
                    className={styles.previewButton}
                  >
                    <Eye size={13} /> {previewing ? 'Edit' : 'Preview'}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!unsaved && !changeSummary.trim()}
                    className={styles.saveVersionButton}
                  >
                    <CheckCircle size={13} /> Save Version
                  </button>
                </div>
              </div>

              {previewing ? (
                <div className={styles.previewBody}>
                  <NoteEditor content={displayContent} editable={false} />
                </div>
              ) : (
                <NoteEditor
                  key={selectedNote.id}
                  content={selectedNote.content}
                  editable
                  onChange={handleChange}
                  onSave={handleSave}
                />
              )}

              <div className={styles.editorFooter}>
                <input
                  value={changeSummary}
                  onChange={(e) => setChangeSummary(e.target.value)}
                  placeholder="Change summary (optional)"
                  className={styles.summaryInput}
                />
              </div>
            </>
          ) : selectedSection ? (
            <div className={styles.emptyNote}>
              <FileText size={28} className={styles.emptyNoteIcon} />
              <p className={styles.emptyNoteText}>
                This section doesn&apos;t have a note yet.
              </p>
              <button
                type="button"
                className={styles.createNoteButton}
                onClick={() => handleCreateNote(selectedSection.id)}
              >
                <Plus size={12} /> Create Note
              </button>
            </div>
          ) : (
            <div className={styles.emptyNote}>
              <FileText size={28} className={styles.emptyNoteIcon} />
              <p className={styles.emptyNoteText}>
                Add sections to start building your repository.
              </p>
            </div>
          )}
        </div>

        {/* Right: Version history */}
        <aside className={styles.sidePanel}>
          <h3 className={styles.panelTitle}>Version History</h3>
          <div className={styles.versionsBody}>
            {selectedNote && versionsNoteId === selectedNote.id && versions.length > 0 ? (
              versions.map((v, i) => (
                <div key={v.id} className={styles.versionItem}>
                  <div className={styles.versionTopRow}>
                    <span className={styles.versionDot} />
                    <span className={styles.versionUser}>{v.editor.username}</span>
                    {i === 0 && <span className={styles.currentBadge}>current</span>}
                  </div>
                  <span className={styles.versionTime}>{formatRelativeTime(v.createdAt)}</span>
                  {v.changeSummary && (
                    <span className={styles.versionSummary}>— {v.changeSummary}</span>
                  )}
                  <button
                    onClick={() => handleRestore(v)}
                    className={styles.restoreButton}
                  >
                    Restore
                  </button>
                </div>
              ))
            ) : (
              <p className={styles.sidebarEmpty}>
                {selectedNote
                  ? 'No versions yet. Save a version to record changes.'
                  : 'Select a note to see its version history.'}
              </p>
            )}
          </div>

          {/* Submit merge request — fork owners only */}
          {isFork && (
            <div className={styles.sideFooter}>
              <button onClick={() => setMrOpen(true)} className={styles.submitMrButton}>
                <GitMerge size={14} /> Submit Merge Request
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* Submit MR modal */}
      {mrOpen && (
        <div className={styles.modalOverlay} onClick={() => setMrOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <GitMerge size={16} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                Submit Merge Request
              </h2>
              <button className={styles.modalClose} onClick={() => setMrOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <input
                value={mrTitle}
                onChange={(e) => setMrTitle(e.target.value)}
                placeholder="MR title"
                className={styles.mrInput}
              />
              <textarea
                value={mrDescription}
                onChange={(e) => setMrDescription(e.target.value)}
                placeholder="Description (optional)"
                className={styles.mrTextarea}
              />

              <div className={styles.mrPreviewHeader}>
                <span>Proposed changes for “{selectedSection?.title}”</span>
              </div>
              <div className={styles.mrPreview}>
                <NoteEditor content={displayContent} editable={false} />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button onClick={() => setMrOpen(false)} className={styles.mrCancelButton}>
                Cancel
              </button>
              <button
                onClick={handleSubmitMergeRequest}
                disabled={submittingMr || !selectedNote}
                className={styles.submitMrButton}
              >
                {submittingMr ? 'Submitting…' : 'Submit MR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}