import React from "react";

export default function DashboardPage() {
  return (
    <div style={styles.dashboardContainer}>
      {/* Welcome Header */}
      <header style={styles.header}>
        <h1 style={styles.title}>Workspace Dashboard</h1>
        <p style={styles.subtitle}>
          Welcome back! Here is a summary of your version-controlled course
          notes.
        </p>
      </header>

      {/* Quick Overview Stats Row */}
      <section style={styles.statsRow}>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Active Courses</span>
          <span style={styles.statNumber}>4</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Total Notes</span>
          <span style={styles.statNumber}>32</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Recent Commits</span>
          <span style={styles.statNumber}>12</span>
        </div>
      </section>

      {/* Main Workspace Layout Grid */}
      <div style={styles.gridContainer}>
        {/* Main Feed / Left Column */}
        <section style={styles.mainFeed}>
          <div style={styles.contentCard}>
            <h2 style={styles.cardTitle}>Recent Activity</h2>
            <p style={styles.cardPlaceholder}>
              Your recently edited course notes and revision history will
              populate here.
            </p>
          </div>
        </section>

        {/* Action Sidebar / Right Column */}
        <aside style={styles.sidebar}>
          <div style={styles.contentCard}>
            <h2 style={styles.cardTitle}>Quick Actions</h2>
            <button style={styles.actionButton}>+ Create New Note</button>
            <button style={styles.actionButton}>🚀 Push to Repository</button>
          </div>
        </aside>
      </div>
    </div>
  );
}

// Temporary inline-styles for structure. Feel free to replace these with Tailwind classes or CSS Modules later!
const styles = {
  dashboardContainer: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "2rem",
  },
  header: {
    marginBottom: "0.5rem",
  },
  title: {
    fontSize: "2rem",
    fontWeight: "700",
    color: "#111827",
    margin: "0 0 0.5rem 0",
  },
  subtitle: {
    fontSize: "1rem",
    color: "#6B7280",
    margin: 0,
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "1.5rem",
  },
  statCard: {
    padding: "1.5rem",
    backgroundColor: "#F9FAFB",
    border: "1px solid #E5E7EB",
    borderRadius: "8px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.5rem",
  },
  statLabel: {
    fontSize: "0.875rem",
    color: "#6B7280",
    fontWeight: "500",
  },
  statNumber: {
    fontSize: "1.75rem",
    fontWeight: "700",
    color: "#111827",
  },
  gridContainer: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: "2rem",
    alignItems: "start",
  },
  mainFeed: {
    display: "flex",
    flexDirection: "column" as const,
  },
  sidebar: {
    display: "flex",
    flexDirection: "column" as const,
  },
  contentCard: {
    padding: "1.5rem",
    backgroundColor: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: "8px",
    minHeight: "200px",
  },
  cardTitle: {
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "#111827",
    margin: "0 0 1rem 0",
  },
  cardPlaceholder: {
    color: "#9CA3AF",
    fontSize: "0.95rem",
    lineHeight: "1.5",
  },
  actionButton: {
    width: "100%",
    padding: "0.75rem 1rem",
    marginBottom: "0.75rem",
    backgroundColor: "#000000",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "6px",
    fontWeight: "600",
    cursor: "pointer",
    textAlign: "center" as const,
  },
};
