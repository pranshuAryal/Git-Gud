"use client";

import React, { useState } from "react";
import styles from "./auth.module.css";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  const handleToggleTab = (tab: "login" | "register") => {
    setError(null);
    setActiveTab(tab);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const baseUrl = "http://localhost:4000/auth";
    const endpoint =
      activeTab === "login" ? `${baseUrl}/login` : `${baseUrl}/signup`;

    const payload =
      activeTab === "login"
        ? { identifier: email, password }
        : { email, password, username };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = Array.isArray(data.message)
          ? data.message[0]
          : data.message || "An error occurred. Please try again.";
        throw new Error(errorMessage);
      }

      router.push("/");
    } catch (err: any) {
      setError(err.message || "Connection to authentication server failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Left Column: Features & Branding */}
      <div className={styles.leftPanel}>
        <div className={styles.brandHeader}>
          <div className={styles.logoIcon}>
            {/* Simple Inline SVG representing version control nodes */}
            <svg
              width="28"
              height="28"
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
        </div>

        <p className={styles.tagline}>
          Version-controlled knowledge for university coursework
        </p>

        <div className={styles.featuresList}>
          <div className={styles.featureRow}>
            <div className={styles.featureIcon}>
              <svg
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
            </div>
            <div>
              <h4 className={styles.featureTitle}>Fork and improve</h4>
              <p className={styles.featureDesc}>
                Collaboratively update course notes
              </p>
            </div>
          </div>

          <div className={styles.featureRow}>
            <div className={styles.featureIcon}>
              <svg
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <div>
              <h4 className={styles.featureTitle}>Submit requests</h4>
              <p className={styles.featureDesc}>
                Contribute changes via merge requests
              </p>
            </div>
          </div>

          <div className={styles.featureRow}>
            <div className={styles.featureIcon}>
              <svg
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h4 className={styles.featureTitle}>Version history</h4>
              <p className={styles.featureDesc}>
                Complete audit trail of all changes
              </p>
            </div>
          </div>

          <div className={styles.featureRow}>
            <div className={styles.featureIcon}>
              <svg
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <div>
              <h4 className={styles.featureTitle}>Section discussions</h4>
              <p className={styles.featureDesc}>
                Contextual feedback on specific content
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Interaction Cards */}
      <div className={styles.rightPanel}>
        <div className={styles.formCard}>
          {/* Tab Selection */}
          <div className={styles.tabContainer}>
            <button
              type="button"
              className={`${styles.tabButton} ${activeTab === "login" ? styles.activeTab : ""}`}
              onClick={() => handleToggleTab("login")}
            >
              Login
            </button>
            <button
              type="button"
              className={`${styles.tabButton} ${activeTab === "register" ? styles.activeTab : ""}`}
              onClick={() => handleToggleTab("register")}
            >
              Register
            </button>
          </div>

          <h2 className={styles.welcomeTitle}>
            {activeTab === "login" ? "Welcome back" : "Get Started"}
          </h2>
          <p className={styles.welcomeSubtitle}>
            {activeTab === "login"
              ? "Log in to your account to continue"
              : "Create an account to start sharing notes"}
          </p>

          {error && <div className={styles.errorBanner}>{error}</div>}

          <form className={styles.form} onSubmit={handleSubmit}>
            {/* Input elements conditional on Active Tab state */}
            {activeTab === "register" && (
              <div className={styles.inputGroup}>
                <label className={styles.label}>Username</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. alex_rivera"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            )}

            <div className={styles.inputGroup}>
              <label className={styles.label}>Email Address</label>
              <input
                type="email"
                className={styles.input}
                placeholder="alex.rivera@edu.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Password</label>
              <input
                type="password"
                className={styles.input}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

          

            <div className={styles.forgotPassword}></div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading
                ? "Processing..."
                : activeTab === "login"
                  ? "Sign In"
                  : "Sign Up"}
            </button>
          </form>

          <p className={styles.toggleText}>
            {activeTab === "login"
              ? "Don't have an account?"
              : "Already have an account?"}
            <button
              type="button"
              className={styles.toggleLink}
              onClick={() =>
                handleToggleTab(activeTab === "login" ? "register" : "login")
              }
            >
              {activeTab === "login" ? "Create Account" : "Sign In"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
