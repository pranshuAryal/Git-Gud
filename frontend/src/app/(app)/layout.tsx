import React from "react";
import Navbar from "@/components/Navbar";
import { LayoutProvider } from "@/app/context/LayoutContext";
import SidePanel from "@/components/SidePanel";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <LayoutProvider>
      <div
        style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
      >
        {/* Navbar sits flatly along the top */}
        <Navbar />

        {/* Layout Wrapper Area */}
        <div style={{ display: "flex", flex: 1, position: "relative" }}>
          <SidePanel />

          {/* Dashboard contents fill remaining browser frame space */}
          <main style={{ flex: 1, backgroundColor: "#f8fafc", minWidth: 0 }}>
            {children}
          </main>
        </div>
      </div>
    </LayoutProvider>
  );
}
