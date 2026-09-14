import { apiFetch } from "@/lib/http";

export interface AuthUser {
  userId: string;
  email: string;
  username: string;
}

export function fetchMe(): Promise<AuthUser> {
  return apiFetch<AuthUser>("/auth/me");
}

export function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ success: boolean }> {
  return apiFetch("/auth/change-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
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

export function fetchRepositories(params: {
  scope: "owned" | "forked" | "discover" | "starred";
  search?: string;
  page?: number;
  limit?: number;
}): Promise<RepositoryListResponse> {
  const query = new URLSearchParams();
  query.set("scope", params.scope);
  if (params.search) query.set("search", params.search);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  return apiFetch(`/repositories?${query.toString()}`);
}

export interface CreateRepositoryPayload {
  name: string;
  description?: string;
  isPublic: boolean;
  sections?: SectionNodeInput[];
}

export interface SectionNodeInput {
  title: string;
  order: number;
  children?: SectionNodeInput[];
}

export function createRepository(payload: CreateRepositoryPayload): Promise<{
  repo: { id: string; name: string };
  createdNotes: { noteId: string; content: unknown }[];
}> {
  return apiFetch(`/repositories`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface RepositoryDetail {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  editable: boolean;
  forkedFrom: { id: string; name: string; owner: { username: string } } | null;
  owner: { id: string; username: string };
  sections: {
    id: string;
    parentId: string | null;
    title: string;
    order: number;
    note: {
      id: string;
      content: unknown;
      updatedAt: string;
    } | null;
  }[];
  _count: { stars: number; forksMade: number; sections: number };
}

export function fetchRepository(id: string): Promise<RepositoryDetail> {
  return apiFetch(`/repositories/${id}`);
}

export function starRepository(id: string) {
  return apiFetch(`/repositories/${id}/star`, { method: "POST" });
}

export function unstarRepository(id: string) {
  return apiFetch(`/repositories/${id}/star`, { method: "DELETE" });
}

export function checkStarred(id: string): Promise<{ starred: boolean }> {
  return apiFetch(`/repositories/${id}/starred`);
}

export function forkRepository(id: string): Promise<{ id: string; name: string; forkedFromId: string | null }> {
  return apiFetch(`/repositories/${id}/fork`);
}

export function createSection(repoId: string, payload: {
  title: string;
  parentId?: string | null;
  order?: number;
}) {
  return apiFetch(`/repositories/${repoId}/sections`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteSection(repoId: string, sectionId: string) {
  return apiFetch(`/repositories/${repoId}/sections/${sectionId}`, { method: "DELETE" });
}

export function createNote(repoId: string, sectionId: string) {
  return apiFetch(`/repositories/${repoId}/sections/${sectionId}/note`, { method: "POST" });
}

export interface ProfileData {
  profile: { id: string; username: string; name: string | null; bio: string | null; createdAt: string };
  isSelf: boolean;
  counts: {
    repositories: number;
    forksMade: number;
    starsReceived: number;
    mergeRequestsReceived: number;
    mergeRequestsSubmitted: number;
  };
  repositories: RepoCardData[];
}

export function fetchProfile(userId: string): Promise<ProfileData> {
  return apiFetch(`/profiles/${userId}`);
}

export function updateProfile(
  userId: string,
  payload: { username?: string; name?: string; bio?: string },
): Promise<{ profile: ProfileData["profile"] }> {
  return apiFetch(`/profiles/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}