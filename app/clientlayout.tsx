// components/ClientLayout.tsx
"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useLayout } from "@/src/context/LayoutContext";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { activePage } = useLayout();

  return (
    <main className="flex flex-col md:flex-row min-h-screen bg-mainBg text-gray-900 overflow-auto">
      {/* Desktop Sidebar */}
      <Sidebar className="hidden md:flex" />

      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 bg-blue-600 text-white p-2 rounded-md shadow-md"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Mobile Sidebar Drawer */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-50 flex">
          <div className="w-64 bg-blue-900 text-white p-4 overflow-y-auto">
            <Sidebar />
          </div>
          <div className="flex-1" onClick={() => setIsSidebarOpen(false)} />
        </div>
      )}

      {/* Main Page Content */}
      <div className="flex-1 overflow-y-auto h-screen">{children}</div>
    </main>
  );
}
