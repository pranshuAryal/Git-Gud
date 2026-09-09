'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, Plus, Trash2, ArrowUp, ArrowDown, FolderOpen } from 'lucide-react';
import styles from './CSS/SectionTreeBuilder.module.css';

export interface SectionNode {
  id: string;
  title: string;
  children: SectionNode[];
}

function makeId() {
  return crypto.randomUUID();
}

// ---- immutable tree helpers ----

function addChild(tree: SectionNode[], parentId: string | null, title: string): SectionNode[] {
  const newNode: SectionNode = { id: makeId(), title, children: [] };
  if (parentId === null) return [...tree, newNode];

  return tree.map((node) =>
    node.id === parentId
      ? { ...node, children: [...node.children, newNode] }
      : { ...node, children: addChild(node.children, parentId, title) },
  );
}

function removeNode(tree: SectionNode[], id: string): SectionNode[] {
  return tree
    .filter((node) => node.id !== id)
    .map((node) => ({ ...node, children: removeNode(node.children, id) }));
}

function moveNode(tree: SectionNode[], id: string, direction: 'up' | 'down'): SectionNode[] {
  const index = tree.findIndex((n) => n.id === id);
  if (index !== -1) {
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= tree.length) return tree;
    const copy = [...tree];
    [copy[index], copy[swapWith]] = [copy[swapWith], copy[index]];
    return copy;
  }
  return tree.map((node) => ({ ...node, children: moveNode(node.children, id, direction) }));
}

export interface SectionInputPayload {
  title: string;
  order: number;
  children?: SectionInputPayload[];
}

export function toSectionInput(tree: SectionNode[]): SectionInputPayload[] {
  return tree.map((node, i) => ({
    title: node.title,
    order: i,
    ...(node.children.length > 0 ? { children: toSectionInput(node.children) } : {}),
  }));
}

// ---- component ----

export function SectionTreeBuilder({
  tree,
  onChange,
}: {
  tree: SectionNode[];
  onChange: (tree: SectionNode[]) => void;
}) {
  const [newTitle, setNewTitle] = useState('');

  const handleAddTopLevel = () => {
    const title = newTitle.trim();
    if (!title) return;
    onChange(addChild(tree, null, title));
    setNewTitle('');
  };

  return (
    <div className={styles.builder}>
      <div className={styles.addRow}>
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTopLevel())}
          placeholder="e.g. Week 1 - Intro to Algorithms"
          className={styles.addInput}
        />
        <button type="button" onClick={handleAddTopLevel} className={styles.addButton}>
          <Plus size={15} /> Add
        </button>
      </div>

      {tree.length === 0 ? (
        <div className={styles.emptyState}>
          <FolderOpen size={28} className={styles.emptyIcon} />
          <p>No sections added yet — you can also add these later from the repository page</p>
        </div>
      ) : (
        <div className={styles.tree}>
          {tree.map((node, i) => (
            <SectionRow
              key={node.id}
              node={node}
              depth={0}
              isFirst={i === 0}
              isLast={i === tree.length - 1}
              onAddChild={(parentId, title) => onChange(addChild(tree, parentId, title))}
              onRemove={(id) => onChange(removeNode(tree, id))}
              onMove={(id, dir) => onChange(moveNode(tree, id, dir))}
              siblingCount={tree.length}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SectionRow({
  node,
  depth,
  isFirst,
  isLast,
  onAddChild,
  onRemove,
  onMove,
}: {
  node: SectionNode;
  depth: number;
  isFirst: boolean;
  isLast: boolean;
  onAddChild: (parentId: string, title: string) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: 'up' | 'down') => void;
  siblingCount: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const [addingChild, setAddingChild] = useState(false);
  const [childTitle, setChildTitle] = useState('');
  const hasChildren = node.children.length > 0;

  const submitChild = () => {
    const title = childTitle.trim();
    if (!title) return;
    onAddChild(node.id, title);
    setChildTitle('');
    setAddingChild(false);
    setExpanded(true);
  };

  return (
    <div>
      <div className={styles.row} style={{ paddingLeft: depth * 24 }}>
        <button
          type="button"
          className={styles.chevronButton}
          onClick={() => setExpanded((v) => !v)}
          disabled={!hasChildren}
          aria-label={hasChildren ? (expanded ? 'Collapse' : 'Expand') : undefined}
        >
          {hasChildren ? (
            expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : (
            <span className={styles.chevronSpacer} />
          )}
        </button>

        <span className={styles.rowTitle}>{node.title}</span>

        <div className={styles.rowActions}>
          <button type="button" onClick={() => onMove(node.id, 'up')} disabled={isFirst} title="Move up">
            <ArrowUp size={13} />
          </button>
          <button type="button" onClick={() => onMove(node.id, 'down')} disabled={isLast} title="Move down">
            <ArrowDown size={13} />
          </button>
          <button type="button" onClick={() => setAddingChild((v) => !v)} title="Add sub-section">
            <Plus size={13} />
          </button>
          <button type="button" onClick={() => onRemove(node.id)} className={styles.deleteButton} title="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {addingChild && (
        <div className={styles.addRow} style={{ paddingLeft: (depth + 1) * 24 }}>
          <input
            value={childTitle}
            onChange={(e) => setChildTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), submitChild())}
            placeholder="Sub-section name"
            className={styles.addInput}
            autoFocus
          />
          <button type="button" onClick={submitChild} className={styles.addButton}>
            <Plus size={14} /> Add
          </button>
        </div>
      )}

      {expanded &&
        node.children.map((child, i) => (
          <SectionRow
            key={child.id}
            node={child}
            depth={depth + 1}
            isFirst={i === 0}
            isLast={i === node.children.length - 1}
            onAddChild={onAddChild}
            onRemove={onRemove}
            onMove={onMove}
            siblingCount={node.children.length}
          />
        ))}
    </div>
  );
}