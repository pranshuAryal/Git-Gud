import React from "react";
import Navbar from "@/components/Navbar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="workspace-container">
      {/* NavBar */}
      <Navbar />
      
      {/* Page Section */}
      <main className="workspace-content">
        {children}
      </main>
    </div>
  );
}