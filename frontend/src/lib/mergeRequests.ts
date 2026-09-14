"use client";

import { apiFetch } from "@/lib/http";

export interface FlatDiffRow {
  type: "equal" | "insert" | "delete";
  text: string;
}

export interface MergeRequestData {
  id: string;
  title: string;
  description: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  feedback: string | null;
  createdAt: string;
  submittedBy: string;
  submitter: { id: string; username: string };
  repo: {
    id: string;
    name: string;
    ownerId: string;
    owner?: { id: string; username: string };
  };
  note: { id: string; section: { id: string; title: string } };
  comments: {
    id: string;
    content: string;
    createdAt: string;
    author: { id: string; username: string };
  }[];
  diff?: FlatDiffRow[];
}

export interface CreateMergeRequestPayload {
  repoId: string;
  noteId: string;
  title: string;
  description?: string;
  content: unknown;
}

export function createMergeRequest(
  payload: CreateMergeRequestPayload,
): Promise<{ id: string; repo: { id: string; name: string } }> {
  return apiFetch("/merge-requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchMergeRequests(params: {
  repoId?: string;
  status?: string;
  scope?: "submitted" | "received";
} = {}): Promise<MergeRequestData[]> {
  const query = new URLSearchParams();
  if (params.repoId) query.set("repoId", params.repoId);
  if (params.status) query.set("status", params.status);
  if (params.scope) query.set("scope", params.scope);
  const qs = query.toString();
  return apiFetch(`/merge-requests${qs ? `?${qs}` : ""}`);
}

export function fetchMergeRequest(id: string): Promise<MergeRequestData> {
  return apiFetch(`/merge-requests/${id}`);
}

export function updateMergeRequestStatus(
  id: string,
  payload: { status: "approved" | "rejected"; feedback?: string },
) {
  return apiFetch(`/merge-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function cancelMergeRequest(id: string) {
  return apiFetch(`/merge-requests/${id}/cancel`, {
    method: "PATCH",
  });
}

export function addMergeRequestComment(id: string, content: string) {
  return apiFetch(`/merge-requests/${id}/comments`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}