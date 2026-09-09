"use client";

import { X, Check } from "lucide-react";
import type { FlatDiffRow } from "@/lib/mergeRequests";
import styles from "./CSS/diffView.module.css";

interface ColumnEntry {
  left: string | null;
  right: string | null;
  kind: "equal" | "add" | "remove" | "modify";
}

interface RenderedLine {
  left: string;
  right: string;
  leftNum: number | null;
  rightNum: number | null;
  kind: "equal" | "add" | "remove" | "modify";
}

// Pair consecutive delete + insert runs into modify rows so the two sides stay
// visually aligned side by side while the underlying diff stays flat.
function buildColumns(rows: FlatDiffRow[]): ColumnEntry[] {
  const out: ColumnEntry[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.type === "equal") {
      out.push({ left: row.text, right: row.text, kind: "equal" });
    } else if (row.type === "delete") {
      const next = rows[i + 1];
      if (next && next.type === "insert") {
        out.push({ left: row.text, right: next.text, kind: "modify" });
        i += 1;
      } else {
        out.push({ left: row.text, right: null, kind: "remove" });
      }
    } else {
      out.push({ left: null, right: row.text, kind: "add" });
    }
  }
  return out;
}

function splitLines(text: string): string[] {
  const lines = text.split("\n");
  // Drop the trailing empty segment produced by a trailing newline.
  if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
  return lines.length ? lines : [""];
}

function renderLines(entries: ColumnEntry[]): RenderedLine[] {
  let leftCount = 0;
  let rightCount = 0;
  const out: RenderedLine[] = [];
  for (const entry of entries) {
    const leftLines = entry.left !== null ? splitLines(entry.left) : [];
    const rightLines = entry.right !== null ? splitLines(entry.right) : [];
    const count = Math.max(leftLines.length, rightLines.length);
    for (let i = 0; i < count; i++) {
      const left = leftLines[i] ?? "";
      const right = rightLines[i] ?? "";
      out.push({
        left,
        right,
        leftNum: entry.left !== null ? ++leftCount : null,
        rightNum: entry.right !== null ? ++rightCount : null,
        kind: entry.kind,
      });
    }
  }
  return out;
}

export function DiffView({
  rows,
  showHeader = false,
}: {
  rows: FlatDiffRow[];
  showHeader?: boolean;
}) {
  const lines = renderLines(buildColumns(rows));

  if (lines.length === 0 || lines.every((l) => l.kind === "equal")) {
    return <p className={styles.empty}>No changes between these contents.</p>;
  }

  return (
    <div className={styles.wrap}>
      {showHeader && (
        <div className={styles.header}>
          <span className={styles.headerOriginal}>
            <X size={13} /> Original
          </span>
          <span className={styles.headerProposed}>
            <Check size={13} /> Proposed
          </span>
        </div>
      )}
      <div className={styles.scroll}>
        {lines.map((line, i) => {
          const key = `${line.kind}-${i}`;
          const leftClass =
            line.kind === "equal"
              ? styles.equal
              : line.kind === "remove" || line.kind === "modify"
                ? styles.remove
                : styles.muted;
          const rightClass =
            line.kind === "equal"
              ? styles.equal
              : line.kind === "add" || line.kind === "modify"
                ? styles.add
                : styles.muted;
          const leftRemoved = line.kind === "remove" || line.kind === "modify";
          const rightAdded = line.kind === "add" || line.kind === "modify";
          return (
            <div key={key} className={styles.row}>
              <div className={`${styles.cell} ${leftClass}`}>
                {leftRemoved && (
                  <span className={`${styles.sign} ${styles.signMinus}`}>-</span>
                )}
                <span className={styles.lineNum}>{line.leftNum ?? ""}</span>
                <span className={styles.lineText}>{line.left}</span>
              </div>
              <div className={`${styles.cell} ${rightClass}`}>
                {rightAdded && (
                  <span className={`${styles.sign} ${styles.signPlus}`}>+</span>
                )}
                <span className={styles.lineNum}>{line.rightNum ?? ""}</span>
                <span className={styles.lineText}>{line.right}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}