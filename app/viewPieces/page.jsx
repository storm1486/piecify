"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase"; // Adjust path
import { useUser } from "@/src/context/UserContext"; // Assuming you have this context
import LoadingSpinner from "@/components/LoadingSpinner"; // Assuming you have this component

export default function ViewPiecesPage() {
  const [folders, setFolders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, loading } = useUser() || { user: null, loading: true };
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredFolders, setFilteredFolders] = useState([]);

  useEffect(() => {
    if (!loading && user) {
      fetchFolders();
    }
  }, [loading, user]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredFolders(folders);
    } else {
      const filtered = folders.filter((folder) =>
        folder.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredFolders(filtered);
    }
  }, [searchQuery, folders]);

  const fetchFolders = async () => {
    try {
      setIsLoading(true);
      const snapshot = await getDocs(collection(db, "folders"));

      // Get all folders first
      const folderData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        fileCount: 0, // Initialize fileCount
      }));

      // Now fetch file counts for each folder
      const foldersWithCounts = await Promise.all(
        folderData.map(async (folder) => {
          try {
            const filesSnapshot = await getDocs(
              collection(db, "folders", folder.id, "files")
            );
            return {
              ...folder,
              fileCount: filesSnapshot.size, // Set the actual file count
            };
          } catch (error) {
            console.error(
              `Error fetching files for folder ${folder.id}:`,
              error
            );
            return folder; // Return folder with default count if there's an error
          }
        })
      );

      setFolders(foldersWithCounts);
      setFilteredFolders(foldersWithCounts);
    } catch (error) {
      console.error("Error fetching folders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-gray-800">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="mb-6">Please log in to access this page.</p>
          <Link href="/">
            <button className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Go to Login
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen bg-mainBg text-gray-900">
      {/* Sidebar */}
      <aside className="w-72 bg-blue-900 text-white p-6 flex flex-col">
        {/* Logo */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-white">Piece</span>
            <span className="text-blue-300">ify</span>
          </h1>
          <p className="text-blue-200 text-sm mt-1">
            Your performances, organized.
          </p>
        </div>

        {/* User Profile */}
        <div className="mb-8 bg-blue-800 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
              {user.firstName && user.firstName[0]}
              {user.lastName && user.lastName[0]}
            </div>
            <div>
              <p className="font-medium">
                {user.firstName && user.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user.email}
              </p>
              <p className="text-xs text-blue-300">
                {user.role === "admin" ? "Administrator" : "User"}
              </p>
            </div>
          </div>
          <button
            onClick={user.handleLogout}
            className="mt-3 text-sm text-blue-300 hover:text-white transition-colors"
          >
            Log out
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1">
          <div className="mb-4">
            <h3 className="text-blue-300 uppercase text-xs font-semibold tracking-wider">
              Navigation
            </h3>
          </div>

          <ul className="space-y-2">
            <li>
              <Link
                href="/"
                className="flex items-center p-2 rounded-md text-blue-200 hover:bg-blue-800/50 hover:text-white transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                Dashboard
              </Link>
            </li>
            <li>
              <a className="flex items-center p-2 rounded-md bg-blue-800/50 font-medium">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
                View Pieces
              </a>
            </li>
            <li>
              <Link
                href="/myFiles"
                className="flex items-center p-2 rounded-md text-blue-200 hover:bg-blue-800/50 hover:text-white transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                  />
                </svg>
                My Pieces
              </Link>
            </li>
          </ul>
        </nav>

        {/* My Favorites Section */}
        <div className="mt-6">
          <h3 className="text-blue-300 uppercase text-xs font-semibold tracking-wider mb-4">
            My Favorites
          </h3>
          {user?.favoriteFiles?.length > 0 ? (
            <div className="space-y-2">
              {user.favoriteFiles.map((file) => (
                <Link
                  key={file.id}
                  href={`/viewFile/${file.id}`}
                  className="block"
                >
                  <div className="flex items-center p-2 rounded-md text-blue-200 hover:bg-blue-800/50 hover:text-white transition-colors">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span>{file.fileName || "Unnamed File"}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-blue-400">No favorites yet. Add some!</p>
          )}
        </div>

        {/* Other Links */}
        <div className="mt-6">
          <Link
            href="/team"
            className="flex items-center p-2 rounded-md text-blue-200 hover:bg-blue-800/50 hover:text-white transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            Current Team
          </Link>
        </div>

        {/* Help Section */}
        <div className="mt-8 pt-4 border-t border-blue-800">
          <button className="text-sm text-blue-300 hover:text-white transition-colors flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Help &amp; Support
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        {/* Header with Search Bar */}
        <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="relative w-full max-w-xl">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5 text-gray-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search for pieces, folders, and more..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-blue-900">
              Available Pieces
            </h1>
            <Link href="/">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-lg">
                Back to Home
              </button>
            </Link>
          </div>

          {/* Status info */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <p className="flex items-center text-blue-800">
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
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Browse available folders to view and request pieces. Pieces you've
              been assigned will appear in your "My Pieces" section.
            </p>
          </div>

          {filteredFolders.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFolders.map((folder) => (
                <Link
                  key={folder.id}
                  href={`/viewRequestFolder/${folder.id}`}
                  className="block"
                >
                  <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden hover:-translate-y-1 transition-transform duration-200">
                    <div
                      className={`h-2 ${folder.color || "bg-blue-500"}`}
                    ></div>
                    <div className="p-5">
                      <div className="flex justify-between">
                        <div className="flex items-center">
                          <div className="p-2 rounded-lg mr-3 bg-blue-100 text-blue-600">
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
                                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                              />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {folder.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              Created:{" "}
                              {folder.createdAt?.seconds
                                ? new Date(
                                    folder.createdAt.seconds * 1000
                                  ).toLocaleDateString()
                                : new Date(
                                    folder.createdAt
                                  ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex justify-between items-center">
                        <span className="text-sm text-gray-500">
                          {folder.fileCount || 0} Pieces
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white p-8 rounded-xl text-center shadow-sm">
              <p className="text-xl text-blue-800 mb-4">No folders found</p>
              <p className="text-gray-600 mb-6">
                Check back later for available pieces
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
