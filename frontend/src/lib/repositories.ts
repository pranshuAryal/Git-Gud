const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface SectionNodeInput {
  title: string;
  order: number;
  children?: SectionNodeInput[];
}

export interface CreateRepositoryPayload {
  name: string;
  description?: string;
  isPublic: boolean;
  sections?: SectionNodeInput[];
}

export interface RepoCardData {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  updatedAt: string;
  owner: { id: string; username: string };
  forkedFrom: { id: string; name: string; owner: { username: string } } | null;
  _count: { stars: number; forksMade: number; sections: number };
}

export interface RepositoryListResponse {
  items: RepoCardData[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export async function fetchRepositories(params: {
  scope: 'owned' | 'forked' | 'discover';
  search?: string;
  page?: number;
  limit?: number;
}): Promise<RepositoryListResponse> {
  const query = new URLSearchParams();
  query.set('scope', params.scope);
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));

  const res = await fetch(`${API_URL}/repositories?${query.toString()}`, {
    credentials: 'include',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message || 'Failed to load repositories');
  }

  return res.json();
}

export async function createRepository(payload: CreateRepositoryPayload) {
  const res = await fetch(`${API_URL}/repositories`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message || 'Failed to create repository');
  }

  return res.json(); // { repo, createdNotes } — repo.id is what we redirect to
}