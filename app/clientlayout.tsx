// components/ClientLayout.tsx
"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useLayout } from "@/src/context/LayoutContext";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { activePage } = useLayout();
  const pathname = usePathname();

  // Close sidebar when route changes
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // Close sidebar when clicking outside
  const handleBackdropClick = () => {
    setIsSidebarOpen(false);
  };

  // Close sidebar function to pass to Sidebar component
  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <main className="flex flex-col md:flex-row min-h-screen bg-mainBg text-gray-900 overflow-auto">
      {/* Desktop Sidebar */}
      <Sidebar className="hidden md:flex" closeSidebar={null} />

      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 bg-blue-600 text-white p-2 rounded-md shadow-md"
        aria-label="Open navigation menu"
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
        <div className="fixed inset-0 z-40 bg-black bg-opacity-50 flex md:hidden">
          {/* Sidebar Container */}
          <div className="w-64 bg-blue-900 text-white overflow-y-auto">
            <Sidebar closeSidebar={closeSidebar} />

            {/* Close button inside sidebar */}
            <button
              onClick={closeSidebar}
              className="absolute top-4 right-4 text-white hover:text-blue-300 transition-colors"
              aria-label="Close navigation menu"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Backdrop - clicking closes sidebar */}
          <div
            className="flex-1"
            onClick={handleBackdropClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                closeSidebar();
              }
            }}
            aria-label="Close navigation menu"
          />
        </div>
      )}

      {/* Main Page Content */}
      <div className="flex-1 overflow-y-auto h-screen">{children}</div>
    </main>
  );
}
