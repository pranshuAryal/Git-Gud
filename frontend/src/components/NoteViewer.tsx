"use client";

import styles from "./CSS/noteViewer.module.css";
import { docToBlocks } from "@/lib/notes";

export function NoteViewer({ content }: { content: unknown }) {
  const blocks = docToBlocks(content);

  if (blocks.length === 0) {
    return <p className={styles.empty}>This note is empty. Start writing below.</p>;
  }

  return (
    <div className={styles.viewer}>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "heading":
            return (
              <h3 key={i} className={styles.heading}>
                {block.text}
              </h3>
            );
          case "bullet":
            return (
              <p key={i} className={styles.bullet}>
                <span className={styles.bulletDot}>•</span>
                {block.text}
              </p>
            );
          default:
            return (
              <p key={i} className={styles.paragraph}>
                {block.text}
              </p>
            );
        }
      })}
    </div>
  );
}