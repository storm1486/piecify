"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useOrganization } from "@/src/context/OrganizationContext";
import Sidebar from "@/components/Sidebar";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { loading: orgLoading } = useOrganization(); // 👈 gate state from provider

  // Close sidebar when route changes
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // Routes without sidebar (hide for the page and any subpaths)
  const noSidebarPrefixes = ["/login", "/signup", "/reset-password", "/invite"];
  const shouldHideSidebar = noSidebarPrefixes.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  // ⛔ Gate rendering while org is loading
  if (!shouldHideSidebar && orgLoading) {
    return (
      <main className="min-h-screen grid place-items-center bg-mainBg text-gray-600">
        <div className="text-sm">Loading your organization…</div>
      </main>
    );
  }

  if (shouldHideSidebar) {
    return <>{children}</>;
  }

  return (
    <main className="flex flex-col md:flex-row min-h-screen bg-mainBg text-gray-900 overflow-auto">
      <Sidebar
        className="hidden md:flex print:hidden"
        closeSidebar={undefined}
      />

      {/* Mobile Header Bar */}
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
        <div className="flex items-center">
          <h1 className="text-lg font-bold">
            <span className="text-white">Piece</span>
            <span className="text-blue-300">ify</span>
          </h1>
        </div>
        <div className="w-8 h-8"></div>
      </div>

      {/* Mobile Sidebar Drawer */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex md:hidden print:hidden">
          <div className="w-64 bg-blue-900 text-white overflow-y-auto relative">
            <Sidebar closeSidebar={() => setIsSidebarOpen(false)} />
            <button
              onClick={() => setIsSidebarOpen(false)}
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
            onClick={() => setIsSidebarOpen(false)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Escape" && setIsSidebarOpen(false)}
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
