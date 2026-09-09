"use client";

import { apiFetch } from "@/lib/http";

export type NoteBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullet"; text: string };

export type NoteContent = unknown;

interface DocNode {
  type?: string;
  text?: unknown;
  content?: unknown;
}

function isDocNode(value: unknown): value is DocNode {
  return typeof value === "object" && value !== null;
}

function getText(node: DocNode | null | undefined): string {
  if (!node) return "";
  if (typeof node.text === "string") return node.text;
  if (Array.isArray(node.content)) {
    return node.content
      .filter(isDocNode)
      .map(getText)
      .filter(Boolean)
      .join("");
  }
  return "";
}

// Render a TipTap-style JSON document into an array of blocks.
export function docToBlocks(content: NoteContent): NoteBlock[] {
  if (!isDocNode(content) || content.type !== "doc" || !Array.isArray(content.content)) {
    return [];
  }
  const blocks: NoteBlock[] = [];

  for (const raw of content.content) {
    if (!isDocNode(raw)) continue;
    const node = raw;
    if (node.type === "heading") {
      blocks.push({ type: "heading", text: getText(node) });
    } else if (node.type === "bulletList" && Array.isArray(node.content)) {
      for (const rawItem of node.content) {
        if (!isDocNode(rawItem) || rawItem.type !== "listItem") continue;
        const itemText = (Array.isArray(rawItem.content) ? rawItem.content : [])
          .filter(isDocNode)
          .filter((c) => c.type === "paragraph")
          .map(getText)
          .join(" ");
        if (itemText) blocks.push({ type: "bullet", text: itemText });
      }
    } else if (node.type === "blockquote") {
      blocks.push({ type: "paragraph", text: getText(node) });
    } else if (node.type === "paragraph" || node.type === "text") {
      const text = getText(node);
      if (text) blocks.push({ type: "paragraph", text });
    }
  }
  return blocks;
}

// Serialize plain text into a TipTap-style document.
export function textToDoc(text: string): object {
  const lines = text.split("\n");
  const content: unknown[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("- ")) {
      const last = content[content.length - 1];
      const item = {
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: trimmed.slice(2) }],
          },
        ],
      };
      if (isDocNode(last) && last.type === "bulletList" && Array.isArray(last.content)) {
        last.content.push(item);
      } else {
        content.push({ type: "bulletList", content: [item] });
      }
    } else {
      content.push({
        type: "paragraph",
        content: [{ type: "text", text: trimmed }],
      });
    }
  }
  if (content.length === 0) content.push({ type: "paragraph", content: [] });
  return { type: "doc", content };
}

// Render a note document back into plain text for editing.
export function docToText(content: NoteContent): string {
  return docToBlocks(content)
    .map((b) =>
      b.type === "bullet" ? `- ${b.text}` : b.type === "heading" ? `# ${b.text}` : b.text,
    )
    .join("\n");
}

// Return a TipTap JSON document if valid, otherwise an empty document string so
// the editor always receives something ProseMirror can render.
export function toEditorContent(content: NoteContent): Record<string, unknown> | string {
  if (
    typeof content === "object" &&
    content !== null &&
    (content as { type?: unknown }).type === "doc"
  ) {
    return content as Record<string, unknown>;
  }
  return "";
}

const EMPTY_DOC = Object.freeze({
  type: "doc",
  content: [{ type: "paragraph" }],
});

// Normalize a note document so editors/pages always receive a valid doc. An
// empty object `{}` (fresh note) becomes an empty paragraph document.
export function normalizeNoteContent(content: NoteContent): Record<string, unknown> {
  if (
    typeof content === "object" &&
    content !== null &&
    (content as { type?: unknown }).type === "doc"
  ) {
    return content as Record<string, unknown>;
  }
  return EMPTY_DOC as unknown as Record<string, unknown>;
}

export interface VersionData {
  id: string;
  content: NoteContent;
  changeSummary: string | null;
  createdAt: string;
  editedBy: string;
  editor: { id: string; username: string };
}

export interface NoteData {
  id: string;
  content: NoteContent;
  updatedAt: string;
  section: { id: string; title: string };
  lastVersion: {
    editedBy: { id: string; username: string };
    createdAt: string;
  } | null;
  versionNumber: number;
  versions: {
    id: string;
    changeSummary: string | null;
    createdAt: string;
    editedBy: { id: string; username: string };
  }[];
}

export function saveNote(
  repoId: string,
  noteId: string,
  content: unknown,
  changeSummary?: string,
) {
  return apiFetch(`/repositories/${repoId}/notes/${noteId}`, {
    method: "PATCH",
    body: JSON.stringify({ content, changeSummary }),
  });
}

export function fetchNote(repoId: string, noteId: string): Promise<NoteData> {
  return apiFetch(`/repositories/${repoId}/notes/${noteId}`);
}

export function fetchNoteVersions(
  repoId: string,
  noteId: string,
): Promise<VersionData[]> {
  return apiFetch(`/repositories/${repoId}/notes/${noteId}/versions`);
}