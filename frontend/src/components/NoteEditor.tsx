'use client';

'use no memo';

import { useEffect, useState, type ReactNode } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import {
  ChevronDown,
  Pilcrow,
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Code,
  Image as ImageIcon,
  Link as LinkIcon,
  Undo2,
  Redo2,
} from 'lucide-react';
import styles from './CSS/noteEditor.module.css';
import { toEditorContent } from '@/lib/notes';

interface NoteEditorProps {
  content: unknown;
  editable: boolean;
  onChange?: (content: unknown) => void;
  onSave?: (content: unknown) => void;
  placeholder?: string;
}

const BLOCK_OPTIONS = [
  { value: 'paragraph', label: 'Paragraph', icon: <Pilcrow size={14} /> },
  { value: 'heading1', label: 'Heading 1', icon: <Heading1 size={14} /> },
  { value: 'heading2', label: 'Heading 2', icon: <Heading2 size={14} /> },
  { value: 'heading3', label: 'Heading 3', icon: <Heading3 size={14} /> },
];

// Shared TipTap editor used by the repo viewer (editable=false) and the editor
// page (editable=true). All saving, versioning and merge-request UI lives in
// the surrounding page; this editor only edits and reports changes.
export function NoteEditor({
  content,
  editable,
  onChange,
  onSave,
  placeholder,
}: NoteEditorProps) {
  const [blockMenuOpen, setBlockMenuOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Image,
      Placeholder.configure({
        placeholder: editable ? placeholder || 'Write your note here…' : '',
      }),
    ],
    editable,
    immediatelyRender: false,
    content: toEditorContent(content),
    onUpdate: ({ editor: e }) => onChange?.(e.getJSON()),
    editorProps: {
      attributes: {
        class: styles.proseMirror,
      },
    },
  });

  // Keep the editor in sync when the note content is refreshed externally.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const current = editor.getJSON();
    if (JSON.stringify(current) === JSON.stringify(content)) return;
    editor.commands.setContent(toEditorContent(content));
  }, [editor, content]);

  // Cmd/Ctrl + S triggers the page-provided save handler.
  useEffect(() => {
    if (!editable || !onSave || !editor) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        onSave(editor.getJSON());
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editable, onSave, editor]);

  const applyBlock = (value: string) => {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (value === 'paragraph') chain.setParagraph();
    else if (value === 'heading1') chain.setHeading({ level: 1 });
    else if (value === 'heading2') chain.setHeading({ level: 2 });
    else if (value === 'heading3') chain.setHeading({ level: 3 });
    chain.run();
    setBlockMenuOpen(false);
  };

  const currentBlock = editor?.isActive('heading', { level: 1 })
    ? 'heading1'
    : editor?.isActive('heading', { level: 2 })
      ? 'heading2'
      : editor?.isActive('heading', { level: 3 })
        ? 'heading3'
        : 'paragraph';

  const activeLabel =
    BLOCK_OPTIONS.find((o) => o.value === currentBlock)?.label ?? 'Paragraph';

  const openImage = () => {
    if (!editor) return;
    const url = window.prompt('Image URL');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const openLink = () => {
    if (!editor) return;
    const previous = editor.getAttributes('link')?.href as string | undefined;
    const url = window.prompt('Link URL', previous ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: url })
      .run();
  };

  return (
    <div className={styles.editor}>
      {editable && (
        <div className={styles.toolbar}>
          <div className={styles.blockSelect}>
            <button
              type="button"
              className={styles.blockButton}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setBlockMenuOpen((o) => !o)}
            >
              <span className={styles.blockButtonLabel}>{activeLabel}</span>
              <ChevronDown size={13} />
            </button>
            {blockMenuOpen && (
              <div className={styles.blockMenu}>
                {BLOCK_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`${styles.blockOption} ${currentBlock === option.value ? styles.blockOptionActive : ''}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyBlock(option.value)}
                  >
                    {option.icon}
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <ToolbarSeparator />

          <ToolbarButton
            icon={<Bold size={14} />}
            title="Bold"
            active={editor?.isActive('bold') ?? false}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          />
          <ToolbarButton
            icon={<Italic size={14} />}
            title="Italic"
            active={editor?.isActive('italic') ?? false}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          />
          <ToolbarButton
            icon={<UnderlineIcon size={14} />}
            title="Underline"
            active={editor?.isActive('underline') ?? false}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
          />

          <ToolbarSeparator />

          <ToolbarButton
            icon={<List size={14} />}
            title="Bullet list"
            active={editor?.isActive('bulletList') ?? false}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          />
          <ToolbarButton
            icon={<ListOrdered size={14} />}
            title="Numbered list"
            active={editor?.isActive('orderedList') ?? false}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          />
          <ToolbarButton
            icon={<Code size={14} />}
            title="Code block"
            active={editor?.isActive('codeBlock') ?? false}
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          />

          <ToolbarSeparator />

          <ToolbarButton
            icon={<ImageIcon size={14} />}
            title="Insert image"
            onClick={openImage}
          />
          <ToolbarButton
            icon={<LinkIcon size={14} />}
            title="Add or remove link"
            active={editor?.isActive('link') ?? false}
            onClick={openLink}
          />

          <ToolbarSeparator />

          <ToolbarButton
            icon={<Undo2 size={14} />}
            title="Undo"
            onClick={() => editor?.chain().focus().undo().run()}
          />
          <ToolbarButton
            icon={<Redo2 size={14} />}
            title="Redo"
            onClick={() => editor?.chain().focus().redo().run()}
          />
        </div>
      )}

      <div className={styles.editorBody}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function ToolbarButton({
  icon,
  title,
  active = false,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`${styles.toolbarButton} ${active ? styles.toolbarButtonActive : ''}`}
    >
      {icon}
    </button>
  );
}

function ToolbarSeparator() {
  return <span className={styles.toolbarSeparator} />;
}