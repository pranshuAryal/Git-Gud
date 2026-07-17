"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./CSS/sidePanel.module.css";
import { useLayout } from "@/app/context/LayoutContext";

export default function SidePanel() {
  const pathname = usePathname();
  const { isSidebarOpen } = useLayout();

  const isDashboard = pathname === "/dashboard" || pathname === "/";

  // Build structural classes based on route location and sidebar drawer state
  const sidebarClassName = `
    ${styles.sidebar} 
    ${isDashboard ? styles.dashboardDocked : styles.repositoryDrawer} 
    ${(!isDashboard && isSidebarOpen) ? styles.drawerOpen : ""}
  `.trim();

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: "M4 4h6v8H4zm10 0h6v5h-6zm0 9h6v7h-6zm-10 4h6v3H4z" },
    { label: "Discover", href: "/discover", icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z", stroke: true },
    { label: "Merge Requests", href: "/merges", icon: "M18 16a3 3 0 100-6 3 3 0 000 6zm-12 0a3 3 0 100-6 3 3 0 000 6zm6-8a3 3 0 110-6 3 3 0 010 6z" },
  ];

  const repoItems = [
    { label: "My Repositories", icon: "M20 7H4M20 12H4M20 17H4" },
    { label: "My Forks", icon: "M8 12a4 4 0 108 0 4 4 0 00-8 0z" },
    { label: "Starred", icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" },
  ];

  return (
    <aside className={sidebarClassName}>
      <div className={styles.scrollContainer}>
        {/* Main Section */}
        <nav className={styles.section}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.label} 
                href={item.href} 
                className={`${styles.navLink} ${isActive ? styles.activeLink : ""}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill={item.stroke ? "none" : "currentColor"} stroke="currentColor" strokeWidth="2">
                  <path d={item.icon} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Your Repos Section */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>YOUR REPOS</h4>
          {repoItems.map((item) => (
            <button key={item.label} className={styles.navLink}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={item.icon} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Account Section */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>ACCOUNT</h4>
          <button className={styles.navLink}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            <span>Profile</span>
          </button>
        </div>
      </div>

      {/* User Footer Profile Card */}
      <div className={styles.userFooter}>
        <div className={styles.avatar}>RK</div>
        <div className={styles.userInfo}>
          <div className={styles.userName}>Raj Kumar</div>
          <div className={styles.userMeta}>Sem 4 • PU</div>
        </div>
      </div>
    </aside>
  );
}