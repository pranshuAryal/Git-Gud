'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, Lock } from 'lucide-react';
import { createRepository } from '@/lib/repositories';
import { SectionTreeBuilder, SectionNode, toSectionInput } from '@/components/SectionTreeBuilder';
import styles from './newRepo.module.css';

export default function NewRepositoryPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [sections, setSections] = useState<SectionNode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Repository name is required');
      return;
    }

    setLoading(true);
    try {
      const { repo } = await createRepository({
        name: name.trim(),
        description: description.trim() || undefined,
        isPublic,
        sections: sections.length > 0 ? toSectionInput(sections) : undefined,
      });
      router.push(`/repos/${repo.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className={styles.page}>
    <div className={styles.card}>
      <h1 className={styles.title}>Create New Repository</h1>
      <p className={styles.subtitle}>Set up a new subject repository for your course notes</p>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label className={styles.label}>
            Repository Name <span className={styles.required}>*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Data Structures and Algorithms"
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this repository about?"
            className={styles.textarea}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Visibility</label>
          <div className={styles.visibilityGrid}>
            <button
              type="button"
              onClick={() => setIsPublic(true)}
              className={`${styles.visibilityOption} ${isPublic ? styles.visibilityOptionActive : ''}`}
            >
              <Globe size={17} className={styles.visibilityIcon} />
              <div>
                <p className={styles.visibilityTitle}>Public</p>
                <p className={styles.visibilityDesc}>Anyone can view and fork this repo</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setIsPublic(false)}
              className={`${styles.visibilityOption} ${!isPublic ? styles.visibilityOptionActive : ''}`}
            >
              <Lock size={17} className={styles.visibilityIcon} />
              <div>
                <p className={styles.visibilityTitle}>Private</p>
                <p className={styles.visibilityDesc}>Only you can see this repo</p>
              </div>
            </button>
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.sectionLabel}>Initial Sections (optional)</span>
          <SectionTreeBuilder tree={sections} onChange={setSections} />
        </div>

        <div className={styles.footer}>
          <button type="button" onClick={() => router.back()} className={styles.cancelButton}>
            Cancel
          </button>
          <button type="submit" disabled={loading} className={styles.submitButton}>
            {loading ? 'Creating…' : 'Create Repository'}
          </button>
        </div>
      </form>
    </div>
  </div>
);
}