"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar when route changes
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // Define routes that should NOT show the sidebar
  const hideSidebarRoutes = ["/login", "/signup"];
  // Check if current path should hide sidebar
  const shouldHideSidebar =
    hideSidebarRoutes.includes(pathname) || pathname.startsWith("/invite"); // Hide sidebar for all invite routes
  // Allow modal sidebar to close
  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  if (shouldHideSidebar) {
    // Return children directly for login, signup, etc.
    return <>{children}</>;
  }

  return (
    <main className="flex flex-col md:flex-row min-h-screen bg-mainBg text-gray-900 overflow-auto">
      <Sidebar
        className="hidden md:flex print:hidden"
        closeSidebar={undefined}
      />

      {/* OPTION 1: Mobile Header Bar - Recommended */}
      <div className="md:hidden print:hidden bg-blue-900 text-white px-4 py-3 flex items-center justify-between shadow-lg">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="flex items-center gap-2 text-white hover:bg-blue-800 p-2 rounded-md transition-colors"
          aria-label="Open navigation menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
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
        {/* Mobile Logo */}
        <div className="flex items-center">
          <h1 className="text-lg font-bold">
            <span className="text-white">Piece</span>
            <span className="text-blue-300">ify</span>
          </h1>
        </div>
        {/* Optional: User avatar or other actions */}
        <div className="w-8 h-8"></div> {/* Spacer for balance */}
      </div>

      {/* Mobile Sidebar Drawer - Hidden during print */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex md:hidden print:hidden">
          {/* Sidebar Container */}
          <div className="w-64 bg-blue-900 text-white overflow-y-auto relative">
            <Sidebar closeSidebar={closeSidebar} />
            <button
              onClick={closeSidebar}
              className="absolute top-4 right-4 text-white hover:text-blue-300 transition-colors z-10"
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

          <div
            className="flex-1"
            onClick={closeSidebar}
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
      <div className="flex-1 overflow-y-auto h-screen print:h-auto print:overflow-visible">
        {children}
      </div>
    </main>
  );
}
