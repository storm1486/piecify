"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/src/context/UserContext";
import UploadMyFilesModal from "@/components/UploadMyFilesModal";
import MyFilesSection from "@/components/MyFilesSection";
import { useLayout } from "@/src/context/LayoutContext";
import SearchHeader from "@/components/SearchHeader";

export default function MyFiles() {
  const { user, loading, fetchMyFiles } = useUser();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState("current");
  const { setActivePage } = useLayout();

  useEffect(() => {
    setActivePage("myFiles"); // ✅ update current page
  }, []);

  useEffect(() => {
    if (user) {
      fetchMyFiles();
    }
  }, [user]);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    setSearching(true);

    if (!query.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    try {
      // Combine all user files for search
      const allUserFiles = [
        ...(user?.myFiles || []).map((file) => ({ ...file, type: "current" })),
        ...(user?.previousFiles || []).map((file) => ({
          ...file,
          type: "previous",
        })),
        ...(user?.requestedFiles || []).map((file) => ({
          ...file,
          type: "requested",
        })),
      ];

      const filteredFiles = allUserFiles.filter((file) =>
        file.fileName?.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filteredFiles);
    } catch (error) {
      console.error("Error searching files:", error);
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-mainBg">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your files...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen bg-mainBg text-gray-900">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Please Log In
            </h1>
            <p className="text-gray-500 mb-4">
              You need to be logged in to view your files.
            </p>
            <a
              href="/login"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Go to Login
            </a>
          </div>
        </div>
      </main>
    );
  }

  const totalFiles =
    (user?.myFiles?.length || 0) +
    (user?.previousFiles?.length || 0) +
    (user?.requestedFiles?.length || 0);

  return (
    <main className="flex min-h-screen bg-mainBg text-gray-900 overflow-hidden">
      <div className="flex-1 overflow-y-auto h-screen">
        {/* Header with Search Bar */}
        <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
          <SearchHeader />
        </header>

        {/* Content Area */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">My Pieces</h1>
            <p className="text-gray-500">
              Manage your personal pieces and performances • {totalFiles} total
              pieces
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6 border-b border-gray-200">
            <div className="flex space-x-8">
              <button
                onClick={() => setActiveTab("current")}
                className={`pb-4 px-1 font-medium text-sm ${
                  activeTab === "current"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Current Pieces ({user?.myFiles?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("requested")}
                className={`pb-4 px-1 font-medium text-sm ${
                  activeTab === "requested"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Requested Pieces ({user?.requestedFiles?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("previous")}
                className={`pb-4 px-1 font-medium text-sm ${
                  activeTab === "previous"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Previous Pieces ({user?.previousFiles?.length || 0})
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === "current" && (
            <div>
              {/* Quick Upload Area - Only show if no files */}
              {(!user?.myFiles || user.myFiles.length === 0) && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-white mb-8">
                  <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-8 w-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">
                    Upload your first piece
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Drag and drop files here or click to select
                  </p>
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md text-sm font-medium inline-flex items-center transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Select Files
                  </button>
                </div>
              )}

              {/* Current Files List */}
              <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Current Pieces
                  </h3>
                  <div className="flex space-x-2">
                    <button className="text-sm text-gray-500 hover:text-gray-700 flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"
                        />
                      </svg>
                      Sort
                    </button>
                  </div>
                </div>

                <MyFilesSection
                  myFiles={user?.myFiles || []}
                  previousFiles={[]}
                  requestedFiles={[]}
                />
              </div>
            </div>
          )}

          {activeTab === "requested" && (
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Requested Pieces
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Pieces you&apos;ve requested access to
                </p>
              </div>

              <MyFilesSection
                myFiles={[]}
                previousFiles={[]}
                requestedFiles={user?.requestedFiles || []}
              />
            </div>
          )}

          {activeTab === "previous" && (
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Previous Pieces
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Pieces you previously had access to
                </p>
              </div>

              <MyFilesSection
                myFiles={[]}
                previousFiles={user?.previousFiles || []}
                requestedFiles={[]}
              />
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <UploadMyFilesModal
          isOpen={isUploadModalOpen}
          closeModal={() => setIsUploadModalOpen(false)}
          onClose={() => setIsUploadModalOpen(false)}
          user={user}
          onUploadSuccess={fetchMyFiles}
        />
      )}
    </main>
  );
}
