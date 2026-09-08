export interface SectionNode {
  id: string;
  parentId: string | null;
  title: string;
  order: number;
  note: {
    id: string;
    content: unknown;
    updatedAt: string;
  } | null;
  children: SectionNode[];
}

type FlatSection = Omit<SectionNode, "children">;

export function buildTree(sections: FlatSection[]): SectionNode[] {
  const byId = new Map<string, SectionNode>();
  for (const s of sections) {
    byId.set(s.id, { ...s, children: [] });
  }
  const roots: SectionNode[] = [];
  for (const s of sections) {
    const node = byId.get(s.id)!;
    if (s.parentId && byId.has(s.parentId)) {
      byId.get(s.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots.sort((a, b) => a.order - b.order);
}

export interface FlattenedSection {
  node: SectionNode;
  depth: number;
}

export function flattenTree(
  nodes: SectionNode[],
  depth = 0,
): FlattenedSection[] {
  const result: FlattenedSection[] = [];
  for (const n of nodes) {
    result.push({ node: n, depth });
    if (n.children.length > 0) {
      result.push(...flattenTree(n.children, depth + 1));
    }
  }
  return result;
}

export function findSection(
  flat: FlattenedSection[],
  id: string | null,
): SectionNode | undefined {
  if (!id) return undefined;
  return flat.find((f) => f.node.id === id)?.node;
}