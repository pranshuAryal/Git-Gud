import diff_match_patch from 'diff-match-patch';

interface JsonNode {
  type?: string;
  text?: unknown;
  content?: unknown;
}

function isNode(value: unknown): value is JsonNode {
  return typeof value === 'object' && value !== null;
}

function nodeText(node: JsonNode): string {
  if (typeof node.text === 'string') return node.text;
  if (Array.isArray(node.content)) {
    return node.content.filter(isNode).map(nodeText).join('');
  }
  return '';
}

// Convert a TipTap-style JSON document into plain text (mirrors the frontend).
export function docToPlainText(content: unknown): string {
  if (
    !isNode(content) ||
    content.type !== 'doc' ||
    !Array.isArray(content.content)
  ) {
    return '';
  }

  const lines: string[] = [];
  for (const raw of content.content) {
    if (!isNode(raw)) continue;

    if (raw.type === 'heading') {
      const text = nodeText(raw);
      if (text) lines.push(`# ${text}`);
    } else if (raw.type === 'bulletList' && Array.isArray(raw.content)) {
      for (const rawItem of raw.content) {
        if (!isNode(rawItem) || rawItem.type !== 'listItem') continue;
        const text = (Array.isArray(rawItem.content) ? rawItem.content : [])
          .filter(isNode)
          .filter((c) => c.type === 'paragraph')
          .map(nodeText)
          .join(' ');
        if (text) lines.push(`- ${text}`);
      }
    } else if (
      raw.type === 'paragraph' ||
      raw.type === 'blockquote' ||
      raw.type === 'blockQuote'
    ) {
      const text = nodeText(raw);
      if (text) lines.push(text);
    } else if (typeof raw.text === 'string') {
      if (raw.text) lines.push(raw.text);
    }
  }

  return lines.join('\n');
}

export interface FlatDiffRow {
  type: 'equal' | 'insert' | 'delete';
  text: string;
}

// Compute a flat, ordered diff between two note documents using
// diff-match-patch. Equal/deleted/inserted text chunks are emitted in a single
// sequence so the frontend can render them side by side.
export function computeFlatDiff(
  oldDoc: unknown,
  newDoc: unknown,
): FlatDiffRow[] {
  const oldText = docToPlainText(oldDoc);
  const newText = docToPlainText(newDoc);

  const dmp = new diff_match_patch();
  const diffs = dmp.diff_main(oldText, newText, false);
  dmp.diff_cleanupSemantic(diffs);

  const rows: FlatDiffRow[] = [];
  for (const [op, text] of diffs) {
    if (!text) continue;
    if (op === diff_match_patch.DIFF_EQUAL) {
      rows.push({ type: 'equal', text });
    } else if (op === diff_match_patch.DIFF_DELETE) {
      rows.push({ type: 'delete', text });
    } else if (op === diff_match_patch.DIFF_INSERT) {
      rows.push({ type: 'insert', text });
    }
  }

  return rows;
}
