"use client";

import React from "react";
import Link from "next/link";
import { Menu, Search, Bell, HelpCircle } from "lucide-react";
import { AuthProvider, useAuth } from "@/app/context/AuthContext";
import styles from "./settings.module.css";

function GitIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function SettingsShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const name = user?.username || "…";
  const handle = user?.username ? `@${user.username}` : "@…";
  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : "…";

  return (
    <div className={styles.shell}>
      <header className={styles.topBar}>
        <div className={styles.topLeft}>
          <button className={styles.hamburgerButton} aria-label="Menu">
            <Menu size={20} />
          </button>
          <Link href="/" className={styles.brandLink}>
            <div className={styles.logoIcon}>
              <GitIcon />
            </div>
            <span className={styles.brandName}>Git-Gud</span>
          </Link>
          <div className={styles.breadcrumb}>
            <span className={styles.crumbMuted}>Workspace</span>
            <span className={styles.crumbSep}>/</span>
            <span className={styles.crumbCurrent}>Settings</span>
          </div>
        </div>

        <div className={styles.topCenter}>
          <div className={styles.searchWrapper}>
            <Search className={styles.searchIcon} size={15} />
            <input
              className={styles.searchInput}
              placeholder="Search settings or docs..."
              aria-label="Search settings or docs"
            />
          </div>
        </div>

        <div className={styles.topRight}>
          <button className={styles.iconButton} aria-label="Notifications">
            <Bell size={18} />
            <span className={styles.notifDot} />
          </button>
          <div className={styles.iconCircle} aria-label="Help">
            <HelpCircle size={17} />
          </div>
          <div className={styles.userCluster}>
            <div className={styles.userAvatar}>{initials}</div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{name}</span>
              <span className={styles.userHandle}>{handle}</span>
            </div>
          </div>
        </div>
      </header>

      <main className={styles.main}>{children}</main>
    </div>
  );
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <SettingsShell>{children}</SettingsShell>
    </AuthProvider>
  );
}