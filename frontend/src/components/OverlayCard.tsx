"use client";

import styles from "./CSS/overlayCard.module.css";

interface OverlayCardProps {
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}

export default function OverlayCard({
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: OverlayCardProps) {
  return (
    <div className={styles.overlayMask} onClick={onClose}>
      {/* StopPropagation prevents clicking inside the card from closing it */}
      <div className={styles.cardContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.warningIcon}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <p className={styles.messageText}>{message}</p>

        <div className={styles.actionGroup}>
          <button onClick={onClose} className={styles.cancelButton}>
            Cancel
          </button>
          <button onClick={onConfirm} className={styles.confirmButton}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}