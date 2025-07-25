"use client";

import { useState, useEffect } from "react";
import { db } from "../firebase/firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";
import Link from "next/link";
import { useUser } from "@/src/context/UserContext";
import { useLayout } from "@/src/context/LayoutContext";
import SearchHeader from "@/components/SearchHeader";

export default function AllFolders() {
  const { user, loading, toggleFavorite, isPrivileged } = useUser();
  const isPrivilegedUser = isPrivileged();
  const [folders, setFolders] = useState([]);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isAscending, setIsAscending] = useState(true);
  const [selectedColor, setSelectedColor] = useState("bg-blue-500");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const { setActivePage } = useLayout();

  useEffect(() => {
    setActivePage("folders"); // ✅ update current page
  }, []);

  useEffect(() => {
    if (isPrivilegedUser) {
      fetchAllFolders();
    }
  }, [user]);

  const fetchAllFolders = async () => {
    try {
      const foldersSnapshot = await getDocs(collection(db, "folders"));
      const foldersData = foldersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setFolders(foldersData);
    } catch (error) {
      console.error("Error fetching folders:", error);
    }
  };

  const handleSortByName = () => {
    const sortedFolders = [...folders].sort((a, b) => {
      if (isAscending) {
        return a.name.localeCompare(b.name);
      } else {
        return b.name.localeCompare(a.name);
      }
    });
    setFolders(sortedFolders);
    setIsAscending(!isAscending);
  };

  const handleCreateNewFolder = async () => {
    if (!newFolderName.trim()) {
      alert("Folder name cannot be empty.");
      return;
    }

    try {
      const docRef = await addDoc(collection(db, "folders"), {
        name: newFolderName,
        createdAt: new Date().toISOString(),
        color: selectedColor,
      });

      const newFolder = {
        id: docRef.id,
        name: newFolderName,
        createdAt: new Date().toISOString(),
        color: selectedColor,
      };

      setFolders([...folders, newFolder]);
      setIsFolderModalOpen(false);
      setNewFolderName("");
      setSelectedColor("bg-blue-500");
    } catch (error) {
      console.error("Error creating new folder:", error);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const filteredFolders = folders.filter((folder) =>
      folder.name.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(filteredFolders);
  };

  const foldersToDisplay = [...(searchQuery ? searchResults : folders)].sort(
    (a, b) =>
      isAscending ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
  );

  if (loading) {
    return <p>Loading...</p>;
  }

  // Redirect non-admin users
  if (user && !isPrivilegedUser) {
    return (
      <main className="flex min-h-screen bg-mainBg text-gray-900">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Access Denied
            </h1>
            <p className="text-gray-500">
              You need admin privileges to view all folders.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-mainBg text-gray-900 overflow-hidden">
      <div className="flex-1 overflow-y-auto h-screen">
        {/* Header with Search Bar */}
        <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
          <SearchHeader />
        </header>

        {/* Content Area */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                All Folders
              </h1>
              <p className="text-gray-500">
                Manage and organize all folders in the system
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleSortByName}
                className="text-sm text-gray-500 flex items-center"
              >
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
                Sort {isAscending ? "A-Z ↑" : "Z-A ↓"}
              </button>
            </div>
          </div>

          {/* Folders Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {foldersToDisplay.map((folder) => (
              <Link
                key={folder.id}
                href={`/folders/${folder.id}`}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden hover:-translate-y-1 transition-transform duration-200">
                  <div className={`h-2 ${folder.color || "bg-blue-500"}`}></div>
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
                              : new Date(folder.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          toggleFavorite(folder.id);
                        }}
                        className={`text-gray-400 hover:${
                          user?.favoriteFolders?.includes(folder.id)
                            ? "text-red-500"
                            : "text-gray-500"
                        }`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill={
                            user?.favoriteFolders?.includes(folder.id)
                              ? "currentColor"
                              : "none"
                          }
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            ))}

            {/* Create new folder card */}
            <div
              onClick={() => setIsFolderModalOpen(true)}
              className="border-2 border-dashed border-gray-300 rounded-lg p-2 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
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
              </div>
              <h3 className="font-medium text-gray-900 mb-1">
                Create New Folder
              </h3>
            </div>
          </div>

          {/* Empty state */}
          {foldersToDisplay.length === 0 && (
            <div className="text-center py-12">
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
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                {searchQuery
                  ? "No folders match your search"
                  : "No folders yet"}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery
                  ? "Try adjusting your search terms"
                  : "Get started by creating your first folder"}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setIsFolderModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Create New Folder
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Folder Modal */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Create New Folder
              </h2>
              <button
                onClick={() => setIsFolderModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
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

            <div className="mb-4">
              <label
                htmlFor="folderName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Folder Name
              </label>
              <input
                id="folderName"
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter folder name"
                autoFocus
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Folder Color (Optional)
              </label>
              <div className="flex space-x-2">
                {[
                  "bg-blue-500",
                  "bg-green-500",
                  "bg-amber-500",
                  "bg-red-500",
                  "bg-purple-500",
                ].map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-full ${color} border-2 ${
                      selectedColor === color
                        ? "border-black"
                        : "border-transparent"
                    }`}
                    type="button"
                  ></button>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsFolderModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewFolder}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={!newFolderName.trim()}
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
