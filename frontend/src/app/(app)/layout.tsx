import React from "react";
import Navbar from "@/components/Navbar";
import { LayoutProvider } from "@/app/context/LayoutContext";
import { AuthProvider } from "@/app/context/AuthContext";
import SidePanel from "@/components/SidePanel";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LayoutProvider>
        <div
          style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}
        >
          <Navbar />

          <div style={{ display: "flex", flex: 1, position: "relative", minHeight: 0 }}>
            <SidePanel />

            <main style={{ flex: 1, backgroundColor: "#f8fafc", minWidth: 0, overflowY: "auto" }}>
              {children}
            </main>
          </div>
        </div>
      </LayoutProvider>
    </AuthProvider>
  );
}