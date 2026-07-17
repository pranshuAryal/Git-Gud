"use client";

import Link from "next/link";
import styles from "./CSS/navbar.module.css";
import { useState } from "react";
import OverlayCard from "@/components/OverlayCard";
import { usePathname } from "next/navigation";
import { useLayout } from "@/app/context/LayoutContext";

export default function Navbar() {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const pathname = usePathname();
  const { toggleSidebar } = useLayout();

  const isDashboard = pathname === "/dashboard" || pathname === "/";
  const handleLogoutConfirm = async () => {
    try {
      console.log("reached here");
      const response = await fetch("http://localhost:4000/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (response.ok) {
        localStorage.removeItem("user");
        window.location.href = "/auth";
      } else {
        setShowLogoutModal(false);
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <>
      <header className={styles.navbar}>
        <div className={styles.leftContainer}>
          {/* Hamburger Menu Icon — Automatically hidden on the main dashboard */}
          {!isDashboard && (
            <button
              onClick={toggleSidebar}
              className={styles.hamburgerButton}
              aria-label="Toggle Side Panel"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="3" y1="12" x2="21" y2="12" strokeLinecap="round" />
                <line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round" />
                <line x1="3" y1="18" x2="21" y2="18" strokeLinecap="round" />
              </svg>
            </button>
          )}
          {/* Left Side: Brand Logo & Name */}
          <Link href="/" className={styles.brandLink}>
            <div className={styles.logoIcon}>
              <svg
                width="18"
                height="18"
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
            </div>
            <span className={styles.brandName}>Git-Gud</span>
          </Link>
        </div>
        {/* Right Side: Logout Button */}
        <button
          onClick={() => setShowLogoutModal(true)}
          className={styles.logoutButton}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>Logout</span>
        </button>
      </header>

      {/* Conditionally render the modal card with custom text strings */}
      {showLogoutModal && (
        <OverlayCard
          message="Are you sure you want to log out?"
          confirmLabel="Log Out"
          onConfirm={handleLogoutConfirm}
          onClose={() => setShowLogoutModal(false)}
        />
      )}
    </>
  );
}
