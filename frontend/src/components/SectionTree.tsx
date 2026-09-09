"use client";

import { useState } from "react";
import {
  FileText,
  Folder,
  Plus,
  Trash2,
  X,
  Check,
  ChevronDown,
} from "lucide-react";
import { buildTree, type SectionNode } from "@/lib/sections";
import styles from "./CSS/sectionTree.module.css";

export interface SectionTreeItem {
  id: string;
  parentId: string | null;
  title: string;
  order: number;
  note: { id: string; content: unknown; updatedAt: string } | null;
}

interface SectionTreeProps {
  sections: SectionTreeItem[];
  selectedId: string | null;
  onSelect: (sectionId: string) => void;
  editable?: boolean;
  onAddSection: (title: string, parentId: string | null) => void;
  onDeleteSection: (sectionId: string) => void;
  onCreateNote: (sectionId: string) => void;
}

export function SectionTree({
  sections,
  selectedId,
  onSelect,
  editable = false,
  onAddSection,
  onDeleteSection,
  onCreateNote,
}: SectionTreeProps) {
  const [addingTo, setAddingTo] = useState<string | "root" | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const roots = buildTree(sections);
  const selected = sections.find((s) => s.id === selectedId);

  const toggleCollapse = (sectionId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const startAdd = (parentId: string) => {
    setAddingTo(parentId);
    setNewTitle("");
  };

  const commitAdd = (parentId: string | null) => {
    const title = newTitle.trim();
    if (!title) {
      setAddingTo(null);
      return;
    }
    onAddSection(title, parentId);
    setAddingTo(null);
    setNewTitle("");
  };

  const renderNode = (node: SectionNode, depth: number) => {
    const hasChildren = node.children.length > 0;
    const isCollapsed = collapsed.has(node.id);

    return (
      <div key={node.id} className={styles.group}>
        <div
          className={`${styles.row} ${selectedId === node.id ? styles.active : ""}`}
          style={{ paddingLeft: 8 + depth * 16 }}
        >
          <button
            type="button"
            className={styles.selectButton}
            onClick={() => {
              onSelect(node.id);
              if (hasChildren) toggleCollapse(node.id);
            }}
          >
            {node.note ? (
              <FileText size={14} className={styles.icon} />
            ) : (
              <Folder size={14} className={styles.icon} />
            )}
            <span className={styles.title}>{node.title}</span>
          </button>
          {editable && (
            <div className={styles.actions}>
              {!node.note && (
                <button
                  type="button"
                  className={styles.actionButton}
                  title="Add sub-section"
                  onClick={() => startAdd(node.id)}
                >
                  <Plus size={12} />
                </button>
              )}
              <button
                type="button"
                className={styles.actionButton}
                title="Delete section"
                onClick={() => onDeleteSection(node.id)}
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
          {hasChildren && (
            <button
              type="button"
              className={styles.chevronButton}
              title={isCollapsed ? "Expand section" : "Collapse section"}
              aria-expanded={!isCollapsed}
              onClick={() => toggleCollapse(node.id)}
            >
              <ChevronDown
                size={14}
                className={`${styles.chevronIcon} ${isCollapsed ? styles.chevronCollapsed : ""}`}
              />
            </button>
          )}
        </div>

        {editable && addingTo === node.id && (
          <div className={styles.addRow} style={{ paddingLeft: 24 + depth * 16 }}>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitAdd(node.id);
                if (e.key === "Escape") setAddingTo(null);
              }}
              placeholder="Section name"
              className={styles.addInput}
              autoFocus
            />
            <button
              type="button"
              className={styles.confirmButton}
              onClick={() => commitAdd(node.id)}
            >
              <Check size={12} />
            </button>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => setAddingTo(null)}
            >
              <X size={12} />
            </button>
          </div>
        )}

        {editable && selectedId === node.id && !node.note && (
          <div className={styles.noteActions}>
            <button
              type="button"
              className={styles.createNoteButton}
              onClick={() => onCreateNote(node.id)}
            >
              <Plus size={12} /> Create Note
            </button>
          </div>
        )}

        {!isCollapsed && node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className={styles.tree}>
      {sections.length === 0 && (
        <p className={styles.empty}>
          {editable
            ? "No sections yet. Add one to get started."
            : "This repository has no sections."}
        </p>
      )}

      {roots.map((node) => renderNode(node, 0))}

      {editable && addingTo === "root" && (
        <div className={styles.addRow}>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitAdd(null);
              if (e.key === "Escape") setAddingTo(null);
            }}
            placeholder="Section name"
            className={styles.addInput}
            autoFocus
          />
          <button
            type="button"
            className={styles.confirmButton}
            onClick={() => commitAdd(null)}
          >
            <Check size={12} />
          </button>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={() => setAddingTo(null)}
          >
            <X size={12} />
          </button>
        </div>
      )}

      {editable && (
        <button
          type="button"
          className={styles.addRootButton}
          onClick={() => {
            setAddingTo("root");
            setNewTitle("");
          }}
        >
          <Plus size={13} /> Add Section
        </button>
      )}

      <span className={styles.selectedHint}>
        {selected ? `Editing ${selected.title}` : "No section selected"}
      </span>
    </div>
  );
}