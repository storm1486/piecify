"use client";
import { useState, useEffect } from "react";
import { db } from "./firebase/firebase"; // Adjust the path as necessary
import { collection, addDoc, getDocs } from "firebase/firestore";
import Link from "next/link";
import { useUser } from "@/src/context/UserContext";
import UploadMyFilesModal from "@/components/UploadMyFilesModal";
import MyFilesGroupedSection from "@/components/MyFilesGroupedSection"; // at the top
import Sidebar from "@/components/Sidebar";

export default function Home() {
  const { user, loading, toggleFavorite, fetchMyFiles } = useUser();

  const [folders, setFolders] = useState([]);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isAscending, setIsAscending] = useState(true); // State for sorting direction
  const [activeTab, setActiveTab] = useState(null); // Default tab is "All Files"
  const allFolders = user?.allFolders || [];
  const [searchQuery, setSearchQuery] = useState(""); // For search input
  const [searchResults, setSearchResults] = useState([]); // For storing search results
  const [searching, setSearching] = useState(false); // Loading state for search
  const [userFiles, setUserFiles] = useState([]); // To store the user's files (for non-admins)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState("bg-blue-500");

  useEffect(() => {
    if (user) {
      fetchMyFiles();
    }
  }, [user]);

  useEffect(() => {
    if (!activeTab && user) {
      setActiveTab(user.role === "admin" ? "all" : "my");
    }
  }, [user, activeTab]);

  if (loading) {
    return <p>Loading...</p>; // Show a loading state while fetching user data
  }

  const handleSortByName = () => {
    const sortedFolders = [...folders].sort((a, b) => {
      if (isAscending) {
        return a.name.localeCompare(b.name);
      } else {
        return b.name.localeCompare(a.name);
      }
    });
    setFolders(sortedFolders);
    setIsAscending(!isAscending); // Toggle the sorting order
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
      setFolders([
        ...folders,
        {
          id: docRef.id,
          name: newFolderName,
          createdAt: new Date().toISOString(),
          color: selectedColor,
        },
      ]);
      setIsFolderModalOpen(false);
      setNewFolderName(""); // Reset folder name input
    } catch (error) {
      console.error("Error creating new folder:", error);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    setSearching(true);

    if (!query.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    try {
      if (user?.role === "admin") {
        // Admin: Search all files in the `folders` collection
        const foldersSnapshot = await getDocs(collection(db, "folders"));
        const allFiles = [];

        for (const folderDoc of foldersSnapshot.docs) {
          const folderId = folderDoc.id;
          const filesSnapshot = await getDocs(
            collection(db, "folders", folderId, "files")
          );

          filesSnapshot.forEach((fileDoc) => {
            allFiles.push({
              ...fileDoc.data(),
              id: fileDoc.id,
              folderId,
              folderName: folderDoc.data().name,
            });
          });
        }

        // Filter files based on the query
        const filteredFiles = allFiles.filter((file) =>
          file.fileName.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(filteredFiles);
      } else {
        // Regular User: Search only in their `myFiles` array
        const filteredFiles = userFiles.filter((file) =>
          file.fileName.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(filteredFiles);
      }
    } catch (error) {
      console.error("Error searching files:", error);
    } finally {
      setSearching(false);
    }
  };

  return (
    <main className="flex min-h-screen bg-mainBg text-gray-900 overflow-hidden">
      {/* Sidebar */}
      <Sidebar activePage="dashboard" />
      {/* Main Content Area */}
      {user && (
        <div className="flex-1 overflow-y-auto h-screen">
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
                  onChange={(e) => handleSearch(e.target.value)}
                />

                {/* Search Results Dropdown */}
                {searchQuery && (
                  <div className="absolute top-full left-0 w-full bg-white border border-gray-300 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto z-50">
                    {searching ? (
                      <p className="p-4 text-gray-500">Searching...</p>
                    ) : searchResults.length > 0 ? (
                      <ul className="divide-y divide-gray-200">
                        {searchResults.map((file, index) => (
                          <li
                            key={index}
                            className="p-3 hover:bg-gray-100 cursor-pointer"
                          >
                            {user.role === "admin" ? (
                              <Link
                                href={`/viewDocuments/${file.folderId}/${file.id}`}
                                className="block"
                              >
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg mr-3">
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
                                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                        />
                                      </svg>
                                    </div>
                                    <span className="font-medium">
                                      {file.fileName}
                                    </span>
                                  </div>
                                  <span className="text-sm text-gray-500">
                                    {file.folderName || "Unnamed Folder"}
                                  </span>
                                </div>
                              </Link>
                            ) : (
                              <Link
                                href={`/viewFile/${file.fileId}`}
                                className="block"
                              >
                                <div className="flex justify-between">
                                  <span className="font-medium">
                                    {file.fileName}
                                  </span>
                                </div>
                              </Link>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="p-4 text-gray-500">
                        No files match your search.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center ml-4 space-x-4">
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center transition-colors"
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
                  Upload New Piece
                </button>
              </div>
            </div>
          </header>

          {/* Content Area */}
          <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Tab Navigation */}
            <div className="mb-6 border-b border-gray-200">
              <div className="flex space-x-8">
                {user?.role === "admin" && (
                  <button
                    onClick={() => setActiveTab("all")}
                    className={`pb-4 px-1 font-medium text-sm ${
                      activeTab === "all"
                        ? "text-blue-600 border-b-2 border-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    All Files
                  </button>
                )}
                <button
                  onClick={() => setActiveTab("my")}
                  className={`pb-4 px-1 font-medium text-sm ${
                    activeTab === "my"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  My Pieces
                </button>
                <button
                  onClick={() => setActiveTab("team")}
                  className={`pb-4 px-1 font-medium text-sm ${
                    activeTab === "team"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Team Files
                </button>

                <button
                  onClick={() => setActiveTab("favorites")}
                  className={`pb-4 px-1 font-medium text-sm ${
                    activeTab === "favorites"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Favorites
                </button>
              </div>
            </div>

            {/* All Files Tab Content */}
            {activeTab === "all" && user?.role === "admin" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    All Folders
                  </h2>
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
                      Sort {isAscending ? "Z-A" : "A-Z"}
                    </button>
                  </div>
                </div>

                {/* Folders Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allFolders.map((folder) => (
                    <Link
                      key={folder.id}
                      href={`/folders/${folder.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      <div
                        key={folder.id}
                        className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden hover:-translate-y-1 transition-transform duration-200"
                      >
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
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                toggleFavorite(folder.id);
                              }}
                              className={`text-gray-400 hover:${
                                user.favoriteFolders.includes(folder.id)
                                  ? "text-red-500"
                                  : "text-gray-500"
                              }`}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                fill={
                                  user.favoriteFolders.includes(folder.id)
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
              </div>
            )}

            {/* My Pieces Tab Content */}
            {activeTab === "my" && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    My Pieces
                  </h2>
                  <p className="text-gray-500">
                    Manage your personal pieces and performances
                  </p>
                </div>

                {/* Upload area */}
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
                    Drag and drop pieces to upload
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">or</p>
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

                {/* Files list */}
                <div className="bg-white shadow-sm rounded-lg overflow-hidden ">
                  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between ">
                    <h3 className="text-2xl font-medium text-gray-900">
                      Your Pieces
                    </h3>
                    <div className="flex space-x-2">
                      <button className="text-sm text-gray-500 flex items-center">
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
                      <button className="text-sm text-gray-500 flex items-center">
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
                            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                          />
                        </svg>
                        Filter
                      </button>
                    </div>
                  </div>

                  {/* Your MyFilesSection component */}

                  <MyFilesGroupedSection
                    myFiles={user?.myFiles || []}
                    previousFiles={user?.previousFiles || []}
                    requestedFiles={user?.requestedFiles || []}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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

            {/* Optional: Add folder category or color */}
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
